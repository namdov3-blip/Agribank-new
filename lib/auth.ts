import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { VercelRequest, VercelResponse } from '@vercel/node';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

export interface JWTPayload {
    userId: string;
    name: string;
    role: string;
}

export function generateToken(payload: JWTPayload): string {
    const secret = process.env.JWT_SECRET || 'fallback-secret-key';
    // Access token lifetime: 1 hour for mobile QR confirmation
    return jwt.sign(payload, secret, { expiresIn: '1h' });
}

export function verifyToken(token: string): JWTPayload | null {
    const secret = process.env.JWT_SECRET || 'fallback-secret-key';
    try {
        return jwt.verify(token, secret) as JWTPayload;
    } catch (err: any) {
        console.error('JWT Verification Error:', err.message);
        return null;
    }
}

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

export function getTokenFromRequest(req: VercelRequest): string | null {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }
    return null;
}

export async function authMiddleware(
    req: VercelRequest,
    res: VercelResponse,
    allowedRoles?: string[]
): Promise<JWTPayload | null> {
    const token = getTokenFromRequest(req);

    if (!token) {
        res.status(401).json({ error: 'Unauthorized - No token provided' });
        return null;
    }

    const payload = verifyToken(token);

    if (!payload) {
        res.status(401).json({ error: 'Unauthorized - Invalid token' });
        return null;
    }

    if (allowedRoles && !allowedRoles.includes(payload.role)) {
        res.status(403).json({ error: 'Forbidden - Insufficient permissions' });
        return null;
    }

    return payload;
}

// Generate secure token for QR code
export function generateQRToken(transactionId: string): string {
    return jwt.sign({ transactionId, type: 'qr-confirm' }, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyQRToken(token: string): { transactionId: string } | null {
    try {
        const payload = jwt.verify(token, JWT_SECRET) as { transactionId: string; type: string };
        if (payload.type !== 'qr-confirm') return null;
        return { transactionId: payload.transactionId };
    } catch {
        return null;
    }
}
