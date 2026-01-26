import { VercelRequest, VercelResponse } from '@vercel/node';
import connectDB from '../../../lib/mongodb';
import { BankTransaction, Settings, User } from '../../../lib/models';
import { ORGANIZATIONS } from '../../../lib/models/User';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        await connectDB();

        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        // 1. Get Settings
        let settings = await Settings.findOne({ key: 'global' });
        if (!settings) {
            settings = await Settings.create({ key: 'global' });
        }

        const lastAccrued = settings.lastBankInterestAccrued;
        const alreadyAccruedThisMonth = lastAccrued &&
            lastAccrued.getMonth() === currentMonth &&
            lastAccrued.getFullYear() === currentYear;

        // Skip if already processed for this month
        if (alreadyAccruedThisMonth) {
            return res.status(200).json({
                success: true,
                message: 'Lãi tháng này đã được cộng trước đó.',
                lastAccrued
            });
        }

        // Only run on or after the 1st of the month
        // (Actually, if it's the 5th and we haven't run for the 1st, we should run now)

        let accruedCount = 0;
        const results: any[] = [];

        // 2. Process for each Organization
        for (const org of ORGANIZATIONS) {
            // Find latest transaction to get current balance
            const lastTx = await BankTransaction.findOne({ organization: org }).sort({ date: -1, _id: -1 });
            const balance = lastTx?.runningBalance || 0;

            if (balance <= 0) continue;

            // Calculate interest
            const monthlyRate = settings.bankInterestRate || 0.5;
            const interestAmount = Math.round(balance * (monthlyRate / 100));

            if (interestAmount > 0) {
                // Create interest transaction
                const interestTx = await BankTransaction.create({
                    type: 'Nạp tiền',
                    amount: interestAmount,
                    date: new Date(currentYear, currentMonth, 1), // Set to the 1st of the month
                    note: `Lãi tiền gửi tháng ${currentMonth + 1}/${currentYear} (Lãi suất ${monthlyRate}%)`,
                    createdBy: 'Hệ thống tự động',
                    runningBalance: balance + interestAmount,
                    organization: org,
                    updatedAt: new Date()
                });

                results.push({
                    org,
                    balanceBefore: balance,
                    interest: interestAmount,
                    balanceAfter: balance + interestAmount
                });
                accruedCount++;
            }
        }

        // 3. Mark as accrued
        settings.lastBankInterestAccrued = today;
        await settings.save();

        return res.status(200).json({
            success: true,
            message: `Đã cộng lãi cho ${accruedCount} đơn vị`,
            details: results
        });

    } catch (error: any) {
        console.error('Interest accrual error:', error);
        return res.status(500).json({ error: 'Lỗi hệ thống: ' + error.message });
    }
}
