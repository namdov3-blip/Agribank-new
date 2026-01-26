
import { Transaction, Project, TransactionStatus, AuditLogItem } from '../types';
// Import date-fns-tz functions (v3 uses toZonedTime and fromZonedTime)
import { toZonedTime, fromZonedTime, format as formatTz } from 'date-fns-tz';

// Timezone constant for Vietnam
export const VN_TIMEZONE = 'Asia/Ho_Chi_Minh';

// Helper: Get current date/time in VN timezone
export const getVNNow = (): Date => {
  return toZonedTime(new Date(), VN_TIMEZONE);
};

// Helper: Convert date to VN timezone
export const toVNTime = (date: Date | string): Date => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return toZonedTime(d, VN_TIMEZONE);
};

// Helper: Convert VN timezone date to UTC for storage
export const fromVNTime = (date: Date | string): Date => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return fromZonedTime(d, VN_TIMEZONE);
};

// Helper: Get start of day in VN timezone
export const getVNStartOfDay = (date?: Date | string): Date => {
  const d = date ? (typeof date === 'string' ? new Date(date) : date) : getVNNow();
  const vnDate = toVNTime(d);
  vnDate.setHours(0, 0, 0, 0);
  return vnDate;
};

// Helper: Get end of day in VN timezone
export const getVNEndOfDay = (date?: Date | string): Date => {
  const d = date ? (typeof date === 'string' ? new Date(date) : date) : getVNNow();
  const vnDate = toVNTime(d);
  vnDate.setHours(23, 59, 59, 999);
  return vnDate;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

// Format number with comma separator (for input display)
export const formatNumberWithComma = (value: number | string): string => {
  if (value === '' || value === null || value === undefined) return '';
  const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
  if (isNaN(num)) return '';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// Parse number from string with comma separator
export const parseNumberFromComma = (value: string): number => {
  if (!value) return 0;
  const cleaned = value.replace(/,/g, '').trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

export const calculateInterest = (principal: number, ratePerYear: number, baseDateStr?: any, endDate: Date = getVNNow()): number => {
  if (!baseDateStr) return 0;

  // Quy tắc:
  // - Bắt đầu đếm từ chính "Ngày GN" (baseDate) lúc 00:00 VN timezone.
  // - Mỗi lần qua thêm 1 mốc 00:00 tiếp theo thì cộng thêm 1 ngày lãi.

  // Handle different date input types
  let baseDate: Date;
  if (baseDateStr instanceof Date) {
    baseDate = new Date(baseDateStr);
  } else if (typeof baseDateStr === 'object') {
    // Invalid object, return 0
    return 0;
  } else {
    baseDate = new Date(baseDateStr);
  }

  // Validate baseDate
  if (isNaN(baseDate.getTime())) return 0;

  // Convert to VN timezone and reset to start of day (00:00:00 VN time)
  const baseDateVN = getVNStartOfDay(baseDate);
  const endDateVN = getVNStartOfDay(endDate);

  const timeDiff = endDateVN.getTime() - baseDateVN.getTime();
  const days = Math.floor(timeDiff / (1000 * 3600 * 24));

  // Nếu chưa qua mốc 00:00 nào sau baseDate thì chưa có lãi
  if (days <= 0) return 0;

  // Formula: Principal * (Rate / 365) * Days
  const dailyRate = (ratePerYear / 100) / 365;
  return Math.round(principal * dailyRate * days);
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const date = toVNTime(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Format date to dd/mm/yyyy (used for display only)
export const formatDateDisplay = (dateString?: string): string => {
  if (!dateString) return '---';
  const d = toVNTime(dateString);
  if (isNaN(d.getTime())) return dateString;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

// Format date for print receipt: "Ngày 01 tháng 01 năm 2025"
export const formatDateForPrint = (dateString: string): string => {
  if (!dateString) return '';
  const date = toVNTime(dateString);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return `Ngày ${day} tháng ${month} năm ${year}`;
};

// Convert number to Vietnamese words
export const numberToVietnameseWords = (num: number): string => {
  if (num === 0) return 'không';

  const ones = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  const tens = ['', '', 'hai mươi', 'ba mươi', 'bốn mươi', 'năm mươi', 'sáu mươi', 'bảy mươi', 'tám mươi', 'chín mươi'];
  const hundreds = ['', 'một trăm', 'hai trăm', 'ba trăm', 'bốn trăm', 'năm trăm', 'sáu trăm', 'bảy trăm', 'tám trăm', 'chín trăm'];

  const readGroup = (n: number, isLastGroup: boolean = false): string => {
    if (n === 0) return '';

    let result = '';
    const hundred = Math.floor(n / 100);
    const remainder = n % 100;
    const ten = Math.floor(remainder / 10);
    const one = remainder % 10;

    if (hundred > 0) {
      result += hundreds[hundred] + ' ';
    }

    if (ten > 1) {
      result += tens[ten] + ' ';
      if (one > 0) {
        // Xử lý trường hợp đặc biệt: 5 -> "lăm" khi có hàng chục, "năm" khi không có
        if (one === 5) {
          result += 'lăm';
        } else if (one === 1 && ten > 1) {
          result += 'mốt';
        } else {
          result += ones[one];
        }
      }
    } else if (ten === 1) {
      result += one === 0 ? 'mười' : `mười ${one === 5 ? 'lăm' : ones[one]}`;
    } else if (one > 0) {
      result += ones[one];
    }

    return result.trim();
  };

  if (num < 1000) {
    return readGroup(num, true);
  }

  const millions = Math.floor(num / 1000000);
  const thousands = Math.floor((num % 1000000) / 1000);
  const remainder = num % 1000;

  let result = '';

  if (millions > 0) {
    result += readGroup(millions) + ' triệu ';
  }

  if (thousands > 0) {
    if (thousands < 10 && millions > 0) {
      result += 'không trăm ';
    }
    result += readGroup(thousands) + ' nghìn ';
  } else if (millions > 0 && remainder > 0) {
    result += 'không nghìn ';
  }

  if (remainder > 0) {
    if (remainder < 100 && (millions > 0 || thousands > 0)) {
      result += 'không trăm ';
    }
    result += readGroup(remainder, true);
  }

  return result.trim();
};

// Format currency amount to Vietnamese words
export const formatCurrencyToWords = (amount: number): string => {
  const words = numberToVietnameseWords(amount);
  const capitalized = words.charAt(0).toUpperCase() + words.slice(1);
  return `${capitalized} đồng`;
};

// --- EXPORT FUNCTIONS ---

const downloadCSV = (content: string, fileName: string) => {
  // Add BOM (Byte Order Mark) for UTF-8 so Excel opens it correctly with Vietnamese characters
  const bom = '\uFEFF';
  const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportTransactionsToExcel = (transactions: Transaction[], projects: Project[], interestRate: number) => {
  // 1. Calculate Stats for ALL transactions (Total)
  const uniqueProjects = new Set(transactions.map(t => t.projectId)).size;
  const disbursedItems = transactions.filter(t => t.status === TransactionStatus.DISBURSED);
  const notDisbursedItems = transactions.filter(t => t.status !== TransactionStatus.DISBURSED);

  // Helper to calculate total payout (approved + interest + supplementary)
  const calculateTotalPayout = (t: Transaction) => {
    const project = projects.find(p => p.id === t.projectId);
    const baseDate = t.effectiveInterestDate || project?.interestStartDate;
    let interest = 0;

    if (t.status === TransactionStatus.DISBURSED && t.disbursementDate) {
      // Đã giải ngân: tính lãi đến ngày giải ngân thực tế
      interest = calculateInterest(t.compensation.totalApproved, interestRate, baseDate, new Date(t.disbursementDate));
    } else if (t.status !== TransactionStatus.DISBURSED) {
      // Chưa giải ngân (PENDING + HOLD): tính lãi đến ngày hiện tại
      interest = calculateInterest(t.compensation.totalApproved, interestRate, baseDate, new Date());
    }
    const supplementary = t.supplementaryAmount || 0;
    return t.compensation.totalApproved + interest + supplementary;
  };

  const moneyDisbursed = disbursedItems.reduce((sum, t) => sum + calculateTotalPayout(t), 0);
  const moneyNotDisbursed = notDisbursedItems.reduce((sum, t) => sum + calculateTotalPayout(t), 0);

  const totalInterest = transactions.reduce((sum, t) => {
    const project = projects.find(p => p.id === t.projectId);
    const baseDate = t.effectiveInterestDate || project?.interestStartDate;

    if (t.status === TransactionStatus.DISBURSED && t.disbursementDate) {
      return sum + calculateInterest(t.compensation.totalApproved, interestRate, baseDate, new Date(t.disbursementDate));
    } else if (t.status !== TransactionStatus.DISBURSED) {
      return sum + calculateInterest(t.compensation.totalApproved, interestRate, baseDate);
    }
    return sum;
  }, 0);

  // 2. Build CSV Content
  const rows = [];

  // --- Part A: Statistics Header (The 6 Boxes) ---
  rows.push(['BÁO CÁO TỔNG HỢP GIAO DỊCH', `Ngày xuất: ${formatTz(getVNNow(), 'dd/MM/yyyy', { timeZone: VN_TIMEZONE })}`]);
  rows.push([]); // Empty row
  rows.push(['THỐNG KÊ TỔNG QUAN']);
  rows.push(['Tổng dự án', 'Hộ đã GN', 'Hộ chưa GN', 'Tiền đã GN (Gốc+Lãi)', 'Tiền chưa GN (Gốc+Lãi)', 'Tổng lãi PS']);
  rows.push([
    uniqueProjects,
    disbursedItems.length,
    notDisbursedItems.length,
    moneyDisbursed,
    moneyNotDisbursed,
    totalInterest
  ]);
  rows.push([]); // Empty row
  rows.push([]); // Empty row

  // --- Part B: Details Table ---
  rows.push(['DANH SÁCH CHI TIẾT']);
  rows.push([
    'STT',
    'Mã GD',
    'Mã Hộ Dân',
    'Mã Dự Án',
    'Tên Dự Án',
    'Họ và tên',
    'CCCD/CMND',
    'Địa chỉ',
    'Số Quyết định',
    'Ngày QĐ',
    'Ngày GN/Tính lãi',
    'Tổng phê duyệt',
    'Lãi phát sinh',
    'Tiền bổ sung',
    'Tổng thực nhận',
    'Trạng thái'
  ]);

  transactions.forEach((t, index) => {
    const project = projects.find(p => p.id === t.projectId);

    // Calculate individual interest
    const baseDate = t.effectiveInterestDate || project?.interestStartDate;
    let currentInterest = 0;
    if (t.status === TransactionStatus.DISBURSED && t.disbursementDate) {
      currentInterest = calculateInterest(t.compensation.totalApproved, interestRate, baseDate, new Date(t.disbursementDate));
    } else if (t.status === TransactionStatus.HOLD) {
      currentInterest = calculateInterest(t.compensation.totalApproved, interestRate, baseDate, new Date());
    }
    const supplementary = t.supplementaryAmount || 0;
    const totalPayout = t.compensation.totalApproved + currentInterest + supplementary;

    // Determine date display
    let displayDateStr = '';
    if (t.status === TransactionStatus.DISBURSED && t.disbursementDate) {
      displayDateStr = formatDate(t.disbursementDate);
    } else if (baseDate) {
      displayDateStr = formatDate(baseDate);
    }

    rows.push([
      t.stt || index + 1,
      t.id,
      t.household.id,
      project ? project.code : t.projectId,
      project ? project.name : '',
      t.household.name,
      `'${t.household.cccd}`, // Add ' to force string in Excel
      t.household.address,
      t.household.decisionNumber,
      formatDate(t.household.decisionDate),
      displayDateStr,
      t.compensation.totalApproved,
      currentInterest,
      supplementary,
      totalPayout,
      t.status
    ]);
  });

  // Convert arrays to CSV string
  const csvContent = rows.map(e => e.join(",")).join("\n");
  const fileName = `Bao_cao_giao_dich_${formatTz(getVNNow(), 'yyyy-MM-dd', { timeZone: VN_TIMEZONE })}.csv`;

  downloadCSV(csvContent, fileName);
};

export const exportAuditLogsToExcel = (auditLogs: AuditLogItem[]) => {
  const rows = [];
  rows.push(['NHẬT KÝ HOẠT ĐỘNG HỆ THỐNG (AUDIT LOG)', `Ngày xuất: ${formatTz(getVNNow(), 'dd/MM/yyyy', { timeZone: VN_TIMEZONE })}`]);
  rows.push([]);
  rows.push(['ID', 'Thời gian', 'Người thực hiện', 'Vai trò', 'Hành động', 'Đối tượng', 'Chi tiết']);

  // Export all logs
  auditLogs.forEach(log => {
    rows.push([
      log.id,
      formatTz(toVNTime(log.timestamp), 'dd/MM/yyyy HH:mm:ss', { timeZone: VN_TIMEZONE }),
      log.actor,
      log.role,
      log.action,
      log.target,
      `"${log.details.replace(/"/g, '""')}"` // Escape quotes for CSV
    ]);
  });

  const csvContent = rows.map(e => e.join(",")).join("\n");
  const fileName = `Audit_Log_${formatTz(getVNNow(), 'yyyy-MM-dd', { timeZone: VN_TIMEZONE })}.csv`;

  downloadCSV(csvContent, fileName);
};
