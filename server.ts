// Local Express server for development testing (TypeScript version)
// Run with: npx tsx server.ts

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

// Global error handlers
process.on('uncaughtException', (err) => {
    console.error('CRITICAL: UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('CRITICAL: UNHANDLED REJECTION:', reason);
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Helper to safely run Vercel handlers
async function handle(req: Request, res: Response, importPath: string) {
    try {
        const path = require('path');
        const apiDir = path.resolve(process.cwd());
        const handlerPath = path.resolve(apiDir, `${importPath}.ts`);

        // Clear cache to ensure hot-reloading works for dynamic requirements
        delete require.cache[require.resolve(handlerPath)];

        const handler = require(handlerPath).default;
        await handler(req as any, res as any);
    } catch (e: any) {
        console.error(`ERROR handling ${req.method} ${req.url} -> ${importPath}:`, e);
        if (!res.headersSent) {
            res.status(500).json({ error: e.message || 'Internal Server Error' });
        }
    }
}

// ============ AUTH ============
app.post('/api/auth/login', (req, res) => handle(req, res, './backend/handlers/auth/login'));
app.get('/api/auth/me', (req, res) => handle(req, res, './backend/handlers/auth/me'));
app.post('/api/auth/refresh', (req, res) => handle(req, res, './backend/handlers/auth/refresh'));

// ============ PROJECTS ============
app.get('/api/projects', (req, res) => handle(req, res, './backend/handlers/projects/index'));
app.post('/api/projects', (req, res) => handle(req, res, './backend/handlers/projects/index'));

app.get('/api/projects/:id', (req, res) => {
    Object.assign(req.query, req.params);
    console.log(`[SERVER] GET Project: ID=${req.params.id}, Query:`, req.query);
    handle(req, res, './backend/handlers/projects/_id');
});
app.put('/api/projects/:id', (req, res) => {
    Object.assign(req.query, req.params);
    console.log(`[SERVER] PUT Project: ID=${req.params.id}, Query:`, req.query);
    handle(req, res, './backend/handlers/projects/_id');
});
app.delete('/api/projects/:id', (req, res) => {
    Object.assign(req.query, req.params);
    console.log(`[SERVER] DELETE Project: ID=${req.params.id}, Query:`, req.query);
    handle(req, res, './backend/handlers/projects/_id');
});

app.post('/api/projects/import', (req, res) => handle(req, res, './backend/handlers/projects/import'));

// ============ TRANSACTIONS ============
app.get('/api/transactions', (req, res) => handle(req, res, './backend/handlers/transactions/index'));

app.get('/api/transactions/:id', (req, res) => {
    req.query = { ...req.query, id: req.params.id };
    console.log(`[SERVER] GET Transaction ID: ${req.params.id}`);
    handle(req, res, './backend/handlers/transactions/_id');
});
app.put('/api/transactions/:id', (req, res) => {
    req.query = { ...req.query, id: req.params.id };
    handle(req, res, './backend/handlers/transactions/_id');
});
app.delete('/api/transactions/:id', (req, res) => {
    req.query = { ...req.query, id: req.params.id };
    console.log(`[SERVER] DELETE Transaction: ID=${req.params.id}`);
    handle(req, res, './backend/handlers/transactions/_id');
});
app.put('/api/transactions/:id/status', (req, res) => {
    req.query = { ...req.query, id: req.params.id };
    handle(req, res, './backend/handlers/transactions/update-status');
});
app.post('/api/transactions/:id/refund', (req, res) => {
    req.query = { ...req.query, id: req.params.id };
    handle(req, res, './backend/handlers/transactions/refund');
});
app.get('/api/transactions/:id/qr', (req, res) => {
    req.query = { ...req.query, id: req.params.id };
    handle(req, res, './backend/handlers/transactions/generate-qr');
});

app.all('/api/transactions/confirm/:token', (req, res) => {
    Object.assign(req.query, req.params);
    handle(req, res, './backend/handlers/transactions/confirm/_token');
});

// ============ BANK ============
app.get('/api/bank/balance', (req, res) => handle(req, res, './backend/handlers/bank/balance'));
app.get('/api/bank/transactions', (req, res) => handle(req, res, './backend/handlers/bank/transactions'));
app.post('/api/bank/transactions', (req, res) => handle(req, res, './backend/handlers/bank/transactions'));
app.post('/api/bank/adjust-opening', (req, res) => handle(req, res, './backend/handlers/bank/adjust-opening'));
app.all('/api/bank/calculate-interest', (req, res) => handle(req, res, './backend/handlers/bank/calculate-interest'));
app.post('/api/bank/accrue-interest', (req, res) => handle(req, res, './backend/handlers/bank/accrue-interest'));

// ============ ADMIN ============
app.post('/api/admin/reset', (req, res) => handle(req, res, './backend/handlers/admin/reset-data'));

// ============ USERS ============
app.get('/api/users', (req, res) => handle(req, res, './backend/handlers/users/index'));
app.post('/api/users', (req, res) => handle(req, res, './backend/handlers/users/index'));

app.get('/api/users/:id', (req, res) => {
    req.query = { ...req.query, id: req.params.id };
    handle(req, res, './backend/handlers/users/_id');
});
app.put('/api/users/:id', (req, res) => {
    req.query = { ...req.query, id: req.params.id };
    handle(req, res, './backend/handlers/users/_id');
});
app.delete('/api/users/:id', (req, res) => {
    req.query = { ...req.query, id: req.params.id };
    handle(req, res, './backend/handlers/users/_id');
});

// ============ SETTINGS ============
app.get('/api/settings/interest-rate', (req, res) => handle(req, res, './backend/handlers/settings/interest-rate'));
app.put('/api/settings/interest-rate', (req, res) => handle(req, res, './backend/handlers/settings/interest-rate'));
app.put('/api/settings/bank-interest-rate', (req, res) => handle(req, res, './backend/handlers/settings/bank-interest-rate'));

// ============ AUDIT LOGS ============
app.get('/api/audit-logs', (req, res) => handle(req, res, './backend/handlers/audit-logs'));

// ============ POLLING ============
app.get('/api/events/poll', (req, res) => handle(req, res, './backend/handlers/events/poll'));

// ============ HEALTH CHECK ============
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        message: 'API Server is running',
        timestamp: new Date().toISOString()
    });
});

// ============ HANDLE CHROME DEVTOOLS REQUEST ============
// Fix for Chrome DevTools CSP warning
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Handle root path
app.get('/', (req, res) => {
    res.status(200).json({
        message: 'API Server is running',
        endpoints: {
            health: '/api/health',
            auth: '/api/auth/login',
            projects: '/api/projects',
            transactions: '/api/transactions'
        }
    });
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`
====================================
🚀 API Server running on http://localhost:${PORT}
====================================
  `);
});

server.on('error', (e) => {
    console.error('SERVER ERROR:', e);
});
