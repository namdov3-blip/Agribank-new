import { VercelRequest, VercelResponse } from '@vercel/node';
import connectDB from '../../../lib/mongodb';
import { Project, Transaction, BankTransaction, AuditLog } from '../../../lib/models';
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
        const payload = await authMiddleware(req, res);
        if (!payload) return;

        // Only SuperAdmin/Admin can reset data
        if (payload.role !== 'Admin' && payload.role !== 'SuperAdmin') {
            return res.status(403).json({ error: 'Chỉ Admin/SuperAdmin mới có quyền reset dữ liệu' });
        }

        await connectDB();

        // Delete all projects, transactions, and bank transactions
        const [projectsDeleted, transactionsDeleted, bankTxDeleted] = await Promise.all([
            (Project as any).deleteMany({}),
            (Transaction as any).deleteMany({}),
            (BankTransaction as any).deleteMany({})
        ]);

        // Create audit log
        await (AuditLog as any).create({
            actor: payload.name,
            role: payload.role,
            action: 'Reset dữ liệu hệ thống',
            target: 'Toàn bộ hệ thống',
            details: `Đã xóa ${projectsDeleted.deletedCount} dự án, ${transactionsDeleted.deletedCount} giao dịch, ${bankTxDeleted.deletedCount} giao dịch ngân hàng`
        });

        return res.status(200).json({
            success: true,
            message: 'Đã reset dữ liệu thành công',
            data: {
                projectsDeleted: projectsDeleted.deletedCount,
                transactionsDeleted: transactionsDeleted.deletedCount,
                bankTransactionsDeleted: bankTxDeleted.deletedCount
            }
        });

    } catch (error: any) {
        console.error('Reset data error:', error);
        return res.status(500).json({ error: 'Lỗi server: ' + error.message });
    }
}
