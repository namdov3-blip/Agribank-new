import { VercelRequest, VercelResponse } from '@vercel/node';
import authLogin from '../backend/handlers/auth/login';
import authMe from '../backend/handlers/auth/me';
import authRefresh from '../backend/handlers/auth/refresh';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { url } = req;
    const path = url?.split('?')[0] || '';

    if (path.endsWith('/login')) return await authLogin(req, res);
    if (path.endsWith('/me')) return await authMe(req, res);
    if (path.endsWith('/refresh')) return await authRefresh(req, res);

    return res.status(404).json({ error: 'Auth route not found' });
}
