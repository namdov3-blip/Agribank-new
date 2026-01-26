import { VercelRequest, VercelResponse } from '@vercel/node';
import connectDB from '../../../lib/mongodb';
import { Transaction, Project, AuditLog, Settings, BankTransaction, User } from '../../../lib/models';
import { authMiddleware } from '../../../lib/auth';

function calculateInterest(
    principal: number,
    annualRate: number,
    startDate: Date | string | undefined,
    endDate: Date
): number {
    if (!startDate) return 0;
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

// Helper to format currency
function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const payload = await authMiddleware(req, res);
        if (!payload) return;

        await connectDB();

        const id = req.query.id || (req as any).params?.id;
        if (!id || typeof id !== 'string') {
            return res.status(400).json({ error: 'Transaction ID is required' });
        }

        // GET - Get transaction by ID
        if (req.method === 'GET') {
            const transaction = await (Transaction as any).findById(id)
                .populate('projectId', 'code name interestStartDate');

            if (!transaction) {
                return res.status(404).json({ error: 'Không tìm thấy giao dịch' });
            }

            const tObj = transaction.toObject ? transaction.toObject({ virtuals: true }) : transaction;
            const mapped = {
                ...tObj,
                id: (tObj.id || tObj._id || transaction._id || '').toString()
            };

            if (mapped.projectId && typeof mapped.projectId === 'object') {
                mapped.projectId = (mapped.projectId.id || mapped.projectId._id || '').toString();
            }

            return res.status(200).json({ success: true, data: mapped });
        }

        // PUT - Update transaction
        if (req.method === 'PUT') {
            const {
                household,
                compensation,
                supplementaryAmount,
                supplementaryNote,
                effectiveInterestDate,
                disbursementDate,
                notes
            } = req.body;

            const transaction = await (Transaction as any).findById(id);
            if (!transaction) {
                return res.status(404).json({ error: 'Không tìm thấy giao dịch' });
            }

            // Update fields
            if (household) {
                transaction.household = { ...transaction.household, ...household };
            }
            if (compensation) {
                transaction.compensation = { ...transaction.compensation, ...compensation };
            }
            if (supplementaryAmount !== undefined) {
                transaction.supplementaryAmount = supplementaryAmount;
            }
            if (supplementaryNote !== undefined) {
                transaction.supplementaryNote = supplementaryNote;
            }
            if (effectiveInterestDate) {
                transaction.effectiveInterestDate = new Date(effectiveInterestDate);
            }
            if (disbursementDate !== undefined) {
                // Accept both ISO strings and yyyy-mm-dd
                transaction.disbursementDate = disbursementDate ? new Date(disbursementDate) : undefined;
            }
            if (notes !== undefined) {
                transaction.notes = notes;
            }

            // If transaction already disbursed, keep disbursedTotal in sync when disbursement date changes
            // so totals across app are consistent.
            if (disbursementDate !== undefined && transaction.status === 'Đã giải ngân') {
                const project = await (Project as any).findById(transaction.projectId);
                const settings = await (Settings as any).findOne({ key: 'global' }) || { interestRate: 6.5 };
                const interestRate = settings.interestRate ?? 6.5;
                const baseDate = transaction.effectiveInterestDate || project?.interestStartDate;
                const endDate = transaction.disbursementDate ? new Date(transaction.disbursementDate) : new Date();
                const interest = calculateInterest(transaction.compensation.totalApproved, interestRate, baseDate, endDate);
                const supplementary = transaction.supplementaryAmount || 0;
                transaction.disbursedTotal = transaction.compensation.totalApproved + interest + supplementary;
            }

            // Add history
            transaction.history.push({
                timestamp: new Date(),
                action: 'Cập nhật thông tin',
                details: 'Đã cập nhật thông tin hồ sơ',
                actor: payload.name
            });

            await transaction.save();

            await (AuditLog as any).create({
                actor: payload.name,
                role: payload.role,
                action: 'Cập nhật giao dịch',
                target: `Giao dịch ${transaction._id}`,
                details: `Cập nhật hồ sơ hộ ${transaction.household.name}`
            });

            const tObj = transaction.toObject ? transaction.toObject({ virtuals: true }) : transaction;
            const mapped = {
                ...tObj,
                id: (tObj.id || tObj._id || transaction._id || '').toString()
            };

            if (mapped.projectId && typeof mapped.projectId === 'object') {
                mapped.projectId = (mapped.projectId.id || mapped.projectId._id || '').toString();
            }

            return res.status(200).json({ success: true, data: mapped });
        }

        // DELETE - Delete transaction
        if (req.method === 'DELETE') {
            const transaction = await (Transaction as any).findById(id);
            if (!transaction) {
                return res.status(404).json({ error: 'Không tìm thấy giao dịch' });
            }

            // Get project and user organization
            const project = await (Project as any).findById(transaction.projectId);
            if (!project) {
                return res.status(404).json({ error: 'Không tìm thấy dự án liên quan' });
            }

            const currentUser = await (User as any).findById(payload.userId);
            if (!currentUser || !currentUser.organization) {
                return res.status(400).json({ error: 'User must belong to an organization' });
            }

            const org = currentUser.organization;
            const transactionAmount = transaction.compensation?.totalApproved || 0;

            // Get settings for interest rate
            const settings = await (Settings as any).findOne({ key: 'global' }) || { bankOpeningBalance: 0, interestRate: 6.5 };
            const openingBalance = settings?.bankOpeningBalance || 0;
            const interestRate = settings?.interestRate || 6.5;

            // Calculate amount to subtract from bank balance
            let amountToSubtract = 0;

            if (transaction.status === 'Đã giải ngân') {
                // If transaction was disbursed, subtract the total amount that was disbursed
                // (including principal + interest + supplementary)
                amountToSubtract = (transaction as any).disbursedTotal || transactionAmount;
            } else {
                // If transaction was NOT disbursed, subtract the amount that was added when imported
                // This includes: principal + current interest + supplementary
                const baseDate = transaction.effectiveInterestDate || project?.interestStartDate;
                const currentInterest = calculateInterest(transactionAmount, interestRate, baseDate, new Date());
                const supplementary = transaction.supplementaryAmount || 0;
                amountToSubtract = transactionAmount + currentInterest + supplementary;
            }

            // Create reverse bank transaction (Rút tiền to subtract from balance)
            if (amountToSubtract > 0) {
                // Get the most recent bank transaction to get current balance
                // Use a lock-like approach: get the latest transaction's runningBalance
                // This ensures sequential calculation even if multiple deletions happen
                const lastBankTx = await (BankTransaction as any).findOne({ organization: org }).sort({ _id: -1 });
                const currentBalance = lastBankTx?.runningBalance || openingBalance;
                
                // Calculate new running balance: currentBalance + (-amountToSubtract)
                // Since amount will be stored as negative, runningBalance = currentBalance - amountToSubtract
                const newRunningBalance = currentBalance - amountToSubtract;
                
                // Store amount as negative for "Rút tiền" to match other handlers
                await (BankTransaction as any).create({
                    type: 'Rút tiền',
                    amount: -amountToSubtract, // Negative amount for withdrawal
                    date: new Date(),
                    note: `Trừ tiền do xóa giao dịch ${transaction.household?.name || 'N/A'} (${transaction._id}). ${transaction.status === 'Đã giải ngân' ? 'Đã giải ngân' : 'Chưa giải ngân'}`,
                    createdBy: payload.name,
                    runningBalance: newRunningBalance,
                    organization: org,
                    projectId: transaction.projectId,
                    updatedAt: new Date()
                });
            }

            // Store transaction info for audit log before deletion
            const transactionInfo = {
                id: transaction._id.toString(),
                householdName: transaction.household?.name || 'N/A',
                amount: transactionAmount,
                status: transaction.status,
                projectCode: project.code
            };

            // Delete the transaction FIRST
            await (Transaction as any).deleteOne({ _id: transaction._id });

            // THEN update project totalBudget: recalculate from all remaining transactions
            const allProjectTransactions = await (Transaction as any).find({ 
                projectId: project._id
            });
            const newTotalBudget = allProjectTransactions.reduce((sum: number, t: any) => {
                return sum + (t.compensation?.totalApproved || 0);
            }, 0);
            
            project.totalBudget = newTotalBudget;
            project.updatedAt = new Date();
            await project.save();

            // Create audit log
            await (AuditLog as any).create({
                actor: payload.name,
                role: payload.role,
                action: 'Xóa giao dịch',
                target: `Giao dịch ${transactionInfo.id}`,
                details: `Đã xóa hồ sơ hộ ${transactionInfo.householdName} (${formatCurrency(transactionInfo.amount)}) từ dự án ${transactionInfo.projectCode}. Trạng thái: ${transactionInfo.status}`
            });

            return res.status(200).json({ 
                success: true, 
                message: 'Đã xóa giao dịch thành công',
                data: {
                    deletedTransactionId: transactionInfo.id,
                    newProjectTotalBudget: newTotalBudget
                }
            });
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (error: any) {
        console.error('Transaction API error:', error);
        return res.status(500).json({ error: 'Lỗi server: ' + error.message });
    }
}
