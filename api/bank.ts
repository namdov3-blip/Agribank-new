import { VercelRequest, VercelResponse } from '@vercel/node';
import bankBalance from '../backend/handlers/bank/balance';
import bankTransactions from '../backend/handlers/bank/transactions';
import bankAdjust from '../backend/handlers/bank/adjust-opening';
import bankInterest from '../backend/handlers/bank/calculate-interest';
import bankAccrue from '../backend/handlers/bank/accrue-interest';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { url } = req;
    const path = url?.split('?')[0] || '';

    if (path.endsWith('/balance')) return await bankBalance(req, res);
    if (path.endsWith('/transactions')) return await bankTransactions(req, res);
    if (path.endsWith('/adjust-opening')) return await bankAdjust(req, res);
    if (path.endsWith('/calculate-interest')) return await bankInterest(req, res);
    if (path.endsWith('/accrue-interest')) return await bankAccrue(req, res);

    return res.status(404).json({ error: 'Bank route not found' });
}
