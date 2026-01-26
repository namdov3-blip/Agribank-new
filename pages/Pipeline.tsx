
import React from 'react';
import { Transaction, TransactionStatus, Project } from '../types';
import { formatCurrency, calculateInterest } from '../utils/helpers';
import { QrCode } from 'lucide-react';

interface PipelineProps {
  transactions: Transaction[];
  onTransactionClick: (t: Transaction) => void;
  projects: Project[];
  interestRate: number;
}

export const Pipeline: React.FC<PipelineProps> = ({ transactions, onTransactionClick, projects, interestRate }) => {
  const columns = [
    { id: TransactionStatus.PENDING, title: 'Chưa giải ngân', color: 'bg-amber-500' },
    { id: TransactionStatus.HOLD, title: 'Tồn đọng / Giữ hộ', color: 'bg-rose-500' },
    { id: TransactionStatus.DISBURSED, title: 'Đã hoàn tất', color: 'bg-emerald-500' },
  ];

  const calculateTotal = (items: Transaction[], status: TransactionStatus) => {
    return items.reduce((acc, t) => {
        let interest = 0;
        const project = projects.find(p => p.id === t.projectId);
        const baseDate = t.effectiveInterestDate || project?.interestStartDate;

        if (status === TransactionStatus.DISBURSED && t.disbursementDate) {
            interest = calculateInterest(t.compensation.totalApproved, interestRate, baseDate, new Date(t.disbursementDate));
        } else if (status === TransactionStatus.HOLD) {
            interest = calculateInterest(t.compensation.totalApproved, interestRate, baseDate, new Date());
        }
        const supplementary = t.supplementaryAmount || 0;
        // Pending items (Total Approved only, no interest)
        return acc + t.compensation.totalApproved + interest + supplementary;
    }, 0);
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col animate-fade-in">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-medium text-black tracking-tight">Pipeline</h2>
          <p className="text-sm font-medium text-slate-500 mt-1">Theo dõi trạng thái hồ sơ theo thời gian thực</p>
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => {
          const items = transactions.filter(t => t.status === col.id);
          const totalAmount = calculateTotal(items, col.id as TransactionStatus);

          return (
            <div key={col.id} className="flex-none w-96 flex flex-col">
               <div className="flex items-center justify-between mb-3 px-1">
                 <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-sm ${col.color}`}></div>
                    <span className="text-sm font-bold text-slate-800">{col.title}</span>
                    <span className="text-xs font-bold bg-slate-200 text-slate-700 border border-slate-300 px-2 py-0.5 rounded-full">{items.length}</span>
                 </div>
               </div>
               
               <div className="bg-white/30 backdrop-blur-sm rounded-2xl p-2 h-full border border-slate-300 overflow-y-auto">
                  <div className="text-[10px] font-bold text-slate-600 text-right mb-2 px-2 uppercase tracking-wide">
                     Tổng: <span className="font-bold text-slate-900 text-xs ml-1">{formatCurrency(totalAmount)}</span>
                  </div>
                  
                  <div className="space-y-3">
                    {items.map((t) => (
                      <div 
                        key={t.id}
                        onClick={() => onTransactionClick(t)}
                        className="bg-white p-4 rounded-xl shadow-sm border border-slate-300 hover:shadow-md hover:border-slate-400 transition-all cursor-pointer group"
                      >
                         <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-mono font-bold text-slate-500">#{t.id}</span>
                            <QrCode size={14} className="text-slate-400 group-hover:text-slate-600" />
                         </div>
                         <h4 className="text-sm font-bold text-slate-900 mb-0.5 group-hover:text-indigo-700 transition-colors">{t.household.name}</h4>
                         <p className="text-xs font-semibold text-slate-600 mb-3 truncate">{t.household.address}</p>
                         <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                            <span className="text-[11px] font-semibold text-slate-500">Giá trị</span>
                            <span className="text-xs font-bold text-indigo-700">{formatCurrency(t.compensation.totalApproved)}</span>
                         </div>
                      </div>
                    ))}
                  </div>
               </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
