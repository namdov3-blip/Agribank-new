import { VercelRequest, VercelResponse } from '@vercel/node';
import connectDB from '../../../lib/mongodb';
import { BankTransaction, Settings, AuditLog, User } from '../../../lib/models';
import { authMiddleware } from '../../../lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const payload = await authMiddleware(req, res, ['Admin']);
        if (!payload) return;

        await connectDB();

        const { openingBalance } = req.body;

        if (openingBalance === undefined || openingBalance < 0) {
            return res.status(400).json({ error: 'Số dư mở đầu không hợp lệ' });
        }

        // Get user's organization
        const currentUser = await User.findById(payload.userId);
        const org = currentUser?.organization;
        if (!org) {
            return res.status(400).json({ error: 'Người dùng không thuộc tổ chức nào' });
        }

        // Update settings (global)
        await Settings.findOneAndUpdate(
            { key: 'global' },
            {
                $set: { bankOpeningBalance: openingBalance },
                $setOnInsert: { interestRate: 6.5, interestHistory: [] }
            },
            { upsert: true, new: true }
        );

        // Delete existing transactions for THIS organization and recalculate
        await BankTransaction.deleteMany({ organization: org });

        // Create initial deposit if opening balance > 0
        if (openingBalance > 0) {
            await BankTransaction.create({
                type: 'Điều chỉnh',
                amount: openingBalance,
                date: new Date(),
                note: 'Thiết lập số dư mở đầu',
                createdBy: payload.name,
                runningBalance: openingBalance,
                organization: org
            });
        }

        await AuditLog.create({
            actor: payload.name,
            role: payload.role,
            action: 'Điều chỉnh số dư mở đầu',
            target: 'Tài khoản ngân hàng',
            details: `Thiết lập số dư mở đầu: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(openingBalance)}`
        });

        return res.status(200).json({
            success: true,
            message: 'Đã cập nhật số dư mở đầu',
            data: { openingBalance }
        });

    } catch (error: any) {
        console.error('Adjust opening error:', error);
        return res.status(500).json({ error: 'Lỗi server: ' + error.message });
    }
}

