import React, { useRef, useState } from 'react';
import api from '../services/api';
import { GlassCard } from '../components/GlassCard';
import { formatDate, formatCurrency, calculateInterest } from '../utils/helpers';
import { Plus, FolderKanban, Coins, Loader2, X, Check, FileSpreadsheet, Edit2, Eye, Calendar, Save, Tag, Type, Trash2 } from 'lucide-react';
import { Project, Transaction, TransactionStatus } from '../types';

interface ProjectsProps {
  projects: Project[];
  transactions: Transaction[];
  interestRate?: number;
  onImport: (project: Project, transactions: Transaction[]) => void;
  onUpdateProject: (updatedProject: Project) => void;
  onViewDetails: (projectCode: string) => void;
  onDeleteProject: (id: string) => void;
}

interface PreviewData {
  project: Project;
  transactions: Transaction[];
  rawRows: any[];
}

// Normalize date to local timezone before binding to <input type="date">
const toInputDateLocal = (d?: string | Date) => {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 10);
};

export const Projects: React.FC<ProjectsProps> = ({ projects, transactions, interestRate = 0, onImport, onUpdateProject, onViewDetails, onDeleteProject }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [importMode, setImportMode] = useState<'create' | 'merge' | null>(null);

  // State for Editing
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Stats Calculation - tính tổng giá trị thực tế bao gồm tiền bổ sung + lãi phát sinh
  const totalProjects = projects.length;

  // Tính tổng giá trị ban đầu (không có lãi, không có tiền bổ sung)
  const totalInitialValue = projects.reduce((acc, p) => {
    const projectTrans = transactions.filter(t => t.projectId === p.id);
    const initialTotal = projectTrans.reduce((sum, t) => sum + t.compensation.totalApproved, 0);
    return acc + (initialTotal > 0 ? initialTotal : p.totalBudget);
  }, 0);

  // Tính tổng giá trị hiện tại (bao gồm lãi + tiền bổ sung)
  // Match Dashboard logic: use disbursedTotal for DISBURSED transactions
  const totalValue = projects.reduce((acc, p) => {
    const projectTrans = transactions.filter(t => t.projectId === p.id);
    const actualTotal = projectTrans.reduce((sum, t) => {
      const supplementary = t.supplementaryAmount || 0;
      
      // For disbursed transactions: prefer disbursedTotal (matching Dashboard)
      if (t.status === TransactionStatus.DISBURSED && (t as any).disbursedTotal) {
        return sum + (t as any).disbursedTotal;
      }
      
      // Fallback: calculate interest
      const baseDate = t.effectiveInterestDate || p.interestStartDate;
      let interest = 0;
      if (t.status === TransactionStatus.DISBURSED && t.disbursementDate) {
        interest = calculateInterest(t.compensation.totalApproved, interestRate, baseDate, new Date(t.disbursementDate));
      } else if (t.status !== TransactionStatus.DISBURSED) {
        interest = calculateInterest(t.compensation.totalApproved, interestRate, baseDate, new Date());
      }
      return sum + t.compensation.totalApproved + interest + supplementary;
    }, 0);
    return acc + (actualTotal > 0 ? actualTotal : p.totalBudget);
  }, 0);

  const handleNewProjectClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsUploading(true);

      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        try {
          // Call API to parse file for preview
          const res = await api.projects.import({
            fileData: base64,
            previewOnly: true
          });

          if (res.data) {
            setPreviewData({
              project: res.data.project,
              transactions: res.data.transactions,
              rawRows: res.data.transactions.map((t: any, i: number) => ({
                stt: t.stt || (i + 1),
                name: t.household.name,
                cccd: t.household.cccd,
                maHo: t.household.id,
                qd: t.household.decisionNumber,
                date: formatDate(t.household.decisionDate),
                projectCode: t.projectCode || res.data.project.code,
                projectName: t.projectName || res.data.project.name,
                paymentType: t.paymentType,
                amount: t.compensation.totalApproved
              }))
            });
          }
        } catch (err: any) {
          console.error('Parse file failed:', err);
          let errMsg = err.message || 'Không thể trúng xuất dữ liệu';
          if (err.detectedColumns && err.detectedColumns.length > 0) {
            errMsg += `\n\nCác cột tìm thấy: ${err.detectedColumns.join(', ')}`;
            if (err.suggestions) {
              errMsg += `\n\n- Tên: ${err.suggestions.name}\n- Số tiền: ${err.suggestions.amount}`;
            }
          }
          alert('Lỗi đọc file: ' + errMsg);
        } finally {
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      reader.onerror = () => {
        alert('Lỗi đọc file từ đĩa');
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProjectInfoChange = (field: keyof Project, value: string) => {
    setPreviewData(prev => {
      if (!prev) return null;
      return {
        ...prev,
        project: {
          ...prev.project,
          [field]: value
        }
      };
    });
  };

  const handleConfirmImport = async (mode: 'create' | 'merge') => {
    if (!previewData) return;

    try {
      const response = await api.projects.import({
        fileData: null,
        projectCode: previewData.project.code,
        projectName: previewData.project.name,
        location: previewData.project.location || '',
        interestStartDate: previewData.project.interestStartDate,
        transactions: previewData.transactions,
        previewOnly: false,
        importMode: mode
      });

      if (response.data?.skippedCount > 0) {
        const duplicateList = response.data.duplicates || [];
        const duplicateMsg = duplicateList
          .map((d: any) => `- ${d.name} (Mã: ${d.maHo}, Số tiền: ${formatCurrency(d.amount)})`)
          .join('\n');

        alert(
          `${mode === 'create' ? 'Tạo mới' : 'Merge'} thành công ${response.data.transactionCount} giao dịch.\n\n` +
          `Có ${response.data.skippedCount} giao dịch bị trùng đã bỏ qua:\n${duplicateMsg}`
        );
      } else {
        const progressMsg = response.data?.newProgressPercent 
          ? `\nTiến độ dự án: ${response.data.newProgressPercent}%`
          : '';
        alert(`${mode === 'create' ? 'Tạo mới' : 'Merge'} thành công ${response.data.transactionCount} giao dịch!${progressMsg}`);
      }

      // API call was successful, just call onImport to trigger refresh (without calling API again)
      setPreviewData(null);
      setImportMode(null);
      
      // Call onImport to trigger refresh in parent component
      if (onImport) {
        onImport(previewData.project, previewData.transactions, mode);
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      
      // Check if error contains duplicate information
      if (error.responseData?.duplicates && Array.isArray(error.responseData.duplicates)) {
        const duplicateList = error.responseData.duplicates;
        const duplicateMsg = duplicateList
          .map((d: any) => `- ${d.name} (Mã: ${d.maHo}, Số tiền: ${formatCurrency(d.amount)})`)
          .join('\n');
        
        alert(`Lỗi: ${errorMessage}\n\nGiao dịch trùng:\n${duplicateMsg}`);
      } else {
        alert(`Lỗi import: ${errorMessage}`);
      }
    }
  };

  const handleCancelPreview = () => {
    setPreviewData(null);
    setImportMode(null);
  };

  const openEditModal = (project: Project) => {
    setEditingProject({ ...project });
  };

  const saveProjectUpdate = () => {
    if (editingProject) {
      onUpdateProject(editingProject);
      setEditingProject(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Hidden File Input */}
      <input
        type="file"
        accept=".xlsx, .xls, .csv"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Main Header */}
      <div className="flex justify-between items-end pb-2">
        <div>
          <h2 className="text-2xl font-medium text-black tracking-tight">Quản lý dự án</h2>
          <p className="text-sm font-medium text-slate-500 mt-1">Danh sách dự án & tiến độ đền bù</p>
        </div>
        <button
          onClick={handleNewProjectClick}
          disabled={isUploading}
          className="flex items-center gap-2 px-5 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} strokeWidth={3} />}
          <span>{isUploading ? 'ĐANG XỬ LÝ...' : 'DỰ ÁN MỚI'}</span>
        </button>
      </div>

      {/* Stats Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GlassCard hoverEffect className="flex items-center gap-5 p-6 border-slate-200">
          <div className="p-3 rounded-lg bg-blue-600/10 border border-blue-600 text-blue-600">
            <FolderKanban size={24} strokeWidth={2} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-widest">Tổng số dự án</p>
            <p className="text-xl font-semibold text-black tracking-tight mt-0.5">{totalProjects}</p>
            <p className="text-[11px] font-medium text-slate-500 mt-1">Đã tải lên hệ thống</p>
          </div>
        </GlassCard>

        <GlassCard hoverEffect className="flex items-center gap-5 p-6 border-slate-200">
          <div className="p-3 rounded-lg bg-emerald-600/10 border border-emerald-600 text-emerald-600">
            <Coins size={24} strokeWidth={2} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-widest">Tổng giá trị dự án</p>
            <p className="text-xl font-semibold text-black tracking-tight mt-0.5">{formatCurrency(totalValue)}</p>
            {totalInitialValue !== totalValue && (
              <p className="text-[11px] font-medium text-slate-500 mt-1">Giá trị đầu: {formatCurrency(totalInitialValue)}</p>
            )}
            {totalInitialValue === totalValue && (
              <p className="text-[11px] font-medium text-slate-500 mt-1">Ngân sách dự kiến</p>
            )}
          </div>
        </GlassCard>
      </div>

      {/* MAIN PROJECT TABLE */}
      <GlassCard className="overflow-hidden p-0 border-slate-300 shadow-sm mt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] text-slate-700 uppercase font-bold bg-slate-100 border-b border-slate-200 backdrop-blur-sm">
              <tr>
                <th className="px-4 py-3.5 text-center w-12 border-r border-slate-200">STT</th>
                <th className="px-4 py-3.5 border-r border-slate-200">Mã dự án</th>
                <th className="px-4 py-3.5 border-r border-slate-200">Tên dự án</th>
                <th className="px-4 py-3.5 text-right border-r border-slate-200">Tổng ngân sách</th>
                <th className="px-4 py-3.5 text-center border-r border-slate-200">Ngày Upload</th>
                <th className="px-4 py-3.5 text-center border-r border-slate-200">Ngày GN & Tính lãi</th>
                <th className="px-4 py-3.5 w-40 border-r border-slate-200">Tiến độ</th>
                <th className="px-4 py-3.5 text-center w-32">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {projects.map((project, index) => {
                // Calculate Progress - bao gồm cả tiền bổ sung + lãi phát sinh
                const projectTrans = transactions.filter(t => {
                  const pIdStr = (t.projectId && (t.projectId as any)._id) ? (t.projectId as any)._id.toString() : t.projectId?.toString();
                  return pIdStr === project.id || pIdStr === (project as any)._id;
                });
                const disbursed = projectTrans
                  .filter(t => t.status === TransactionStatus.DISBURSED)
                  .reduce((acc, t) => {
                    // For disbursed transactions: prefer disbursedTotal (matching Dashboard)
                    if ((t as any).disbursedTotal) {
                      return acc + (t as any).disbursedTotal;
                    }
                    // Fallback: calculate interest
                    const supplementary = t.supplementaryAmount || 0;
                    const baseDate = t.effectiveInterestDate || project.interestStartDate || (project as any).startDate;
                    const interest = t.disbursementDate
                      ? calculateInterest(t.compensation.totalApproved, interestRate, baseDate, new Date(t.disbursementDate))
                      : 0;
                    return acc + t.compensation.totalApproved + interest + supplementary;
                  }, 0);

                // Tính tổng giá trị dự án thực tế (bao gồm tiền bổ sung + lãi phát sinh)
                // Match Dashboard logic: use disbursedTotal for DISBURSED transactions
                const actualTotalBudget = projectTrans.reduce((sum, t) => {
                  // For disbursed transactions: prefer disbursedTotal (matching Dashboard)
                  if (t.status === TransactionStatus.DISBURSED && (t as any).disbursedTotal) {
                    return sum + (t as any).disbursedTotal;
                  }
                  
                  // Fallback: calculate interest
                  const supplementary = t.supplementaryAmount || 0;
                  const baseDate = t.effectiveInterestDate || project.interestStartDate || (project as any).startDate;
                  let interest = 0;
                  if (t.status === TransactionStatus.DISBURSED && t.disbursementDate) {
                    interest = calculateInterest(t.compensation.totalApproved, interestRate, baseDate, new Date(t.disbursementDate));
                  } else if (t.status !== TransactionStatus.DISBURSED) {
                    interest = calculateInterest(t.compensation.totalApproved, interestRate, baseDate, new Date());
                  }
                  return sum + t.compensation.totalApproved + interest + supplementary;
                }, 0);

                const percent = actualTotalBudget > 0 ? (disbursed / actualTotalBudget) * 100 : 0;
                const percentStr = percent.toFixed(1);

                return (
                  <tr key={project.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-3 text-center text-slate-700 font-bold border-r border-slate-200">{index + 1}</td>
                    <td className="px-4 py-3 border-r border-slate-200">
                      <span className="text-[11px] font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {project.code}
                      </span>
                    </td>
                    <td className="px-4 py-3 border-r border-slate-200">
                      <p className="text-slate-900 font-bold">{project.name}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800 border-r border-slate-200">
                      {formatCurrency(actualTotalBudget)}
                      {actualTotalBudget !== project.totalBudget && (
                        <span className="text-[10px] text-slate-500 block font-normal">
                          Giá trị đầu: {formatCurrency(project.totalBudget)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-slate-700 font-medium border-r border-slate-200">
                      {project.uploadDate ? formatDate(project.uploadDate) : '-'}
                    </td>
                    <td className="px-4 py-3 text-center text-xs font-bold text-blue-700 bg-blue-50/50 mx-2 border-r border-slate-200">
                      {project.interestStartDate ? formatDate(project.interestStartDate) : 'Chưa thiết lập'}
                    </td>
                    <td className="px-4 py-3 border-r border-slate-200">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden border border-slate-200">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${percent}%` }}></div>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 w-8">{percentStr}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditModal(project)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-all border border-transparent hover:border-blue-200"
                          title="Cập nhật dự án"
                        >
                          <Edit2 size={16} strokeWidth={2} />
                        </button>
                        <button
                          onClick={() => onViewDetails(project.code)}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-100 rounded-lg transition-all border border-transparent hover:border-emerald-200"
                          title="Xem chi tiết"
                        >
                          <Eye size={16} strokeWidth={2} />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Bạn có chắc chắn muốn xóa dự án này? Tất cả hồ sơ liên quan sẽ bị xóa.')) {
                              onDeleteProject(project.id!);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-100"
                          title="Xóa dự án"
                        >
                          <Trash2 size={16} strokeWidth={2} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* EDIT PROJECT MODAL */}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
          <GlassCard className="w-[450px] bg-white p-6 shadow-2xl border-slate-300">
            <div className="flex justify-between items-start mb-6 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Edit2 size={18} className="text-blue-600" />
                  Cập nhật dự án
                </h3>
                <p className="text-xs font-semibold text-slate-500 mt-1 max-w-[350px] truncate">{editingProject.name}</p>
              </div>
              <button onClick={() => setEditingProject(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-2 flex items-center gap-1.5">
                  <Type size={12} /> Tên dự án
                </label>
                <input
                  type="text"
                  value={editingProject.name}
                  onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nhập tên dự án"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-2 flex items-center gap-1.5">
                  <Tag size={12} /> Mã dự án
                </label>
                <input
                  type="text"
                  value={editingProject.code}
                  onChange={(e) => setEditingProject({ ...editingProject, code: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono font-bold text-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nhập mã dự án"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-2 flex items-center gap-1.5">
                  <Calendar size={12} /> Ngày Giải Ngân & Tính Lãi
                </label>
                <div className="relative">
                  <input
                    type="date"
                    lang="vi"
                    value={toInputDateLocal(editingProject.interestStartDate)}
                    onChange={(e) => setEditingProject({ ...editingProject, interestStartDate: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5 italic font-medium">
                  * Mốc thời gian để tính lãi tự động cho hồ sơ chưa nhận tiền.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => setEditingProject(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
              >
                Hủy bỏ
              </button>
              <button
                onClick={saveProjectUpdate}
                className="px-5 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center gap-2"
              >
                <Save size={14} /> Lưu thay đổi
              </button>
            </div>
          </GlassCard>
        </div>
      )}


      {/* PREVIEW MODAL */}
      {previewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-200">
          <GlassCard className="w-[95vw] h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl border-slate-300 bg-white/95">

            {/* Modal Header */}
            <div className="flex justify-between items-center p-5 border-b border-slate-200 bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-lg border border-blue-200">
                  <FileSpreadsheet size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    Xác nhận nhập dữ liệu <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-500 font-mono">v1.1</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-bold">Vui lòng kiểm tra kỹ thông tin trích xuất từ file Excel trước khi lưu.</p>
                </div>
              </div>
              <button
                onClick={handleCancelPreview}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body - Scrollable Area */}
            <div className="flex-1 overflow-hidden flex flex-col p-5 bg-slate-50/30">

              {/* Project Info Summary (Editable) */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-6">
                <div className="sm:col-span-1 relative group">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
                    Tên dự án <Edit2 size={10} className="text-slate-400" />
                  </label>
                  <input
                    value={previewData.project.name}
                    onChange={(e) => handleProjectInfoChange('name', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded px-2 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-all shadow-sm"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
                    Mã dự án <Edit2 size={10} className="text-slate-400" />
                  </label>
                  <input
                    value={previewData.project.code}
                    onChange={(e) => handleProjectInfoChange('code', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded px-2 py-2 text-xs font-mono font-bold text-blue-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-all shadow-sm"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
                    Ngày GN & Tính lãi <Edit2 size={10} className="text-slate-400" />
                  </label>
                  <div className="relative flex">
                    <input
                      type="text"
                      readOnly
                      value={previewData.project.interestStartDate ? (() => {
                        const d = typeof previewData.project.interestStartDate === 'string'
                          ? new Date(previewData.project.interestStartDate)
                          : new Date(previewData.project.interestStartDate);
                        const day = String(d.getDate()).padStart(2, '0');
                        const month = String(d.getMonth() + 1).padStart(2, '0');
                        const year = d.getFullYear();
                        return `${day}/${month}/${year}`;
                      })() : ''}
                      placeholder="DD/MM/YYYY"
                      className="flex-1 bg-white border border-slate-200 rounded-l px-2 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-all shadow-sm cursor-pointer"
                      onClick={() => { if (dateInputRef.current?.showPicker) { dateInputRef.current.showPicker(); } else { dateInputRef.current?.click(); } }}
                    />
                    <button
                      type="button"
                      onClick={() => { if (dateInputRef.current?.showPicker) { dateInputRef.current.showPicker(); } else { dateInputRef.current?.click(); } }}
                      className="flex items-center justify-center px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-r cursor-pointer transition-colors"
                    >
                      <Calendar size={14} />
                    </button>
                    <input
                      ref={dateInputRef}
                      type="date"
                      value={previewData.project.interestStartDate ? (typeof previewData.project.interestStartDate === 'string' ? previewData.project.interestStartDate.split('T')[0] : new Date(previewData.project.interestStartDate).toISOString().split('T')[0]) : ''}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        handleProjectInfoChange('interestStartDate', newDate);
                      }}
                      className="absolute top-0 left-0 opacity-0 w-full h-full pointer-events-none"
                    />
                  </div>
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Tổng ngân sách</label>
                  <input
                    readOnly
                    value={formatCurrency(previewData.project.totalBudget)}
                    className="w-full bg-slate-100 border border-slate-200 rounded px-2 py-2 text-xs font-bold text-emerald-700 focus:outline-none text-right cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Data Table Area */}
              <div className="flex-1 overflow-auto border border-slate-200 rounded-lg bg-white shadow-sm custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[1200px]">
                  <thead className="bg-slate-100 border-b border-slate-200">
                    <tr>
                      <th className="p-3 text-[10px] font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200 text-center w-12">STT</th>
                      <th className="p-3 text-[10px] font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200 min-w-[180px]">Họ và tên</th>
                      <th className="p-3 text-[10px] font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200 min-w-[140px]">Mã Hộ Dân</th>
                      <th className="p-3 text-[10px] font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200 min-w-[120px]">Số quyết định</th>
                      <th className="p-3 text-[10px] font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200 min-w-[100px]">Ngày QD</th>
                      <th className="p-3 text-[10px] font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200 min-w-[150px]">Loại chi trả</th>
                      <th className="p-3 text-[10px] font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200 min-w-[100px]">Mã dự án</th>
                      <th className="p-3 text-[10px] font-bold text-slate-700 uppercase tracking-wider text-right min-w-[160px]">Số tiền chi trả</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-slate-200">
                    {previewData.rawRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/30 transition-colors even:bg-slate-50/20">
                        <td className="p-3 border-r border-slate-200 text-center font-medium text-slate-500">{row.stt}</td>
                        <td className="p-3 border-r border-slate-200 font-bold text-slate-800">{row.name}</td>
                        <td className="p-3 border-r border-slate-200 font-mono text-slate-600 text-[10px]">{row.maHo || '-'}</td>
                        <td className="p-3 border-r border-slate-200 text-slate-700">{row.qd || '-'}</td>
                        <td className="p-3 border-r border-slate-200 text-slate-700">{row.date || '-'}</td>
                        <td className="p-3 border-r border-slate-200 font-medium text-blue-600">{row.paymentType || '-'}</td>
                        <td className="p-3 border-r border-slate-200 text-slate-500 font-mono text-[10px]">{row.projectCode}</td>
                        <td className="p-3 text-right font-bold text-emerald-700">
                          {formatCurrency(row.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 text-[10px] text-slate-500 text-right italic font-medium">
                * Hiển thị {previewData.rawRows.length} bản ghi
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-200 bg-white">
              {!importMode ? (
                <div className="flex flex-col gap-3">
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => setImportMode('create')}
                      className="px-6 py-2.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center gap-2"
                    >
                      <Plus size={16} strokeWidth={3} />
                      Tạo dự án mới
                    </button>
                    <button
                      onClick={() => setImportMode('merge')}
                      className="px-6 py-2.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all flex items-center gap-2"
                    >
                      <FileSpreadsheet size={16} strokeWidth={3} />
                      Merge vào dự án có sẵn
                    </button>
                  </div>
                  <div className="flex justify-center">
                    <button
                      onClick={handleCancelPreview}
                      className="px-5 py-2.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors"
                    >
                      Hủy bỏ
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setImportMode(null);
                      handleCancelPreview();
                    }}
                    className="px-5 py-2.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    onClick={() => handleConfirmImport(importMode)}
                    className={`px-6 py-2.5 rounded-lg text-white text-xs font-bold shadow-lg transition-all flex items-center gap-2 ${
                      importMode === 'create'
                        ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                        : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                    }`}
                  >
                    <Check size={16} strokeWidth={3} />
                    {importMode === 'create' ? 'Tạo mới' : 'Merge'}
                  </button>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};
