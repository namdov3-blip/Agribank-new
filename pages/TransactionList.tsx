
import React, { useState, useMemo } from 'react';
import { Transaction, Project, TransactionStatus, User } from '../types';
import { GlassCard } from '../components/GlassCard';
import { StatusBadge } from '../components/StatusBadge';
import { PrintPhieuChi } from '../components/PrintPhieuChi';
import { PrintPhieuChiBatch } from '../components/PrintPhieuChiBatch';
import { formatCurrency, formatDate, calculateInterest, exportTransactionsToExcel } from '../utils/helpers';
import { Search, Filter, Download, Folder, Users, CheckCircle, Clock, DollarSign, PiggyBank, ChevronLeft, ChevronRight, Eye, FileText, Printer, Trash2 } from 'lucide-react';
import api from '../services/api';

interface TransactionListProps {
  transactions: Transaction[];
  projects: Project[];
  interestRate: number;
  currentUser: User;
  onSelect: (t: Transaction) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onDelete?: () => void; // Callback to refresh data after deletion
}

export const TransactionList: React.FC<TransactionListProps> = ({ transactions, projects, interestRate, currentUser, onSelect, searchTerm, setSearchTerm, onDelete }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [printTransaction, setPrintTransaction] = useState<Transaction | null>(null);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [showBatchPrint, setShowBatchPrint] = useState(false);
  const [startDate, setStartDate] = useState(''); // ISO yyyy-mm-dd
  const [endDate, setEndDate] = useState(''); // ISO yyyy-mm-dd
  const formattedStart = startDate ? formatDate(startDate) : '---';
  const formattedEnd = endDate ? formatDate(endDate) : '---';

  const resolveProject = React.useCallback((t: Transaction) => {
    const pIdStr = (t.projectId && (t.projectId as any)._id) ? (t.projectId as any)._id.toString() : t.projectId?.toString();
    return projects.find(p => (p.id === pIdStr || (p as any)._id === pIdStr));
  }, [projects]);

  const getRelevantDate = React.useCallback((t: Transaction, projectParam?: Project) => {
    const project = projectParam || resolveProject(t);
    const baseDate = t.effectiveInterestDate || project?.interestStartDate || (project as any)?.startDate;
    if (t.status === TransactionStatus.DISBURSED && t.disbursementDate) {
      return t.disbursementDate;
    }
    return baseDate;
  }, [resolveProject]);

  const isWithinDateRange = React.useCallback((dateStr?: string) => {
    if (!startDate && !endDate) return true;
    if (!dateStr) return false;
    const value = new Date(dateStr);
    if (isNaN(value.getTime())) return false;
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (start && value < start) return false;
    if (end) {
      const endOfDay = new Date(end);
      endOfDay.setHours(23, 59, 59, 999);
      if (value > endOfDay) return false;
    }
    return true;
  }, [startDate, endDate]);

  // Filter Data
  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return transactions.filter(t => {
      const project = resolveProject(t);
      const relevantDate = getRelevantDate(t, project);
      if (!isWithinDateRange(relevantDate)) return false;

      // Determine which date is being displayed to allow searching by it
      const displayDateStr = relevantDate ? formatDate(relevantDate) : '';

      return (
        t.status.toLowerCase().includes(term) || // Search by Status
        t.household.name.toLowerCase().includes(term) || // Search by Name
        t.household.cccd.includes(searchTerm) ||
        t.household.decisionNumber.toLowerCase().includes(term) || // Search by Decision Number
        t.id.toLowerCase().includes(term) || // Search by Transaction ID
        displayDateStr.includes(searchTerm) || // Search by Displayed Date (Expected or Actual)
        (t.paymentType && t.paymentType.toLowerCase().includes(term)) || // Search by Payment Type
        (typeof t.projectId === 'string' && t.projectId.toLowerCase().includes(term)) ||
        project?.code.toLowerCase().includes(term)
      );
    });
  }, [transactions, searchTerm, resolveProject, getRelevantDate, isWithinDateRange]);

  // Statistics Calculations based on Filtered Data
  const stats = useMemo(() => {
    const uniqueProjects = new Set(filtered.map(t => (t.projectId && (t.projectId as any)._id) ? (t.projectId as any)._id.toString() : t.projectId?.toString())).size;
    const disbursedItems = filtered.filter(t => t.status === TransactionStatus.DISBURSED);
    const notDisbursedItems = filtered.filter(t => t.status !== TransactionStatus.DISBURSED);

    // UPDATE: Disbursed Money includes interest paid + supplementary amount
    const moneyDisbursed = disbursedItems.reduce((sum, t) => {
      const pIdStr = (t.projectId && (t.projectId as any)._id) ? (t.projectId as any)._id.toString() : t.projectId?.toString();
      const project = projects.find(p => (p.id === pIdStr || p._id === pIdStr));
      const baseDate = t.effectiveInterestDate || project?.interestStartDate || (project as any)?.startDate;
      let interest = 0;
      if (t.disbursementDate) {
        interest = calculateInterest(t.compensation.totalApproved, interestRate, baseDate, new Date(t.disbursementDate));
      }
      const supplementary = t.supplementaryAmount || 0;
      return sum + t.compensation.totalApproved + interest + supplementary;
    }, 0);

    // UPDATE: Pending Money includes accrued interest for HOLD items + supplementary amount
    const moneyNotDisbursed = notDisbursedItems.reduce((sum, t) => {
      const pIdStr = (t.projectId && (t.projectId as any)._id) ? (t.projectId as any)._id.toString() : t.projectId?.toString();
      const project = projects.find(p => (p.id === pIdStr || p._id === pIdStr));
      let interest = 0;
      // TẤT CẢ hồ sơ chưa giải ngân (PENDING + HOLD) đều phải được tính lãi nếu baseDate < hôm nay
      if (t.status !== TransactionStatus.DISBURSED) {
        const baseDate = t.effectiveInterestDate || project?.interestStartDate || (project as any)?.startDate;
        interest = calculateInterest(t.compensation.totalApproved, interestRate, baseDate, new Date());
      }
      const supplementary = t.supplementaryAmount || 0;
      return sum + t.compensation.totalApproved + interest + supplementary;
    }, 0);

    // Calculate Interest logic for Stats - Link với tab Tổng quan / tab Số dư
    // CHỈ tính lãi từ các giao dịch CHƯA giải ngân (PENDING + HOLD) - Lãi tạm tính
    // Khi giải ngân, lãi của giao dịch đó sẽ được chuyển sang "đã chốt" và không còn trong tổng này
    let tempInterest = 0; // Lãi tạm tính (chưa giải ngân)
    let lockedInterest = 0; // Lãi đã chốt (đã giải ngân)

    filtered.forEach(t => {
      const pIdStr = (t.projectId && (t.projectId as any)._id) ? (t.projectId as any)._id.toString() : t.projectId?.toString();
      const project = projects.find(p => (p.id === pIdStr || p._id === pIdStr));
      const baseDate = t.effectiveInterestDate || project?.interestStartDate || (project as any)?.startDate;

      if (t.status === TransactionStatus.DISBURSED && t.disbursementDate) {
        // Lãi đã chốt (không tính vào tổng lãi PS)
        lockedInterest += calculateInterest(t.compensation.totalApproved, interestRate, baseDate, new Date(t.disbursementDate));
      } else if (t.status !== TransactionStatus.DISBURSED) {
        // Lãi tạm tính (chỉ từ các giao dịch chưa giải ngân)
        tempInterest += calculateInterest(t.compensation.totalApproved, interestRate, baseDate, new Date());
      }
    });

    const totalInterest = tempInterest; // Chỉ trả về lãi tạm tính

    return {
      uniqueProjects,
      disbursedCount: disbursedItems.length,
      notDisbursedCount: notDisbursedItems.length,
      moneyDisbursed,
      moneyNotDisbursed,
      accruedInterest: totalInterest,
      lockedInterest: lockedInterest // Lãi đã chốt (để hiển thị)
    };
  }, [filtered, interestRate, projects]);

  // Pagination Logic
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleDownload = () => {
    // Export ALL transactions as requested, not just filtered ones
    exportTransactionsToExcel(transactions, projects, interestRate);
  };

  const StatBox = ({ label, value, subValue, icon: Icon, colorClass }: any) => (
    <GlassCard className="p-4 flex flex-col justify-between border-slate-200 min-h-[100px] shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{label}</span>
        <Icon size={16} className={colorClass} strokeWidth={2.5} />
      </div>
      <div className="flex flex-col">
        <span className="text-lg font-bold text-slate-900 block">{value}</span>
        <span className="text-[10px] font-medium text-slate-500 min-h-[14px]">{subValue || '\u00A0'}</span>
      </div>
    </GlassCard>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex justify-between items-end pb-2">
        <div>
          <h2 className="text-2xl font-medium text-black tracking-tight">Danh sách giao dịch</h2>
          <p className="text-sm font-medium text-slate-500 mt-1">Quản lý chi tiết từng hộ dân</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            className="p-2 bg-white/60 hover:bg-white border border-slate-200 rounded-lg text-slate-600 transition-all shadow-sm group"
            title="Tải xuống Excel"
          >
            <Download size={18} className="group-hover:text-blue-600" />
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatBox
          label="Tổng dự án"
          value={stats.uniqueProjects}
          subValue="Trong bộ lọc"
          icon={Folder}
          colorClass="text-blue-600"
        />
        <StatBox
          label="Hộ đã GN"
          value={stats.disbursedCount}
          subValue="Đã hoàn tất"
          icon={CheckCircle}
          colorClass="text-emerald-600"
        />
        <StatBox
          label="Hộ chưa GN"
          value={stats.notDisbursedCount}
          subValue="Đang chờ"
          icon={Clock}
          colorClass="text-amber-600"
        />
        <StatBox
          label="Tiền đã GN"
          value={formatCurrency(stats.moneyDisbursed)}
          icon={DollarSign}
          colorClass="text-emerald-600"
        />
        <StatBox
          label="Tiền chưa GN"
          value={formatCurrency(stats.moneyNotDisbursed)}
          icon={Users}
          colorClass="text-amber-600"
        />
        <StatBox
          label="Tổng lãi PS"
          value={formatCurrency(stats.accruedInterest)}
          subValue={stats.lockedInterest > 0 ? `Đã chốt: ${formatCurrency(stats.lockedInterest)}` : "Lãi tạm tính"}
          icon={PiggyBank}
          colorClass="text-rose-600"
        />
      </div>

      {/* Search Bar */}
      <GlassCard className="p-4 flex gap-4 items-center border-slate-200">
        <div className="w-full flex flex-col gap-3">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[240px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Tìm theo Trạng thái, Tên, Mã GD, Số QĐ..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm font-bold text-black focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
            {selectedTransactions.size > 0 && (
              <>
                <button
                  onClick={() => setShowBatchPrint(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition-colors shadow-sm"
                >
                  <Printer size={16} />
                  <span>In hàng loạt ({selectedTransactions.size})</span>
                </button>
                <button
                  onClick={async () => {
                    if (selectedTransactions.size === 0) return;
                    
                    const confirmMsg = `Bạn có chắc chắn muốn xóa ${selectedTransactions.size} giao dịch đã chọn?\n\nHành động này không thể hoàn tác.`;
                    if (!window.confirm(confirmMsg)) return;

                    try {
                      // Delete transactions SEQUENTIALLY to ensure runningBalance is calculated correctly
                      // Parallel deletion causes runningBalance calculation errors
                      const results = [];
                      for (const id of Array.from(selectedTransactions)) {
                        try {
                          const result = await api.transactions.delete(id);
                          results.push({ success: true, ...result });
                        } catch (err: any) {
                          console.error(`Failed to delete transaction ${id}:`, err);
                          results.push({ success: false, id, error: err.message });
                        }
                      }
                      const successCount = results.filter(r => r.success !== false).length;
                      const failCount = results.length - successCount;

                      if (failCount > 0) {
                        alert(`Đã xóa ${successCount} giao dịch thành công. ${failCount} giao dịch xóa thất bại.`);
                      } else {
                        alert(`Đã xóa ${successCount} giao dịch thành công!`);
                      }

                      // Clear selection
                      setSelectedTransactions(new Set());
                      
                      // Refresh data
                      if (onDelete) {
                        onDelete();
                      }
                    } catch (error: any) {
                      console.error('Error deleting transactions:', error);
                      alert('Lỗi khi xóa giao dịch: ' + (error.message || 'Unknown error'));
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors shadow-sm"
                >
                  <Trash2 size={16} />
                  <span>Xóa giao dịch ({selectedTransactions.size})</span>
                </button>
              </>
            )}
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
              <Filter size={16} />
              <span>Bộ lọc</span>
            </button>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Từ ngày</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-black shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Đến ngày</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-black shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <span className="px-2 py-1 rounded-full bg-slate-100 border border-slate-200">
                Đang lọc: {formattedStart} → {formattedEnd}
              </span>
              <span className="text-slate-500">({filtered.length} giao dịch khớp)</span>
            </div>
            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(''); setEndDate(''); setCurrentPage(1); }}
                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
              >
                Xóa lọc
              </button>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Data Table */}
      <GlassCard className="overflow-hidden p-0 border-slate-300 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="text-[10px] text-slate-700 uppercase font-bold bg-slate-100 border-b border-slate-200 backdrop-blur-sm sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3.5 border-r border-slate-200 text-center w-12">
                  <input
                    type="checkbox"
                    checked={paginatedData.length > 0 && paginatedData.every(t => selectedTransactions.has(t.id))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const newSet = new Set(selectedTransactions);
                        paginatedData.forEach(t => newSet.add(t.id));
                        setSelectedTransactions(newSet);
                      } else {
                        const newSet = new Set(selectedTransactions);
                        paginatedData.forEach(t => newSet.delete(t.id));
                        setSelectedTransactions(newSet);
                      }
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3.5 border-r border-slate-200 text-center w-12">STT</th>
                <th className="px-4 py-3.5 border-r border-slate-200 min-w-[100px]">Mã GD</th>
                <th className="px-4 py-3.5 border-r border-slate-200 min-w-[120px]">Mã Hộ Dân</th>
                <th className="px-4 py-3.5 border-r border-slate-200 min-w-[200px]">Mã Dự Án</th>
                <th className="px-4 py-3.5 border-r border-slate-200 min-w-[150px]">Họ và tên</th>
                <th className="px-4 py-3.5 border-r border-slate-200 min-w-[180px]">Loại chi trả</th>
                <th className="px-4 py-3.5 border-r border-slate-200 min-w-[120px]">Số quyết định</th>
                <th className="px-4 py-3.5 border-r border-slate-200 min-w-[130px]">Ngày GN</th>
                <th className="px-4 py-3.5 text-right border-r border-slate-200 min-w-[130px]">Tổng phê duyệt</th>
                <th className="px-4 py-3.5 text-right border-r border-slate-200 min-w-[120px]">Lãi phát sinh</th>
                <th className="px-4 py-3.5 text-right border-r border-slate-200 min-w-[120px]">Tiền bổ sung</th>
                <th className="px-4 py-3.5 text-right border-r border-slate-200 min-w-[130px]">Tổng chi trả</th>
                <th className="px-4 py-3.5 border-r border-slate-200 text-center min-w-[120px]">Trạng thái</th>
                <th className="px-4 py-3.5 text-center min-w-[80px]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {paginatedData.map((t, index) => {

                const project = resolveProject(t);
                const isDisbursed = t.status === TransactionStatus.DISBURSED;

                // --- INTEREST CALCULATION LOGIC ---
                // Prioritize effectiveInterestDate (for refunds) over project date
                const baseDate = t.effectiveInterestDate || project?.interestStartDate || (project as any)?.startDate;
                let currentInterest = 0;

                if (isDisbursed && t.disbursementDate) {
                  // CASE 1: Đã giải ngân -> Lãi tính đến ngày thực tế chi trả (đóng băng)
                  currentInterest = calculateInterest(t.compensation.totalApproved, interestRate, baseDate, new Date(t.disbursementDate));
                } else if (!isDisbursed) {
                  // CASE 2: Chưa giải ngân (bao gồm cả PENDING & HOLD) -> Lãi tính đến hiện tại (tiếp tục chạy)
                  currentInterest = calculateInterest(t.compensation.totalApproved, interestRate, baseDate, new Date());
                }

                const supplementary = t.supplementaryAmount || 0;
                const totalPayout = t.compensation.totalApproved + currentInterest + supplementary;

                // --- DISPLAY DATE LOGIC ---
                // Nếu đã GN: Hiện ngày thực tế
                // Nếu chưa GN: Hiện ngày dự kiến (effectiveInterestDate hoặc interestStartDate của dự án)
                const relevantDate = getRelevantDate(t, project);
                let displayDateStr = relevantDate ? formatDate(relevantDate) : '-';
                let dateNote = '';
                let dateColorClass = 'text-slate-500';

                if (isDisbursed && t.disbursementDate) {
                  displayDateStr = formatDate(t.disbursementDate);
                  dateNote = 'Thực tế';
                  dateColorClass = 'text-emerald-700 font-bold';
                } else if (baseDate) {
                  displayDateStr = formatDate(baseDate);
                  // Nếu có effectiveInterestDate nghĩa là đã qua nạp tiền/reset, thì là ngày tính lãi mới
                  dateNote = t.effectiveInterestDate ? 'Ngày nạp quỹ' : 'Dự kiến';
                  dateColorClass = 'text-slate-600 font-semibold';
                }

                return (
                  <tr
                    key={t.id}
                    className="hover:bg-blue-50/50 transition-colors cursor-pointer group odd:bg-white even:bg-slate-50/30"
                    onClick={() => onSelect(t)}
                  >
                    <td className="px-4 py-3 border-r border-slate-200 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedTransactions.has(t.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          const newSet = new Set(selectedTransactions);
                          if (e.target.checked) {
                            newSet.add(t.id);
                          } else {
                            newSet.delete(t.id);
                          }
                          setSelectedTransactions(newSet);
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3 border-r border-slate-200 text-center font-bold text-slate-600">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="px-4 py-3 border-r border-slate-200">
                      <span className="font-bold text-slate-800 text-xs">{t.id}</span>
                    </td>
                    <td className="px-4 py-3 border-r border-slate-200 font-mono text-[11px] font-bold text-slate-500">
                      {t.household.id}
                    </td>
                    <td className="px-4 py-3 border-r border-slate-200">
                      <span className="text-xs font-bold bg-blue-50 px-2 py-1 rounded text-blue-700">
                        {project ? project.code : (t.projectId as any).toString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 border-r border-slate-200">
                      <span className="text-slate-900 font-bold text-[13px] group-hover:text-blue-700 transition-colors block">{t.household.name}</span>
                    </td>
                    <td className="px-4 py-3 border-r border-slate-200">
                      <span className="text-[11px] font-bold text-slate-600 bg-slate-50 px-2 py-0.5 rounded">
                        {t.paymentType || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 border-r border-slate-200">
                      <span className="text-xs font-bold text-slate-700">{t.household?.decisionNumber || '-'}</span>
                    </td>
                    <td className="px-4 py-3 border-r border-slate-200">
                      <div className="flex flex-col">
                        <span className={`text-xs ${dateColorClass}`}>{displayDateStr}</span>
                        <span className="text-[10px] text-slate-400 italic font-medium">{dateNote}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800 border-r border-slate-200">
                      {formatCurrency(t.compensation.totalApproved)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-rose-600 border-r border-slate-200">
                      {currentInterest > 0 ? `+${formatCurrency(currentInterest)}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-bold border-r border-slate-200">
                      {supplementary !== 0 ? (
                        <span className={supplementary > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {supplementary > 0 ? '+' : ''}{formatCurrency(supplementary)}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-blue-700 border-r border-slate-200 bg-blue-50/30">
                      {formatCurrency(totalPayout)}
                    </td>
                    <td className="px-4 py-3 border-r border-slate-200 text-center">
                      <div className="flex items-center justify-center">
                        <StatusBadge status={t.status} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button className="text-slate-400 hover:text-blue-600 p-1.5 hover:bg-blue-50 rounded transition-all" title="Chi tiết">
                          <Eye size={16} strokeWidth={2.5} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPrintTransaction(t);
                          }}
                          className="text-slate-400 hover:text-green-600 p-1.5 hover:bg-green-50 rounded transition-all"
                          title="In phiếu chi"
                        >
                          <FileText size={16} strokeWidth={2.5} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="p-12 text-center text-slate-400 font-medium">Không tìm thấy giao dịch phù hợp</div>
        )}

        {/* Pagination Controls */}
        <div className="p-4 bg-white/50 border-t border-slate-200 flex justify-between items-center backdrop-blur-sm">
          <div className="text-xs font-bold text-slate-500">
            Hiển thị {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filtered.length)} trên tổng số {filtered.length} bản ghi
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
            >
              <ChevronLeft size={16} strokeWidth={2} />
            </button>
            <div className="flex items-center justify-center px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-blue-700 shadow-sm">
              Trang {currentPage} / {totalPages}
            </div>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
            >
              <ChevronRight size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Print Modal */}
      {printTransaction && (
        <PrintPhieuChi
          transaction={printTransaction}
          project={projects.find(p => p.id === printTransaction.projectId)}
          interestRate={interestRate}
          currentUser={currentUser}
          onClose={() => setPrintTransaction(null)}
        />
      )}

      {/* Batch Print Modal */}
      {showBatchPrint && selectedTransactions.size > 0 && (
        <PrintPhieuChiBatch
          transactions={transactions.filter(t => selectedTransactions.has(t.id))}
          projects={projects}
          interestRate={interestRate}
          currentUser={currentUser}
          onClose={() => {
            setShowBatchPrint(false);
            setSelectedTransactions(new Set());
          }}
        />
      )}
    </div>
  );
};
