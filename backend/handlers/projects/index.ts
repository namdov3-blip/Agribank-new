import { VercelRequest, VercelResponse } from '@vercel/node';
import connectDB from '../../../lib/mongodb';
import { Project, AuditLog, User } from '../../../lib/models';
import { authMiddleware } from '../../../lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
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

        // GET - List all projects (filtered by org)
        if (req.method === 'GET') {
            const filter: any = {};

            const isAllOrg = payload.role === 'SuperAdmin' || currentUser.organization === 'Nam World';
            // SuperAdmin/Admin/Nam World sees all, others see only their org
            if (payload.role !== 'Admin' && !isAllOrg && currentUser.organization) {
                filter.organization = currentUser.organization;
            }

            const projects = await (Project as any).find(filter).sort({ uploadDate: -1 });

            // Explicitly map _id to id for each project
            const mappedProjects = projects.map((p: any) => {
                const obj = p.toObject ? p.toObject({ virtuals: true }) : p;
                const id = (obj.id || obj._id || p._id || '').toString();
                return {
                    ...obj,
                    id: id
                };
            });

            return res.status(200).json({
                success: true,
                data: mappedProjects
            });
        }

        // POST - Create new project
        if (req.method === 'POST') {
            const { code, name, location, totalBudget, interestStartDate, status } = req.body;

            if (!code || !name) {
                return res.status(400).json({ error: 'Mã dự án và tên dự án là bắt buộc' });
            }

            // Check duplicate code
            const existingProject = await (Project as any).findOne({ code });
            if (existingProject) {
                return res.status(400).json({ error: 'Mã dự án đã tồn tại' });
            }

            const project = await (Project as any).create({
                code,
                name,
                location: location || '',
                totalBudget: totalBudget || 0,
                interestStartDate: interestStartDate ? new Date(interestStartDate) : new Date(),
                status: status || 'Active',
                uploadDate: new Date(),
                startDate: new Date(),
                organization: currentUser.organization, // Auto-set from current user
                uploadedBy: currentUser._id,
                updatedAt: new Date()
            });

            // Create audit log
            await (AuditLog as any).create({
                actor: payload.name,
                role: payload.role,
                action: 'Tạo dự án mới',
                target: `Dự án ${code}`,
                details: `Đã tạo dự án ${name} (${code}) - Org: ${currentUser.organization}`
            });

            return res.status(201).json({ success: true, data: project });
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (error: any) {
        console.error('Projects API error:', error);
        return res.status(500).json({ error: 'Lỗi server: ' + error.message });
    }
}

