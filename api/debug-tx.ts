import { VercelRequest, VercelResponse } from '@vercel/node';
import connectDB from '../lib/mongodb';
import { Transaction } from '../lib/models';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        await connectDB();
        const txs = await (Transaction as any).find().limit(5);
        const raw = txs.map((t: any) => t.toObject({ virtuals: true }));
        return res.status(200).json({ success: true, count: txs.length, sample: raw });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
}
