
import React from 'react';
import { TransactionStatus } from '../types';

interface StatusBadgeProps {
  status: TransactionStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  let badgeStyles = '';
  let dotStyles = '';

  switch (status) {
    case TransactionStatus.DISBURSED:
      badgeStyles = 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-[0_2px_10px_-3px_rgba(16,185,129,0.15)]';
      dotStyles = 'bg-emerald-500';
      break;
    case TransactionStatus.PENDING:
      badgeStyles = 'bg-amber-50 text-amber-700 border-amber-200 shadow-[0_2px_10px_-3px_rgba(245,158,11,0.15)]';
      dotStyles = 'bg-amber-500';
      break;
    case TransactionStatus.HOLD:
      badgeStyles = 'bg-rose-50 text-rose-700 border-rose-200 shadow-[0_2px_10px_-3px_rgba(244,63,94,0.15)]';
      dotStyles = 'bg-rose-500';
      break;
    default:
      badgeStyles = 'bg-slate-100 text-slate-700 border-slate-200';
      dotStyles = 'bg-slate-400';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap min-w-[110px] justify-center transition-all ${badgeStyles}`}>
      <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${dotStyles}`} />
      {status}
    </span>
  );
};
