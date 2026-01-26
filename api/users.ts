import { VercelRequest, VercelResponse } from '@vercel/node';
import usersIndex from '../backend/handlers/users/index';
import usersId from '../backend/handlers/users/_id';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { url } = req;
    const path = url?.split('?')[0] || '';

    if (path === '/api/users' || path === '/api/users/') return await usersIndex(req, res);

    // Single User (ID)
    const parts = path.split('/');
    if (parts.length === 4 && parts[2] === 'users') {
        req.query.id = parts[3];
        return await usersId(req, res);
    }

    return res.status(404).json({ error: 'User route not found' });
}
