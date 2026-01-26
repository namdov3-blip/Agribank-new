import { VercelRequest, VercelResponse } from '@vercel/node';
import connectDB from '../../../lib/mongodb';
import { Settings, AuditLog } from '../../../lib/models';
import { authMiddleware } from '../../../lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'PUT') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        await connectDB();

        const payload = await authMiddleware(req, res, ['Admin', 'SuperAdmin']);
        if (!payload) return;

        const { bankInterestRate } = req.body;

        if (bankInterestRate === undefined || bankInterestRate < 0) {
            return res.status(400).json({ error: 'Lãi suất ngân hàng không hợp lệ' });
        }

        let settings = await (Settings as any).findOne({ key: 'global' });
        const oldRate = settings?.bankInterestRate ?? 0.5;

        if (!settings) {
            settings = new Settings({
                key: 'global',
                interestRate: 6.5,
                interestHistory: [],
                bankOpeningBalance: 0,
                bankInterestRate
            });
        }

        settings.bankInterestRate = bankInterestRate;
        await settings.save();

        await (AuditLog as any).create({
            actor: payload.name,
            role: payload.role,
            action: 'Thay đổi lãi suất ngân hàng',
            target: 'Cấu hình hệ thống',
            details: `Thay đổi lãi suất ngân hàng từ ${oldRate}% sang ${bankInterestRate}%`
        });

        return res.status(200).json({
            success: true,
            data: {
                bankInterestRate: settings.bankInterestRate
            }
        });
    } catch (error: any) {
        console.error('Bank interest rate error:', error);
        return res.status(500).json({ error: 'Lỗi server: ' + error.message });
    }
}

