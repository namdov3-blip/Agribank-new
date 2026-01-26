import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
    return res.status(200).json({
        status: "ok",
        message: "TypeScript API is working on Vercel",
        env: {
            hasMongo: !!process.env.MONGODB_URI
        }
    });
}
