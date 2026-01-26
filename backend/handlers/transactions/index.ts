import { VercelRequest, VercelResponse } from '@vercel/node';
import connectDB from '../../../lib/mongodb';
import { Transaction, Project, User, AuditLog } from '../../../lib/models';
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

        const { projectId, status, search, page = '1', limit = '50' } = req.query;

        // Build project filter for organization
        let projectFilter: any = {};
        const isAllOrg = payload.role === 'SuperAdmin' || currentUser.organization === 'Nam World';
        if (payload.role !== 'Admin' && !isAllOrg && currentUser.organization) {
            projectFilter.organization = currentUser.organization;
        }

        // Get list of project IDs user can access
        let accessibleProjectIds: string[] = [];

        if (projectId) {
            // If specific project requested, check access
            const project = await (Project as any).findById(projectId);
            if (!project) {
                return res.status(404).json({ error: 'Project not found' });
            }
            if (payload.role !== 'Admin' && !isAllOrg && project.organization !== currentUser.organization) {
                return res.status(403).json({ error: 'Access denied to this project' });
            }
            accessibleProjectIds = [projectId as string];
        } else {
            // Get all accessible projects
            const accessibleProjects = await (Project as any).find(projectFilter).select('_id');
            accessibleProjectIds = accessibleProjects.map((p: any) => p._id.toString());
        }

        // Build transaction filter
        const filter: any = {
            projectId: { $in: accessibleProjectIds }
        };

        if (status) {
            filter.status = status;
        }

        if (search && typeof search === 'string') {
            filter['household.name'] = { $regex: search, $options: 'i' };
        }

        const pageNum = parseInt(page as string) || 1;
        const limitNum = parseInt(limit as string) || 50;
        const skip = (pageNum - 1) * limitNum;

        const [transactions, total] = await Promise.all([
            (Transaction as any).find(filter)
                .populate('projectId', 'code name interestStartDate organization')
                .sort({ _id: 1 })
                .collation({ locale: 'en', numericOrdering: true })
                .skip(skip)
                .limit(limitNum),
            (Transaction as any).countDocuments(filter)
        ]);

        // Explicitly map _id to id for each transaction and its related project
        const mappedTransactions = transactions.map((t: any) => {
            const obj = t.toObject ? t.toObject({ virtuals: true }) : t;
            const mapped = {
                ...obj,
                id: (obj.id || obj._id || t._id || '').toString()
            };

            // Ensure projectId is returned as a string ID for frontend compatibility
            if (mapped.projectId) {
                if (typeof mapped.projectId === 'object') {
                    // Extract ID if populated
                    mapped.projectId = (mapped.projectId.id || mapped.projectId._id || '').toString();
                } else {
                    // Convert ObjectId to string
                    mapped.projectId = mapped.projectId.toString();
                }
            }

            // Ensure effectiveInterestDate is properly serialized if present
            if (mapped.effectiveInterestDate && mapped.effectiveInterestDate instanceof Date) {
                // Keep as Date object - JSON.stringify will convert to ISO string
                // No conversion needed, Mongoose toObject already handles this
            }

            return mapped;
        });

        return res.status(200).json({
            success: true,
            data: mappedTransactions,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });

    } catch (error: any) {
        console.error('Transactions API error:', error);
        return res.status(500).json({ error: 'Lỗi server: ' + error.message });
    }
}


