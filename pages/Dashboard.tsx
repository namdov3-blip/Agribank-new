
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { GlassCard } from '../components/GlassCard';
import { Transaction, TransactionStatus, Project, User, BankAccount } from '../types';
import { formatCurrency, calculateInterest, formatDate } from '../utils/helpers';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps
} from 'recharts';
import {
  Wallet,
  Layers,
  TrendingUp,
  Users,
  UserX,
  CheckCircle,
  AlertCircle,
  PiggyBank,
  Check,
  ChevronRight
} from 'lucide-react';

interface DashboardProps {
  transactions: Transaction[];
  projects: Project[];
  interestRate: number;
  bankAccount: BankAccount;
  setActiveTab: (tab: string) => void;
  currentUser: User;
}

export const Dashboard: React.FC<DashboardProps> = ({ transactions, projects, interestRate, bankAccount, setActiveTab, currentUser }) => {
  const [selectedProjectIds, setSelectedProjectIds] = React.useState<string[]>([]);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartDimensions, setChartDimensions] = useState({ width: 800, height: 450 }); // Giá trị mặc định hợp lý
  // Keep internal values as ISO (yyyy-mm-dd) for reliable Date parsing/filtering.
  const [startDate, setStartDate] = useState<string>(''); // ISO yyyy-mm-dd
  const [endDate, setEndDate] = useState<string>(''); // ISO yyyy-mm-dd
  const formattedStart = startDate ? formatDate(startDate) : '---';
  const formattedEnd = endDate ? formatDate(endDate) : '---';

  const getRelevantDate = React.useCallback((t: Transaction) => {
    const pIdStr = (t.projectId && (t.projectId as any)._id) ? (t.projectId as any)._id.toString() : t.projectId?.toString();
    const project = projects.find(p => (p.id === pIdStr || (p as any)._id === pIdStr));
    const baseDate = t.effectiveInterestDate || project?.interestStartDate || (project as any)?.startDate;
    if (t.status === TransactionStatus.DISBURSED && t.disbursementDate) {
      return t.disbursementDate;
    }
    return baseDate;
  }, [projects]);

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

  // --- Data Aggregation Logic ---

  const filteredProjects = useMemo(() => {
    if (selectedProjectIds.length === 0) return projects;
    return projects.filter(p => selectedProjectIds.includes(p.id));
  }, [projects, selectedProjectIds]);

  const dateFilteredTransactions = useMemo(() => {
    return transactions.filter(t => isWithinDateRange(getRelevantDate(t)));
  }, [transactions, isWithinDateRange, getRelevantDate]);

  const filteredTransactions = useMemo(() => {
    const base = dateFilteredTransactions;
    if (selectedProjectIds.length === 0) return base;
    return base.filter(t => selectedProjectIds.includes(t.projectId));
  }, [dateFilteredTransactions, selectedProjectIds]);

  const statsTotalProjects = filteredProjects.length;
  const statsTotalHouseholds = filteredTransactions.length;

  const statsDisbursedTrans = filteredTransactions.filter(t => t.status === TransactionStatus.DISBURSED);

  const statsDisbursedAmount = statsDisbursedTrans.reduce((acc, t) => {
    // Use stored disbursedTotal for exact amount (avoids timezone calculation differences)
    if ((t as any).disbursedTotal) {
      return acc + (t as any).disbursedTotal;
    }
    // Fallback to calculation for older transactions without disbursedTotal
    const project = projects.find(p => p.id === t.projectId);
    const baseDate = t.effectiveInterestDate || project?.interestStartDate;
    let interest = 0;
    if (t.disbursementDate) {
      interest = calculateInterest(t.compensation.totalApproved, interestRate, baseDate, new Date(t.disbursementDate));
    }
    const supplementary = t.supplementaryAmount || 0;
    return acc + t.compensation.totalApproved + interest + supplementary;
  }, 0);

  const statsPendingTrans = filteredTransactions.filter(t => t.status !== TransactionStatus.DISBURSED);
  const statsPendingCount = statsPendingTrans.length;

  const statsPendingAmount = statsPendingTrans.reduce((acc, t) => {
    const project = projects.find(p => p.id === t.projectId);
    const baseDate = t.effectiveInterestDate || project?.interestStartDate;
    const interest = calculateInterest(t.compensation.totalApproved, interestRate, baseDate, new Date());
    const supplementary = t.supplementaryAmount || 0;
    const transactionTotal = t.compensation.totalApproved + interest + supplementary;
    return acc + transactionTotal;
  }, 0);

  // Tổng lãi phát sinh - Link với tab Giao dịch / tab Số dư
  // CHỈ tính lãi từ các giao dịch CHƯA giải ngân (PENDING + HOLD) - Lãi tạm tính
  // Khi giải ngân, lãi của giao dịch đó sẽ được chuyển sang "đã chốt" và không còn trong tổng này
  let tempInterest = 0; // Lãi tạm tính (chưa giải ngân)
  let lockedInterest = 0; // Lãi đã chốt (đã giải ngân)

  filteredTransactions.forEach(t => {
    const project = projects.find(p => p.id === t.projectId);
    const baseDate = t.effectiveInterestDate || project?.interestStartDate;

    if (t.status === TransactionStatus.DISBURSED && t.disbursementDate) {
      // Lãi đã chốt - prefer disbursedTotal for accuracy
      if ((t as any).disbursedTotal) {
        // Extract interest from stored total: total - principal - supplementary
        const supplementary = t.supplementaryAmount || 0;
        const extractedInterest = (t as any).disbursedTotal - t.compensation.totalApproved - supplementary;
        lockedInterest += extractedInterest;
      } else {
        const calculatedInterest = calculateInterest(t.compensation.totalApproved, interestRate, baseDate, new Date(t.disbursementDate));
        lockedInterest += calculatedInterest;
      }
    } else if (t.status !== TransactionStatus.DISBURSED) {
      // Lãi tạm tính (chỉ từ các giao dịch chưa giải ngân)
      const tInterest = calculateInterest(t.compensation.totalApproved, interestRate, baseDate, new Date());
      tempInterest += tInterest;
    }
  });

  const statsTotalInterest = tempInterest; // Chỉ trả về lãi tạm tính
  const statsLockedInterest = lockedInterest; // Lãi đã chốt (để hiển thị)

  // Tổng giá trị dự án = statsDisbursedAmount + statsPendingAmount
  // Using the same calculation as above for consistency
  const statsTotalProjectValue = statsDisbursedAmount + statsPendingAmount;

  // Dashboard total balance = Tiền chưa GN (gốc + lãi + bổ sung của các giao dịch chưa giải ngân)
  // This should naturally equal statsPendingAmount
  const statsTotalAccountBalance = statsPendingAmount;

  const projectStats = useMemo(() => {
    return projects.map(project => {
      const projectTrans = dateFilteredTransactions.filter(t => t.projectId === project.id);

      const pDisbursed = projectTrans
        .filter(t => t.status === TransactionStatus.DISBURSED)
        .reduce((acc, t) => {
          // Use disbursedTotal when available
          if ((t as any).disbursedTotal) {
            return acc + (t as any).disbursedTotal;
          }
          const baseDate = t.effectiveInterestDate || project.interestStartDate;
          let interest = 0;
          if (t.disbursementDate) {
            interest = calculateInterest(t.compensation.totalApproved, interestRate, baseDate, new Date(t.disbursementDate));
          }
          const supplementary = t.supplementaryAmount || 0;
          return acc + t.compensation.totalApproved + interest + supplementary;
        }, 0);

      const pPending = projectTrans
        .filter(t => t.status !== TransactionStatus.DISBURSED)
        .reduce((acc, t) => {
          const baseDate = t.effectiveInterestDate || project.interestStartDate;
          const interest = calculateInterest(t.compensation.totalApproved, interestRate, baseDate, new Date());
          const supplementary = t.supplementaryAmount || 0;
          return acc + t.compensation.totalApproved + interest + supplementary;
        }, 0);

      const pInterest = projectTrans.reduce((acc, t) => {
        const baseDate = t.effectiveInterestDate || project.interestStartDate;
        if (t.status === TransactionStatus.DISBURSED && t.disbursementDate) {
          // Use disbursedTotal to extract exact interest
          if ((t as any).disbursedTotal) {
            const supplementary = t.supplementaryAmount || 0;
            return acc + ((t as any).disbursedTotal - t.compensation.totalApproved - supplementary);
          }
          return acc + calculateInterest(t.compensation.totalApproved, interestRate, baseDate, new Date(t.disbursementDate));
        } else if (t.status !== TransactionStatus.DISBURSED) {
          return acc + calculateInterest(t.compensation.totalApproved, interestRate, baseDate, new Date());
        }
        return acc;
      }, 0);

      const completionRate = project.totalBudget > 0 ? (pDisbursed / project.totalBudget) * 100 : 0;

      return {
        ...project,
        disbursedAmount: pDisbursed,
        pendingAmount: pPending,
        interestAmount: pInterest,
        completionRate: parseFloat(completionRate.toFixed(1))
      };
    });
  }, [projects, dateFilteredTransactions, interestRate]);

  const chartData = useMemo(() => {
    if (selectedProjectIds.length === 0) return projectStats;
    return projectStats.filter(p => selectedProjectIds.includes(p.id));
  }, [projectStats, selectedProjectIds]);

  const toggleProjectSelection = (id: string) => {
    setSelectedProjectIds(prev =>
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  // Đảm bảo chart container có kích thước trước khi render
  useEffect(() => {
    const updateDimensions = () => {
      if (chartContainerRef.current) {
        const { width, height } = chartContainerRef.current.getBoundingClientRect();
        if (width > 0 && height > 0) {
          setChartDimensions({ width, height });
        }
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    const timer = setTimeout(updateDimensions, 100); // Delay để đảm bảo DOM đã render

    return () => {
      window.removeEventListener('resize', updateDimensions);
      clearTimeout(timer);
    };
  }, [selectedProjectIds, chartData]);

  const KPICard = ({ title, value, subValue, icon: Icon, colorClass }: any) => (
    <GlassCard hoverEffect className="relative flex flex-col justify-between h-full min-h-[120px] shadow-sm border-slate-200">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-[11px] font-semibold text-slate-600 uppercase tracking-widest">{title}</h3>
        <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10 border border-current opacity-80`}>
          <Icon size={18} className={colorClass.replace('bg-', 'text-')} strokeWidth={2} />
        </div>
      </div>
      <div>
        <div className="flex items-center gap-2">
          <p className="text-xl font-semibold text-black tracking-tight">{value}</p>
        </div>
        {subValue && <p className="text-[11px] font-medium text-slate-500 mt-1">{subValue}</p>}
      </div>
    </GlassCard>
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const project = projects.find(p => p.code === label);
      const title = project ? project.name : label;

      return (
        <div className="bg-white/95 backdrop-blur-xl p-3 rounded-lg shadow-xl border border-slate-200 text-xs z-50">
          <p className="font-bold text-black mb-2 pb-1 border-b border-slate-200 max-w-[200px] truncate">{title}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex justify-between gap-6 mb-1.5 last:mb-0 items-center">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: entry.color }} />
                <span className="text-slate-600 font-medium">{entry.name}:</span>
              </div>
              <span className="font-bold text-slate-900">
                {(entry.unit === '%' || entry.name.includes('Tiến độ') || entry.name.includes('Hoàn thành'))
                  ? `${entry.value}%`
                  : formatCurrency(entry.value as number)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const isDetailedView = selectedProjectIds.length > 0;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex flex-col gap-3 pb-2">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-medium text-black tracking-tight">Dashboard</h2>
            <p className="text-sm font-medium text-slate-500 mt-1">Tổng quan tài chính & tiến độ</p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3 justify-end w-full">
          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Từ ngày</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-black shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Đến ngày</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-black shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <span className="px-2 py-1 rounded-full bg-slate-100 border border-slate-200">
              Đang lọc: {formattedStart} → {formattedEnd}
            </span>
            <span className="text-slate-500">({filteredTransactions.length} giao dịch khớp)</span>
          </div>
          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
            >
              Xóa lọc
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="TỔNG TIỀN TÀI KHOẢN"
          value={formatCurrency(statsTotalAccountBalance)}
          subValue="Đã bao gồm lãi tạm tính"
          icon={Wallet}
          colorClass="bg-blue-600 text-blue-600"
        />
        <KPICard
          title="TỔNG SỐ DỰ ÁN"
          value={statsTotalProjects}
          subValue={isDetailedView ? "Đang chọn" : "Đang quản lý"}
          icon={Layers}
          colorClass="bg-teal-600 text-teal-600"
        />
        <KPICard
          title="TỔNG GIÁ TRỊ DỰ ÁN"
          value={formatCurrency(statsTotalProjectValue)}
          subValue="Vốn đầu tư"
          icon={TrendingUp}
          colorClass="bg-purple-600 text-purple-600"
        />
        <KPICard
          title="TỔNG SỐ HỘ DÂN"
          value={statsTotalHouseholds}
          subValue="Hồ sơ hệ thống"
          icon={Users}
          colorClass="bg-sky-600 text-sky-600"
        />
        <KPICard
          title="HỘ DÂN CHƯA NHẬN"
          value={statsPendingCount}
          subValue="Hồ sơ tồn"
          icon={UserX}
          colorClass="bg-orange-600 text-orange-600"
        />
        <KPICard
          title="ĐÃ GIẢI NGÂN"
          value={formatCurrency(statsDisbursedAmount)}
          subValue="Đã bao gồm lãi"
          icon={CheckCircle}
          colorClass="bg-emerald-600 text-emerald-600"
        />
        <KPICard
          title="CHƯA GIẢI NGÂN"
          value={formatCurrency(statsPendingAmount)}
          subValue="Đã bao gồm lãi tạm tính"
          icon={AlertCircle}
          colorClass="bg-amber-600 text-amber-600"
        />
        <KPICard
          title="LÃI PHÁT SINH"
          value={formatCurrency(statsTotalInterest)}
          subValue={statsLockedInterest > 0 ? `Đã chốt: ${formatCurrency(statsLockedInterest)}` : `Lãi suất: ${interestRate}%`}
          icon={PiggyBank}
          colorClass="bg-rose-600 text-rose-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ minHeight: '550px', height: '550px' }}>
        <GlassCard className="lg:col-span-2 flex flex-col p-6 border-slate-200" style={{ height: '100%', minHeight: '550px' }}>
          <div className="flex justify-between items-center mb-6" style={{ flexShrink: 0 }}>
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Tiến độ & Phân bổ vốn</h3>
              <p className="text-xs font-medium text-slate-500 mt-1">
                {isDetailedView
                  ? `Chi tiết ${selectedProjectIds.length} dự án được chọn`
                  : "Tổng quan toàn bộ hệ thống"}
              </p>
            </div>
            {isDetailedView && (
              <button
                onClick={() => setSelectedProjectIds([])}
                className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-lg transition-colors border border-red-200"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
          <div
            ref={chartContainerRef}
            className="flex-1 w-full"
            style={{
              height: '450px',
              width: '100%',
              position: 'relative',
              flexShrink: 0,
              minHeight: '400px',
              minWidth: '300px'
            }}
          >
            {chartDimensions.width > 0 && chartDimensions.height > 0 ? (
              <ResponsiveContainer width={chartDimensions.width} height={chartDimensions.height}>
                <ComposedChart
                  data={chartData}
                  margin={{ top: 10, right: 10, bottom: 0, left: 10 }}
                  barGap={2}
                >
                  <CartesianGrid stroke="#cbd5e1" vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="code"
                    scale="band"
                    tick={{ fontSize: 11, fontWeight: 500, fill: '#0f172a' }}
                    interval={0}
                    axisLine={false}
                    tickLine={false}
                    tickMargin={12}
                  />
                  <YAxis
                    yAxisId="left"
                    orientation="left"
                    tickFormatter={(value) => new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(value)}
                    tick={{ fontSize: 11, fontWeight: 500, fill: '#475569' }}
                    axisLine={false}
                    tickLine={false}
                    label={{ value: 'Vốn (VND)', angle: -90, position: 'insideLeft', style: { fill: '#64748b', fontSize: 10, fontWeight: 600 } }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    unit="%"
                    tick={{ fontSize: 11, fontWeight: 500, fill: '#2563eb' }}
                    axisLine={false}
                    tickLine={false}
                    label={{ value: '% Hoàn thành', angle: 90, position: 'insideRight', style: { fill: '#2563eb', fontSize: 10, fontWeight: 600 } }}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: '11px', fontWeight: 600, paddingTop: '16px', color: '#334155' }}
                  />

                  <Bar
                    yAxisId="left"
                    dataKey="totalBudget"
                    name="Tổng vốn"
                    fill="#3b82f6"
                    radius={[3, 3, 0, 0]}
                    barSize={isDetailedView ? undefined : 24}
                  />

                  {isDetailedView && (
                    <>
                      <Bar
                        yAxisId="left"
                        dataKey="disbursedAmount"
                        name="Đã giải ngân"
                        fill="#10b981"
                        radius={[3, 3, 0, 0]}
                      />
                      <Bar
                        yAxisId="left"
                        dataKey="pendingAmount"
                        name="Chưa giải ngân"
                        fill="#f59e0b"
                        radius={[3, 3, 0, 0]}
                      />
                      <Bar
                        yAxisId="left"
                        dataKey="interestAmount"
                        name="Lãi phát sinh (Hold)"
                        fill="#f43f5e"
                        radius={[3, 3, 0, 0]}
                      />
                    </>
                  )}

                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="completionRate"
                    name="% Tỷ lệ hoàn thành"
                    unit="%"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    dot={{ r: 4, strokeWidth: 1.5, fill: '#fff', stroke: '#2563eb' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-sm text-slate-500">Đang tải biểu đồ...</p>
              </div>
            )}
          </div>
        </GlassCard>

        <GlassCard className="flex flex-col overflow-hidden p-0 border-slate-200">
          <div className="p-5 border-b border-slate-200 bg-white/50 flex justify-between items-center backdrop-blur-md">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Dự án</h3>
            <button
              onClick={() => setActiveTab('projects')}
              className="text-[10px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full"
            >
              Tất cả <ChevronRight size={12} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 custom-scrollbar p-2">
            <table className="w-full text-left border-collapse">
              <thead className="text-[10px] text-slate-500 font-bold uppercase sticky top-0 bg-white/95 backdrop-blur-md z-10 shadow-sm border-b border-slate-200">
                <tr>
                  <th className="p-3 w-8 text-center">#</th>
                  <th className="p-3">Dự án</th>
                  <th className="p-3 text-right">Giá trị dự án</th>
                  <th className="p-3 w-14 text-center">%</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-200">
                {projectStats.map((project, index) => (
                  <tr
                    key={project.id}
                    className={`
                        group transition-all cursor-pointer rounded-lg
                        ${selectedProjectIds.includes(project.id) ? 'bg-blue-50' : 'hover:bg-slate-50'}
                      `}
                    onClick={() => toggleProjectSelection(project.id)}
                  >
                    <td className="p-3 text-center">
                      <div className={`
                         w-4 h-4 rounded border flex items-center justify-center transition-all mx-auto
                         ${selectedProjectIds.includes(project.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-200 bg-white group-hover:border-blue-400'}
                       `}>
                        {selectedProjectIds.includes(project.id) && <Check size={10} className="text-white" strokeWidth={3} />}
                      </div>
                    </td>
                    <td className="p-3">
                      <p className={`font-semibold text-[13px] text-black truncate max-w-[120px] ${selectedProjectIds.includes(project.id) ? 'text-blue-800' : ''}`} title={project.name}>{project.name}</p>
                      <p className="text-[10px] font-medium text-slate-500 truncate">{project.code}</p>
                    </td>
                    <td className="p-3 text-right font-medium text-[12px] text-black">
                      {formatCurrency(project.totalBudget)}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`text-[11px] font-bold ${project.completionRate === 100 ? 'text-emerald-600' : 'text-slate-600'}`}>
                        {project.completionRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-white/80 border-t border-slate-200 text-[10px] font-medium text-slate-600 text-center backdrop-blur-sm">
            Đã chọn <span className="font-bold text-blue-700">{selectedProjectIds.length}</span> dự án
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
