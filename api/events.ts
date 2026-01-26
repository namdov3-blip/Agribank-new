import { VercelRequest, VercelResponse } from '@vercel/node';
import eventsPoll from '../backend/handlers/events/poll';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { url } = req;
    const path = url?.split('?')[0] || '';

    if (path.endsWith('/poll')) return await eventsPoll(req, res);

    return res.status(404).json({ error: 'Events route not found' });
}
