import { VercelRequest, VercelResponse } from '@vercel/node';
import connectDB from '../../../lib/mongodb';
import { User, AuditLog } from '../../../lib/models';
import { authMiddleware, hashPassword } from '../../../lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const payload = await authMiddleware(req, res, ['Admin', 'SuperAdmin']);
        if (!payload) return;

        await connectDB();

        const id = req.query.id || (req as any).params?.id;
        if (!id || typeof id !== 'string') {
            return res.status(400).json({ error: 'User ID is required' });
        }

        // GET - Get user by ID
        if (req.method === 'GET') {
            const user = await (User as any).findById(id).select('-password');
            if (!user) {
                return res.status(404).json({ error: 'Không tìm thấy người dùng' });
            }
            const userObj = user.toObject ? user.toObject({ virtuals: true }) : user;
            return res.status(200).json({
                success: true,
                data: {
                    ...userObj,
                    id: (userObj.id || userObj._id || id).toString()
                }
            });
        }

        // PUT - Update user
        if (req.method === 'PUT') {
            const { name, password, role, permissions, organization } = req.body;

            const updateData: any = {};
            if (name) updateData.name = name;
            if (role) updateData.role = role;
            if (permissions) updateData.permissions = permissions;
            if (organization !== undefined) updateData.organization = organization;
            if (password) {
                updateData.password = await hashPassword(password);
            }

            const user = await (User as any).findByIdAndUpdate(id, updateData, { new: true }).select('-password');

            if (!user) {
                return res.status(404).json({ error: 'Không tìm thấy người dùng' });
            }

            await (AuditLog as any).create({
                actor: payload.name,
                role: payload.role,
                action: 'Cập nhật tài khoản',
                target: `User ${user.name}`,
                details: `Cập nhật thông tin tài khoản: ${user.name}${password ? ' (đã đổi mật khẩu)' : ''}`
            });

            const userObj = user.toObject ? user.toObject({ virtuals: true }) : user;
            return res.status(200).json({
                success: true,
                data: {
                    ...userObj,
                    id: (userObj.id || userObj._id || id).toString()
                }
            });
        }

        // DELETE - Delete user
        if (req.method === 'DELETE') {
            const user = await (User as any).findById(id);
            if (!user) {
                return res.status(404).json({ error: 'Không tìm thấy người dùng' });
            }

            // Prevent deleting self
            if (user._id.toString() === payload.userId) {
                return res.status(400).json({ error: 'Không thể xóa tài khoản của chính mình' });
            }

            await (User as any).findByIdAndDelete(id);

            await (AuditLog as any).create({
                actor: payload.name,
                role: payload.role,
                action: 'Xóa tài khoản',
                target: `User ${user.name}`,
                details: `Đã xóa tài khoản: ${user.name}`
            });

            return res.status(200).json({ success: true, message: 'Đã xóa tài khoản' });
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (error: any) {
        console.error('User API error:', error);
        return res.status(500).json({ error: 'Lỗi server: ' + error.message });
    }
}
