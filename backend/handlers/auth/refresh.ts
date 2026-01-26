import { VercelRequest, VercelResponse } from '@vercel/node';
import connectDB from '../../../lib/mongodb';
import { User } from '../../../lib/models';
import { authMiddleware, generateToken } from '../../../lib/auth';

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
    const payload = await authMiddleware(req, res);
    if (!payload) return;

    await connectDB();

    // Ensure user still exists (and optionally could check role/org changes here)
    const user = await (User as any).findById(payload.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const token = generateToken({
      userId: payload.userId,
      name: payload.name,
      role: payload.role
    });

    return res.status(200).json({ success: true, token });
  } catch (error: any) {
    console.error('Refresh token error:', error);
    return res.status(500).json({ error: 'Lỗi server: ' + error.message });
  }
}

