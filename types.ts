
export enum TransactionStatus {
  PENDING = 'Chưa giải ngân',
  DISBURSED = 'Đã giải ngân',
  HOLD = 'Tồn đọng/Giữ hộ'
}

export enum BankTransactionType {
  DEPOSIT = 'Nạp tiền',
  WITHDRAW = 'Rút tiền',
  ADJUSTMENT = 'Điều chỉnh'
}

export interface BankTransaction {
  id: string;
  _id?: string;
  type: BankTransactionType;
  amount: number; // Signed: positive for deposit/adjust-up, negative for withdraw/adjust-down
  date: string;
  note: string;
  createdBy: string;
  runningBalance: number;
}

export interface BankAccount {
  openingBalance: number;
  currentBalance: number;
  reconciledBalance: number; // For manual bank statement matching
}

export enum InterestMode {
  DAILY = 'Theo ngày',
  MONTHLY = 'Theo tháng'
}

export enum InterestBase {
  RECONCILED = 'Số dư đối soát',
  PENDING_ONLY = 'Tiền chưa giải ngân'
}

export interface BankInterestSettings {
  mode: InterestMode;
  annualRate: number;
  startDate: string;
  calculationBase: InterestBase;
  updatedBy: string;
  updatedAt: string;
}

export interface TransactionLog {
  timestamp: string;
  action: string;
  details: string;
  totalAmount?: number;
  actor?: string;
}

export interface Household {
  id: string;
  name: string;
  cccd: string;
  address: string;
  landOrigin: string;
  landArea: number;
  decisionNumber: string;
  decisionDate: string;
}

export interface CompensationDetails {
  landAmount: number;
  assetAmount: number;
  houseAmount: number;
  supportAmount: number;
  totalApproved: number;
}

export interface Transaction {
  id: string;
  _id?: string;
  projectId: string;
  household: Household;
  compensation: CompensationDetails;
  status: TransactionStatus;
  disbursementDate?: string;
  effectiveInterestDate?: string;
  paymentType?: string; // Loại chi trả
  notes?: string;
  history?: TransactionLog[];
  supplementaryAmount?: number; // Số tiền bổ sung
  supplementaryNote?: string; // Ghi chú tiền bổ sung
  stt?: string | number;
}

export interface Project {
  id: string;
  _id?: string;
  code: string;
  name: string;
  location: string;
  totalBudget: number;
  startDate: string;
  uploadDate?: string;
  interestStartDate?: string;
  status: 'Active' | 'Completed' | 'Planning';
}

export interface User {
  id: string;
  name: string;
  role: 'SuperAdmin' | 'Admin' | 'User1' | 'User2' | 'PMB';
  avatar: string;
  permissions: string[];
  password?: string;
  organization?: 'Đông Anh' | 'Phúc Thịnh' | 'Thiên Lộc' | 'Thư Lâm' | 'Vĩnh Thanh' | 'Nam World';
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  target: string;
  details: string;
}

export interface InterestHistoryLog {
  timestamp: string;
  oldRate: number;
  newRate: number;
  actor: string;
}
