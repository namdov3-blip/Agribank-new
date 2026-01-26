import { VercelRequest, VercelResponse } from '@vercel/node';
import transactionsIndex from '../backend/handlers/transactions/index';
import transactionsToken from '../backend/handlers/transactions/confirm/_token';
import transactionsStatus from '../backend/handlers/transactions/update-status';
import transactionsRefund from '../backend/handlers/transactions/refund';
import transactionsQR from '../backend/handlers/transactions/generate-qr';
import transactionsId from '../backend/handlers/transactions/_id';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { url } = req;
    const path = url?.split('?')[0] || '';

    // Transactions Index
    if (path === '/api/transactions' || path === '/api/transactions/') {
        return await transactionsIndex(req, res);
    }

    // Confirm Token
    if (path.includes('/confirm/')) {
        req.query.token = path.split('/')[4];
        return await transactionsToken(req, res);
    }

    // Status Update
    if (path.endsWith('/status')) {
        req.query.id = path.split('/')[3];
        return await transactionsStatus(req, res);
    }

    // Refund
    if (path.endsWith('/refund')) {
        req.query.id = path.split('/')[3];
        return await transactionsRefund(req, res);
    }

    // QR Code
    if (path.endsWith('/qr')) {
        req.query.id = path.split('/')[3];
        return await transactionsQR(req, res);
    }

    // Single Transaction (ID)
    const parts = path.split('/');
    if (parts.length === 4 && parts[2] === 'transactions') {
        req.query.id = parts[3];
        return await transactionsId(req, res);
    }

    return res.status(404).json({ error: 'Transaction route not found: ' + path });
}
