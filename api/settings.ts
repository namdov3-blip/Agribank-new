import { VercelRequest, VercelResponse } from '@vercel/node';
import settingsInterest from '../backend/handlers/settings/interest-rate';
import settingsBankInterest from '../backend/handlers/settings/bank-interest-rate';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { url } = req;
    const path = url?.split('?')[0] || '';

    if (path.endsWith('/interest-rate')) return await settingsInterest(req, res);
    if (path.endsWith('/bank-interest-rate')) return await settingsBankInterest(req, res);

    return res.status(404).json({ error: 'Settings route not found' });
}
