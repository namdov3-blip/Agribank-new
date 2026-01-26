import React from 'react';
import { Transaction, Project, TransactionStatus, User } from '../types';
import { GlassCard } from '../components/GlassCard';
import { formatCurrency, calculateInterest, parseNumberFromComma, formatNumberWithComma, formatDateDisplay } from '../utils/helpers';
import { Calendar, Calculator, RefreshCw } from 'lucide-react';

interface InterestCalculatorProps {
  transactions: Transaction[];
  projects: Project[];
  interestRate: number;
  currentUser: User;
}

const toInputDateLocal = (d?: Date | string) => {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  // Normalize to local timezone to avoid off-by-one when using toISOString
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 10);
};

export const InterestCalculator: React.FC<InterestCalculatorProps> = ({
  transactions,
  projects,
  interestRate,
  currentUser
}) => {
  const pendingTransactions = React.useMemo(
    () => transactions.filter((t) => t.status === TransactionStatus.PENDING),
    [transactions]
  );

  const [selectedId, setSelectedId] = React.useState<string>(pendingTransactions[0]?.id || '');
  const [principalStr, setPrincipalStr] = React.useState<string>('');
  const [rate, setRate] = React.useState<number>(interestRate);
  const [fromDate, setFromDate] = React.useState<string>('');
  const [toDate, setToDate] = React.useState<string>(toInputDateLocal(new Date()));

  // Ensure selected tx always exists in the filtered list (or allow manual entry "")
  React.useEffect(() => {
    if (!pendingTransactions.length) {
      setSelectedId('');
      return;
    }
    const stillValid = pendingTransactions.some((t) => t.id === selectedId);
    if (!stillValid) setSelectedId(pendingTransactions[0].id);
  }, [pendingTransactions, selectedId]);

  const selectedTx = React.useMemo(
    () => pendingTransactions.find((t) => t.id === selectedId),
    [selectedId, pendingTransactions]
  );

  // Prefill when select tx
  React.useEffect(() => {
    if (!selectedTx) return;
    const project = projects.find((p) => p.id === selectedTx.projectId);
    const baseDate = selectedTx.effectiveInterestDate || project?.interestStartDate || selectedTx.disbursementDate;
    setFromDate(toInputDateLocal(baseDate));
    setPrincipalStr(formatNumberWithComma(selectedTx.compensation.totalApproved));
    setRate(interestRate);
  }, [selectedTx, projects, interestRate]);

  const principal = parseNumberFromComma(principalStr);
  const startDate = fromDate ? new Date(fromDate) : undefined;
  const endDate = toDate ? new Date(toDate) : new Date();
  const days = React.useMemo(() => {
    if (!startDate || !endDate) return 0;
    const s = new Date(startDate);
    const e = new Date(endDate);
    s.setHours(0, 0, 0, 0);
    e.setHours(0, 0, 0, 0);
    return Math.max(0, Math.floor((e.getTime() - s.getTime()) / (1000 * 3600 * 24)));
  }, [startDate, endDate]);

  const interest = calculateInterest(principal, rate, startDate, endDate);
  const total = principal + interest;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Tính lãi dự kiến</h2>
          <p className="text-sm text-slate-500">Tính thủ công lãi từ ngày A đến ngày B cho một giao dịch hoặc số tiền bất kỳ</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Calendar size={16} />
          <span>Người dùng: {currentUser.name}</span>
        </div>
      </div>

      <GlassCard className="p-4 border-slate-200 shadow-sm space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Chọn giao dịch</label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              {pendingTransactions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.household.name} - {t.household.id} - {formatCurrency(t.compensation.totalApproved)}
                </option>
              ))}
              <option value="">(Nhập tay, không chọn giao dịch)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Số tiền (gốc)</label>
            <input
              value={principalStr}
              onChange={(e) => setPrincipalStr(formatNumberWithComma(e.target.value))}
              placeholder="Nhập số tiền"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Từ ngày</label>
            <input
              type="date"
              lang="vi"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Đến ngày</label>
            <input
              type="date"
              lang="vi"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Lãi suất (%/năm)</label>
            <input
              type="number"
              value={rate}
              min={0}
              step={0.01}
              onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center text-xs text-slate-500">
          <RefreshCw size={14} />
          <span>Tự động cập nhật khi bạn thay đổi số tiền, ngày hoặc lãi suất.</span>
          {days > 0 && <span className="font-semibold text-slate-700">Số ngày tính lãi: {days} ngày</span>}
        </div>
      </GlassCard>

      <div className="grid md:grid-cols-3 gap-4">
        <GlassCard className="p-4 border-slate-200 shadow-sm">
          <p className="text-xs uppercase font-bold text-slate-500 mb-1">Gốc</p>
          <p className="text-xl font-bold text-slate-900">{formatCurrency(principal)}</p>
        </GlassCard>

        <GlassCard className="p-4 border-slate-200 shadow-sm">
          <p className="text-xs uppercase font-bold text-slate-500 mb-1">Lãi dự kiến</p>
          <p className="text-xl font-bold text-emerald-700">{formatCurrency(interest)}</p>
          <p className="text-[11px] text-slate-500 mt-1">Từ {formatDateDisplay(fromDate)} đến {formatDateDisplay(toDate)}</p>
        </GlassCard>

        <GlassCard className="p-4 border-slate-200 shadow-sm bg-blue-50/50">
          <p className="text-xs uppercase font-bold text-blue-700 mb-1 flex items-center gap-1"><Calculator size={14} /> Tổng gốc + lãi</p>
          <p className="text-xl font-bold text-blue-900">{formatCurrency(total)}</p>
        </GlassCard>
      </div>
    </div>
  );
};

