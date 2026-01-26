import { VercelRequest, VercelResponse } from '@vercel/node';
import resetData from '../backend/handlers/admin/reset-data';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { url } = req;
    const path = url?.split('?')[0] || '';

    if (path === '/api/admin/reset' || path === '/api/admin/reset/') {
        return await resetData(req, res);
    }

    return res.status(404).json({ error: 'Admin route not found' });
}
