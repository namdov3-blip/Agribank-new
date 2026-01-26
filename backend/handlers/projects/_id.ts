import { VercelRequest, VercelResponse } from '@vercel/node';
import connectDB from '../../../lib/mongodb';
import { Project, Transaction, BankTransaction, AuditLog } from '../../../lib/models';
import { authMiddleware } from '../../../lib/auth';

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

        let id = req.query.id || (req as any).params?.id;
        console.log(`[PROJECT_HANDLER] Method: ${req.method}, ID source: ${req.query.id ? 'query' : 'params'}, ID value: ${id}`);

        // Robust ID extraction (handle array or string)
        if (Array.isArray(id)) {
            id = id[0];
        }

        if (!id || typeof id !== 'string') {
            console.error('[PROJECT_HANDLER] ID missing or invalid! Full Query:', req.query, 'Full Params:', (req as any).params);
            return res.status(400).json({ error: 'Project ID is required' });
        }

        // GET - Get project by ID
        if (req.method === 'GET') {
            const project = await (Project as any).findById(id);
            if (!project) {
                return res.status(404).json({ error: 'Không tìm thấy dự án' });
            }

            // Get related transactions
            const transactions = await (Transaction as any).find({ projectId: id });

            const projectObj = project.toObject ? project.toObject({ virtuals: true }) : project;
            const mappedTransactions = transactions.map((t: any) => {
                const obj = t.toObject ? t.toObject({ virtuals: true }) : t;
                return {
                    ...obj,
                    id: (obj.id || obj._id || t._id || '').toString()
                };
            });

            return res.status(200).json({
                success: true,
                data: {
                    project: {
                        ...projectObj,
                        id: (projectObj.id || projectObj._id || id).toString()
                    },
                    transactions: mappedTransactions
                }
            });
        }

        // PUT - Update project
        if (req.method === 'PUT') {
            const { code, name, location, totalBudget, interestStartDate, status } = req.body;

            const project = await (Project as any).findByIdAndUpdate(
                id,
                {
                    ...(code && { code }),
                    ...(name && { name }),
                    ...(location !== undefined && { location }),
                    ...(totalBudget !== undefined && { totalBudget }),
                    ...(interestStartDate && { interestStartDate: new Date(interestStartDate) }),
                    ...(status && { status })
                },
                { new: true }
            );

            if (!project) {
                return res.status(404).json({ error: 'Không tìm thấy dự án' });
            }

            await (AuditLog as any).create({
                actor: payload.name,
                role: payload.role,
                action: 'Cập nhật dự án',
                target: `Dự án ${project.code}`,
                details: `Đã cập nhật thông tin dự án ${project.name}`
            });

            const projectObj = project.toObject ? project.toObject({ virtuals: true }) : project;
            return res.status(200).json({
                success: true,
                data: {
                    ...projectObj,
                    id: (projectObj.id || projectObj._id || id).toString()
                }
            });
        }

        // DELETE - Delete project
        if (req.method === 'DELETE') {
            const project = await (Project as any).findById(id);
            if (!project) {
                return res.status(404).json({ error: 'Không tìm thấy dự án' });
            }

            // 1. Ghi nhận rút tiền (Hủy toàn bộ dòng tiền của dự án này)
            const org = project.organization;
            const projectBankTxs = await (BankTransaction as any).find({ projectId: id });
            const netImpact = projectBankTxs.reduce((sum: number, tx: any) => sum + tx.amount, 0);

            if (netImpact !== 0) {
                const lastBankTx = await (BankTransaction as any).findOne({ organization: org }).sort({ _id: -1 });
                const currentBalance = lastBankTx?.runningBalance || 0;

                await (BankTransaction as any).create({
                    type: 'Rút tiền',
                    amount: -netImpact,
                    date: new Date(),
                    note: `Xóa dự án: ${project.code}. Thu hồi toàn bộ dòng hiện (Dự toán + Lãi/Phát sinh).`,
                    createdBy: payload.name,
                    runningBalance: currentBalance + (-netImpact),
                    organization: org,
                    projectId: project._id,
                    updatedAt: new Date()
                });
            }

            // 2. Xóa các giao dịch liên quan
            await (Transaction as any).deleteMany({ projectId: id });

            // 3. Xóa bản ghi dự án
            await (Project as any).findByIdAndDelete(id);

            await (AuditLog as any).create({
                actor: payload.name,
                role: payload.role,
                action: 'Xóa dự án',
                target: `Dự án ${project.code}`,
                details: `Đã xóa dự án ${project.name}, thu hồi toàn bộ dòng tiền ${netImpact.toLocaleString('vi-VN')}đ và xóa tất cả giao dịch liên quan`
            });

            return res.status(200).json({ success: true, message: 'Đã xóa dự án' });
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (error: any) {
        console.error('Project API error:', error);
        return res.status(500).json({ error: 'Lỗi server: ' + error.message });
    }
}
