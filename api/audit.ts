import { VercelRequest, VercelResponse } from '@vercel/node';
import auditLogs from '../backend/handlers/audit-logs';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    return await auditLogs(req, res);
}
