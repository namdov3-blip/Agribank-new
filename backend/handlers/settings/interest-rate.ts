import { VercelRequest, VercelResponse } from '@vercel/node';
import connectDB from '../../../lib/mongodb';
import { Settings, AuditLog } from '../../../lib/models';
import { authMiddleware } from '../../../lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        await connectDB();

        // GET - Get current interest rate
        if (req.method === 'GET') {
            const payload = await authMiddleware(req, res);
            if (!payload) return;

            let settings = await (Settings as any).findOne({ key: 'global' });

            if (!settings) {
                settings = await (Settings as any).create({
                    key: 'global',
                    interestRate: 6.5,
                    interestHistory: [],
                    bankOpeningBalance: 0
                });
            }

            return res.status(200).json({
                success: true,
                data: {
                    interestRate: settings.interestRate,
                        bankInterestRate: settings.bankInterestRate ?? 0.5,
                    interestHistory: settings.interestHistory || []
                }
            });
        }

        // PUT - Update interest rate
        if (req.method === 'PUT') {
            const payload = await authMiddleware(req, res, ['Admin', 'SuperAdmin']);
            if (!payload) return;

            const { interestRate } = req.body;

            if (interestRate === undefined || interestRate < 0) {
                return res.status(400).json({ error: 'Lãi suất không hợp lệ' });
            }

            let settings = await (Settings as any).findOne({ key: 'global' });
            const oldRate = settings?.interestRate || 6.5;

            if (!settings) {
                settings = new Settings({
                    key: 'global',
                    interestRate,
                    interestHistory: [],
                    bankOpeningBalance: 0
                });
            }

            // Add to history
            settings.interestHistory.push({
                timestamp: new Date(),
                oldRate,
                newRate: interestRate,
                actor: payload.name
            });

            settings.interestRate = interestRate;
            await settings.save();

            await (AuditLog as any).create({
                actor: payload.name,
                role: payload.role,
                action: 'Thay đổi lãi suất',
                target: 'Cấu hình hệ thống',
                details: `Thay đổi lãi suất từ ${oldRate}% sang ${interestRate}%`
            });

            return res.status(200).json({
                success: true,
                data: {
                    interestRate: settings.interestRate,
                    bankInterestRate: settings.bankInterestRate ?? 0.5,
                    interestHistory: settings.interestHistory
                }
            });
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (error: any) {
        console.error('Settings error:', error);
        return res.status(500).json({ error: 'Lỗi server: ' + error.message });
    }
}

