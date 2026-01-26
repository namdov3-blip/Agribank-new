
import React, { useState, useMemo } from 'react';
import { GlassCard } from '../components/GlassCard';
import {
  BankTransaction,
  BankTransactionType,
  BankAccount,
  User,
  Transaction,
  Project,
  TransactionStatus,
  AuditLogItem
} from '../types';
import { formatCurrency, formatDate, calculateInterest, formatNumberWithComma, parseNumberFromComma } from '../utils/helpers';
import {
  Wallet, Plus, History, AlertCircle, PiggyBank, X
} from 'lucide-react';

interface BankBalanceProps {
  transactions: Transaction[];
  projects: Project[];
  bankAccount: BankAccount;
  bankTransactions: BankTransaction[];
  interestRate: number;
  currentUser: User;
  onAddBankTransaction: (type: BankTransactionType, amount: number, note: string, date: string) => void;
  onAdjustOpeningBalance: (amount: number) => void;
  setAuditLogs: React.Dispatch<React.SetStateAction<AuditLogItem[]>>;
}

export const BankBalance: React.FC<BankBalanceProps> = ({
  transactions,
  projects,
  bankAccount,
  bankTransactions,
  interestRate,
  onAddBankTransaction,
  currentUser,
  setAuditLogs,
}) => {
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);

  const [txType, setTxType] = useState<BankTransactionType>(BankTransactionType.DEPOSIT);
  const [txAmount, setTxAmount] = useState('');
  const [txNote, setTxNote] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);

  // --- TÍNH TỔNG GỐC, LÃI TẠM TÍNH & TIỀN BỔ SUNG ---
  // Tính từ các giao dịch CHƯA giải ngân (PENDING + HOLD) để khớp với "Tiền chưa GN"
  // Khi giải ngân, các giá trị này sẽ tự động giảm đi
  const pendingData = useMemo(() => {
    if (transactions.length === 0) return { principal: 0, interest: 0, supplementary: 0, locked: 0 };

    let principal = 0; // Tổng gốc của các giao dịch chưa giải ngân
    let tempInterest = 0; // Lãi tạm tính (chưa giải ngân)
    let lockedInterest = 0; // Lãi đã chốt (đã giải ngân)
    let supplementaryAmount = 0; // Tổng tiền bổ sung từ các giao dịch chưa giải ngân

    transactions.forEach(t => {
      const project = projects.find(p => p.id === t.projectId);
      const baseDate = t.effectiveInterestDate || project?.interestStartDate;

      if (t.status === TransactionStatus.DISBURSED && t.disbursementDate) {
        // Lãi đã chốt - prefer disbursedTotal for accuracy (matching Dashboard logic)
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
        // Tổng gốc của các giao dịch chưa giải ngân
        principal += t.compensation.totalApproved;
        // Lãi tạm tính (chỉ từ các giao dịch chưa giải ngân)
        tempInterest += calculateInterest(t.compensation.totalApproved, interestRate, baseDate, new Date());
        // Tiền bổ sung từ các giao dịch chưa giải ngân
        supplementaryAmount += t.supplementaryAmount || 0;
      }
    });

    const finalLocked = Math.round(lockedInterest);
    const finalInterest = Math.round(tempInterest);

    return {
      principal, // Tổng gốc chưa giải ngân
      interest: finalInterest, // Lãi tạm tính
      locked: finalLocked, // Lãi đã chốt (để tham khảo)
      supplementary: supplementaryAmount // Tổng tiền bổ sung chưa giải ngân
    };
  }, [transactions, projects, interestRate, bankAccount.currentBalance]);

  const handleTxSubmit = () => {
    const amountNum = parseNumberFromComma(txAmount);
    if (isNaN(amountNum) || amountNum <= 0) return alert('Số tiền không hợp lệ');
    const finalAmount = txType === BankTransactionType.WITHDRAW ? -amountNum : amountNum;
    const now = new Date();

    // Lưu audit log
    setAuditLogs(prev => [...prev, {
      id: `audit-${Date.now()}`,
      timestamp: now.toISOString(),
      actor: currentUser.name,
      role: currentUser.role,
      action: txType === BankTransactionType.DEPOSIT ? 'Nạp tiền' : 'Rút tiền',
      target: 'Giao dịch dòng tiền',
      details: `${txType === BankTransactionType.DEPOSIT ? 'Nạp' : 'Rút'} ${formatCurrency(Math.abs(finalAmount))}${txNote ? ` - ${txNote}` : ''}`
    }]);

    onAddBankTransaction(txType, finalAmount, txNote, txDate);
    setIsTxModalOpen(false);
    setTxAmount(''); setTxNote('');
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Cho phép xóa hết hoặc nhập số với dấu phẩy
    if (value === '') {
      setTxAmount('');
      return;
    }
    // Loại bỏ tất cả ký tự không phải số và dấu phẩy
    const cleaned = value.replace(/[^\d,]/g, '');
    // Format với dấu phẩy
    const formatted = formatNumberWithComma(cleaned);
    setTxAmount(formatted);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex justify-between items-end pb-2">
        <div>
          <h2 className="text-2xl font-medium text-black tracking-tight">Số dư tài khoản</h2>
          <p className="text-sm font-medium text-slate-500 mt-1">Đối soát & Theo dõi dòng tiền thực tế</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard className="relative overflow-hidden border-blue-400 bg-blue-50/40">
          <div className="absolute -right-4 -top-4 text-blue-100 opacity-50">
            <Wallet size={120} strokeWidth={0.5} />
          </div>
          <h3 className="text-[11px] font-bold text-blue-700 uppercase tracking-widest mb-1">Số dư hiện tại</h3>
          <p className="text-2xl font-bold text-slate-900 tracking-tight">{formatCurrency(pendingData.principal + pendingData.interest + pendingData.supplementary)}</p>
          <p className="text-[10px] font-medium text-blue-600 mt-2">Bằng tiền chưa GN (gốc + lãi + bổ sung của các giao dịch chưa giải ngân)</p>
        </GlassCard>


        <GlassCard className="relative overflow-hidden border-emerald-300 bg-emerald-50/30">
          <h3 className="text-[11px] font-bold text-emerald-700 uppercase tracking-widest mb-1">Lãi tạm tính</h3>
          <p className="text-2xl font-bold text-emerald-600 tracking-tight">{formatCurrency(pendingData.interest)}</p>
          {pendingData.locked > 0 && (
            <p className="text-[10px] font-medium text-slate-500 mt-1">Đã chốt: {formatCurrency(pendingData.locked)}</p>
          )}
        </GlassCard>
      </div>

      <div className="flex flex-col">
        <GlassCard className="p-0 overflow-hidden border-slate-200 flex flex-col h-[650px]">
          <div className="p-5 border-b border-slate-200 bg-white/50 backdrop-blur-md flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <History size={16} /> Lịch sử giao dịch dòng tiền
            </h3>
            <button
              onClick={() => setIsTxModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all shadow-lg"
            >
              Giao dịch mới
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="text-[10px] text-slate-500 font-bold uppercase sticky top-0 bg-slate-50/90 backdrop-blur-sm z-10 border-b border-slate-200">
                <tr>
                  <th className="p-4">Ngày giao dịch</th>
                  <th className="p-4 min-w-[150px]">Loại</th>
                  <th className="p-4 text-right">Số tiền</th>
                  <th className="p-4 text-right">Số dư thực tế</th>
                  <th className="p-4">Nội dung chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bankTransactions.map((tx) => (
                  <tr key={tx.id} className={`hover:bg-slate-50 transition-colors ${tx.note.includes('Tự động') ? 'bg-blue-50/40 border-l-4 border-blue-500' : ''}`}>
                    <td className="p-4 text-xs font-bold text-slate-800">
                      {tx.note.includes('Tự động') ? '01/01/2026' : formatDate(tx.date)}
                    </td>
                    <td className="p-4 min-w-[150px]">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${tx.type === BankTransactionType.DEPOSIT ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                        {tx.type === BankTransactionType.DEPOSIT ? 'NẠP TIỀN' : 'RÚT TIỀN'}
                      </span>
                    </td>
                    <td className={`p-4 text-right font-bold text-sm ${tx.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}
                    </td>
                    <td className="p-4 text-right font-bold text-slate-900 text-sm">{formatCurrency(tx.runningBalance)}</td>
                    <td className="p-4 text-xs text-slate-600 font-medium italic">{tx.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>

      {isTxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
          <GlassCard className="w-full max-w-md bg-white p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">Giao dịch dòng tiền</h3>
              <button onClick={() => setIsTxModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                <button onClick={() => setTxType(BankTransactionType.DEPOSIT)} className={`flex-1 py-2 text-xs font-bold rounded ${txType === BankTransactionType.DEPOSIT ? 'bg-white text-emerald-600 shadow' : 'text-slate-500'}`}>NẠP TIỀN</button>
                <button onClick={() => setTxType(BankTransactionType.WITHDRAW)} className={`flex-1 py-2 text-xs font-bold rounded ${txType === BankTransactionType.WITHDRAW ? 'bg-white text-rose-600 shadow' : 'text-slate-500'}`}>RÚT TIỀN</button>
              </div>
              <input type="text" value={txAmount} onChange={handleAmountChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-lg font-bold" placeholder="Nhập số tiền (ví dụ: 1,000,000)..." inputMode="numeric" />
              <textarea value={txNote} onChange={e => setTxNote(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm h-24" placeholder="Nội dung..." />
              <button onClick={handleTxSubmit} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg">Xác nhận giao dịch</button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};
