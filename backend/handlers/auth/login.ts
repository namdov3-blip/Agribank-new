import { VercelRequest, VercelResponse } from '@vercel/node';
import connectDB from '../../../lib/mongodb';
import { User, AuditLog } from '../../../lib/models';
import { comparePassword, generateToken, hashPassword } from '../../../lib/auth';
import { ORGANIZATIONS } from '../../../lib/models/User';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Enable CORS
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
        await connectDB();

        const { name, password } = req.body;

        if (!name || !password) {
            return res.status(400).json({ error: 'Vui lòng nhập tên đăng nhập và mật khẩu' });
        }

        // Find user by name
        let user: any = await (User as any).findOne({ name });

        // If no users exist and trying to login as admin, create default admin
        const userCount = await User.countDocuments();
        if (userCount === 0 && name === 'Quản trị viên' && password === 'admin') {
            const hashedPassword = await hashPassword('admin');
            user = await (User as any).create({
                name: 'Quản trị viên',
                password: hashedPassword,
                role: 'Admin',
                avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin',
                permissions: ['dashboard', 'projects', 'balance', 'transactions', 'reports', 'admin'],
                organization: ORGANIZATIONS[0] // Default to first org for admin
            });
        }

        if (!user) {
            return res.status(401).json({ error: 'Tên đăng nhập không tồn tại' });
        }

        // Compare password
        const isValidPassword = await comparePassword(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Mật khẩu không đúng' });
        }

        // Generate JWT token
        const token = generateToken({
            userId: user._id.toString(),
            name: user.name,
            role: user.role
        });

        // Log login
        await (AuditLog as any).create({
            actor: user.name,
            role: user.role,
            action: 'Đăng nhập',
            target: 'Hệ thống',
            details: `Đăng nhập từ ${user.organization || 'N/A'}`
        });

        const userObj = user.toObject ? user.toObject({ virtuals: true }) : user;

        return res.status(200).json({
            success: true,
            token,
            data: {
                ...userObj,
                id: (userObj.id || userObj._id || user._id).toString()
            }
        });

    } catch (error: any) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Lỗi server: ' + error.message });
    }
}

