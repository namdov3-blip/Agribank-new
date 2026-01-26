import { VercelRequest, VercelResponse } from '@vercel/node';
import connectDB from '../../../lib/mongodb';
import { BankTransaction, Settings, User } from '../../../lib/models';
import { authMiddleware } from '../../../lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const payload = await authMiddleware(req, res);
        if (!payload) return;

        await connectDB();

        // Get user's organization for filtering
        const currentUser = await (User as any).findById(payload.userId);
        if (!currentUser) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Build organization filter
        const orgFilter: any = {};
        const isAllOrg = payload.role === 'SuperAdmin' || currentUser.organization === 'Nam World';
        if (payload.role !== 'Admin' && !isAllOrg && currentUser.organization) {
            orgFilter.organization = currentUser.organization;
        }

        // Get settings for opening balance
        const settings = await (Settings as any).findOne({ key: 'global' });
        const openingBalance = settings?.bankOpeningBalance || 0;

        // Get last bank transaction for current balance (filtered by org)
        const lastTransaction = await (BankTransaction as any).findOne(orgFilter).sort({ _id: -1 });
        const currentBalance = lastTransaction?.runningBalance || openingBalance;

        // Calculate total deposits and withdrawals (filtered by org)
        const transactions = await (BankTransaction as any).find(orgFilter);

        let totalDeposits = 0;
        let totalWithdrawals = 0;

        transactions.forEach(tx => {
            if (tx.amount > 0) {
                totalDeposits += tx.amount;
            } else {
                totalWithdrawals += Math.abs(tx.amount);
            }
        });

        return res.status(200).json({
            success: true,
            data: {
                openingBalance,
                currentBalance,
                reconciledBalance: currentBalance, // Set reconciledBalance same as currentBalance for now
                totalDeposits,
                totalWithdrawals,
                transactionCount: transactions.length,
                organization: currentUser.organization
            }
        });

    } catch (error: any) {
        console.error('Bank balance error:', error);
        return res.status(500).json({ error: 'Lỗi server: ' + error.message });
    }
}

