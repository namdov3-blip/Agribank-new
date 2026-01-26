import { VercelRequest, VercelResponse } from '@vercel/node';
import connectDB from '../../../../lib/mongodb';
import { Transaction, Project, BankTransaction, AuditLog, Settings } from '../../../../lib/models';
import { verifyQRToken, authMiddleware } from '../../../../lib/auth';
import { toZonedTime } from 'date-fns-tz';

const VN_TIMEZONE = 'Asia/Ho_Chi_Minh';

// Helper: Get current date/time in VN timezone
const getVNNow = (): Date => {
  return toZonedTime(new Date(), VN_TIMEZONE);
};

// Helper: Convert date to VN timezone and get start of day
const getVNStartOfDay = (date: Date | string): Date => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const vnDate = toZonedTime(d, VN_TIMEZONE);
  vnDate.setHours(0, 0, 0, 0);
  return vnDate;
};

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function calculateInterest(
    principal: number,
    annualRate: number,
    startDate: Date | string | undefined,
    endDate: Date
): number {
    if (!startDate) return 0;
    // Simplified logic matching agribank-crm (no VN timezone handling)
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    const timeDiff = end.getTime() - start.getTime();
    const days = Math.floor(timeDiff / (1000 * 3600 * 24));
    if (days <= 0) return 0;
    const dailyRate = annualRate / 100 / 365;
    return Math.round(principal * dailyRate * days);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // No auth required for QR verification - public access allowed
        await connectDB();

        const token = req.query.token || req.query.id || (req as any).params?.token;
        if (!token || typeof token !== 'string') {
            return res.status(400).json({ error: 'Token is required' });
        }

        // Verify token
        const payload = verifyQRToken(token);
        if (!payload) {
            return res.status(400).json({ error: 'Token không hợp lệ hoặc đã hết hạn' });
        }

        const { transactionId } = payload;

        const transaction = await (Transaction as any).findById(transactionId);
        if (!transaction) {
            return res.status(404).json({ error: 'Không tìm thấy giao dịch' });
        }

        // GET - Just return transaction info
        if (req.method === 'GET') {
            const project = await (Project as any).findById(transaction.projectId);
            const settings = await (Settings as any).findOne({ key: 'global' }) || { interestRate: 6.5 };
            const interestRate = settings.interestRate;

            // Use disbursementDate if set, otherwise use today (VN timezone)
            const now = getVNNow();
            const interestEndDate = transaction.disbursementDate 
                ? getVNStartOfDay(transaction.disbursementDate)
                : getVNStartOfDay(now);
            
            const baseDate = transaction.effectiveInterestDate || project?.interestStartDate;
            const baseDateVN = baseDate ? getVNStartOfDay(baseDate) : null;
            
            if (!baseDateVN) {
                return res.status(400).json({ error: 'Không có ngày bắt đầu tính lãi' });
            }
            
            const interest = calculateInterest(
                transaction.compensation.totalApproved,
                interestRate,
                baseDateVN,
                interestEndDate
            );
            const supplementary = transaction.supplementaryAmount || 0;
            const totalAmount = transaction.compensation.totalApproved + interest + supplementary;

            return res.status(200).json({
                success: true,
                data: {
                    transactionId,
                    household: transaction.household.name,
                    cccd: transaction.household.cccd,
                    projectCode: project?.code,
                    projectName: project?.name,
                    status: transaction.status,
                    principal: transaction.compensation.totalApproved,
                    interest,
                    supplementary,
                    totalAmount,
                    canConfirm: transaction.status !== 'Đã giải ngân'
                }
            });
        }

        // POST - Confirm the transaction
        if (req.method === 'POST') {
            if (transaction.status === 'Đã giải ngân') {
                return res.status(400).json({ error: 'Giao dịch đã được giải ngân trước đó' });
            }

            const { confirmedBy } = req.body; // Name of person confirming

            const project = await (Project as any).findById(transaction.projectId);
            const settings = await (Settings as any).findOne({ key: 'global' }) || { interestRate: 6.5 };
            const interestRate = settings.interestRate;

            const now = getVNNow();
            const baseDate = transaction.effectiveInterestDate || project?.interestStartDate;
            const baseDateVN = baseDate ? getVNStartOfDay(baseDate) : null;
            
            if (!baseDateVN) {
                return res.status(400).json({ error: 'Không có ngày bắt đầu tính lãi' });
            }
            
            const interest = calculateInterest(
                transaction.compensation.totalApproved,
                interestRate,
                baseDateVN,
                getVNStartOfDay(now)
            );
            const supplementary = transaction.supplementaryAmount || 0;
            const totalFinal = transaction.compensation.totalApproved + interest + supplementary;

            // Get current bank balance for this organization
            const org = project?.organization;
            if (!org) {
                return res.status(400).json({ error: 'Không tìm thấy thông tin tổ chức của dự án' });
            }

            const lastBankTx = await (BankTransaction as any).findOne({ organization: org }).sort({ _id: -1 });
            const settingsForBalance = await (Settings as any).findOne({ key: 'global' });
            const openingBalance = settingsForBalance?.bankOpeningBalance || 0;
            const currentBalance = lastBankTx?.runningBalance || openingBalance;

            // Create withdrawal (store as UTC, but use VN timezone for calculation)
            const nowUTC = new Date();
            await (BankTransaction as any).create({
                type: 'Rút tiền',
                amount: -totalFinal,
                date: nowUTC,
                note: `Chi trả qua QR: ${project?.code} - Hộ: ${transaction.household.name}`,
                createdBy: confirmedBy || 'QR Scan',
                runningBalance: currentBalance - totalFinal,
                organization: org
            });


            // Update transaction (store as UTC, but use VN timezone for calculation)
            transaction.status = 'Đã giải ngân';
            transaction.disbursementDate = nowUTC;
            transaction.disbursedTotal = totalFinal; // Store the exact amount for refund
            transaction.history.push({
                timestamp: now,
                action: 'Xác nhận chi trả qua QR',
                details: `Giải ngân qua quét mã QR. Tổng: ${formatCurrency(totalFinal)}`,
                totalAmount: totalFinal,
                actor: confirmedBy || 'QR Scan'
            });

            await transaction.save();

            await (AuditLog as any).create({
                actor: confirmedBy || 'QR Scan',
                role: 'QR Confirmation',
                action: 'Xác nhận chi trả qua QR',
                target: `Giao dịch ${transaction._id}`,
                details: `Giải ngân ${formatCurrency(totalFinal)} cho hộ ${transaction.household.name} qua mã QR`
            });

            return res.status(200).json({
                success: true,
                message: 'Xác nhận giao dịch thành công',
                data: {
                    transactionId,
                    household: transaction.household.name,
                    totalAmount: totalFinal,
                    disbursementDate: now
                }
            });
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (error: any) {
        console.error('Confirm error:', error);
        return res.status(500).json({ error: 'Lỗi xác nhận: ' + error.message });
    }
}
