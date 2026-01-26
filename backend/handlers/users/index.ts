import { VercelRequest, VercelResponse } from '@vercel/node';
import connectDB from '../../../lib/mongodb';
import { User, AuditLog } from '../../../lib/models';
import { authMiddleware, hashPassword } from '../../../lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const payload = await authMiddleware(req, res, ['Admin', 'SuperAdmin']);
        if (!payload) return;

        await connectDB();

        // GET - List all users
        if (req.method === 'GET') {
            const users = await (User as any).find().select('-password').sort({ createdAt: -1 });
            const mappedUsers = users.map((u: any) => {
                const obj = u.toObject ? u.toObject({ virtuals: true }) : u;
                return {
                    ...obj,
                    id: (obj.id || obj._id || u._id || '').toString()
                };
            });
            return res.status(200).json({ success: true, data: mappedUsers });
        }

        // POST - Create new user
        if (req.method === 'POST') {
            const { name, password, role, permissions, organization } = req.body;

            if (!name || !password) {
                return res.status(400).json({ error: 'Tên và mật khẩu là bắt buộc' });
            }

            // Check duplicate name
            const existingUser = await (User as any).findOne({ name });
            if (existingUser) {
                return res.status(400).json({ error: 'Tên tài khoản đã tồn tại' });
            }

            const hashedPassword = await hashPassword(password);

            const user = await (User as any).create({
                name,
                password: hashedPassword,
                role: role || 'User2',
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
                permissions: (permissions && permissions.length > 0) ? permissions : ['dashboard', 'projects', 'transactions', 'interestCalc'],
                organization: organization
            });

            await (AuditLog as any).create({
                actor: payload.name,
                role: payload.role,
                action: 'Tạo tài khoản',
                target: `User ${name}`,
                details: `Tạo tài khoản mới: ${name} (${role || 'User2'})`
            });

            const userObj = user.toObject ? user.toObject({ virtuals: true }) : user;

            return res.status(201).json({
                success: true,
                data: {
                    ...userObj,
                    id: (userObj.id || userObj._id || user._id).toString()
                }
            });
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (error: any) {
        console.error('Users API error:', error);
        return res.status(500).json({ error: 'Lỗi server: ' + error.message });
    }
}

