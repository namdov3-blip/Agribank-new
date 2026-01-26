import { VercelRequest, VercelResponse } from '@vercel/node';
import connectDB from '../../../lib/mongodb';
import { Transaction, BankTransaction, Project, User } from '../../../lib/models';
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
        const currentUser = await User.findById(payload.userId);
        if (!currentUser) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Parse query params
        const { since, types = 'transactions,bank,projects' } = req.query;
        const sinceDate = since ? new Date(since as string) : new Date(Date.now() - 60000); // Default: last 1 minute
        const typeList = (types as string).split(',');

        // Build organization filter
        const isAdmin = payload.role === 'Admin' || payload.role === 'SuperAdmin' || currentUser.organization === 'Nam World';
        const userOrg = currentUser.organization;

        const changes: any = {
            timestamp: new Date().toISOString()
        };

        // Get updated transactions
        if (typeList.includes('transactions')) {
            // Get projects for this org
            const projectFilter: any = {};
            if (!isAdmin && userOrg) {
                projectFilter.organization = userOrg;
            }
            const accessibleProjects = await Project.find(projectFilter).select('_id');
            const projectIds = accessibleProjects.map(p => p._id);

            const updatedTransactions = await Transaction.find({
                projectId: { $in: projectIds },
                updatedAt: { $gt: sinceDate }
            })
                .populate('projectId', 'code name organization')
                .sort({ updatedAt: -1 })
                .limit(50);

            changes.transactions = updatedTransactions;
        }

        // Get updated bank transactions
        if (typeList.includes('bank')) {
            const bankFilter: any = { updatedAt: { $gt: sinceDate } };
            if (!isAdmin && userOrg) {
                bankFilter.organization = userOrg;
            }

            const updatedBankTx = await BankTransaction.find(bankFilter)
                .sort({ updatedAt: -1 })
                .limit(50);

            changes.bank = updatedBankTx;
        }

        // Get updated projects
        if (typeList.includes('projects')) {
            const projectFilter: any = { updatedAt: { $gt: sinceDate } };
            if (!isAdmin && userOrg) {
                projectFilter.organization = userOrg;
            }

            const updatedProjects = await Project.find(projectFilter)
                .sort({ updatedAt: -1 })
                .limit(20);

            changes.projects = updatedProjects;
        }

        // Calculate if there are any changes
        const hasChanges =
            (changes.transactions?.length > 0) ||
            (changes.bank?.length > 0) ||
            (changes.projects?.length > 0);

        return res.status(200).json({
            success: true,
            hasChanges,
            data: changes
        });

    } catch (error: any) {
        console.error('Poll error:', error);
        return res.status(500).json({ error: 'Lỗi server: ' + error.message });
    }
}

