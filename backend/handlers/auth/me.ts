import { VercelRequest, VercelResponse } from '@vercel/node';
import connectDB from '../../../lib/mongodb';
import { User } from '../../../lib/models';
import { authMiddleware } from '../../../lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Enable CORS
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
        if (!payload) return; // Response already sent by middleware

        await connectDB();

        const user = await (User as any).findById(payload.userId).select('-password');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        console.log(`[AUTH] Me: User ${user.name} found for ID ${payload.userId}`);

        const userObj = user.toObject ? user.toObject({ virtuals: true }) : user;

        return res.status(200).json({
            success: true,
            data: {
                ...userObj,
                id: (userObj.id || userObj._id || payload.userId).toString()
            }
        });

    } catch (error: any) {
        console.error('Get me error:', error);
        return res.status(500).json({ error: 'Lỗi server: ' + error.message });
    }
}

