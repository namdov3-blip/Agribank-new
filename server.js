// Local Express server for development testing
// Run with: node server.js

require('dotenv').config({ path: '.env.local' });

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Helper to wrap Vercel handlers
const wrapHandler = (handler) => async (req, res) => {
    try {
        // Adapt Express req/res to Vercel format
        req.query = req.query || {};
        await handler(req, res);
    } catch (error) {
        console.error('Handler error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Import API handlers (require transpiled JS or use ts-node)
// For now, we'll create inline handlers that match API structure

// ============ AUTH ============
app.post('/api/auth/login', async (req, res) => {
    try {
        const handler = require('./api/auth/login').default;
        await handler(req, res);
    } catch (e) {
        console.error('Login error:', e);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/auth/me', async (req, res) => {
    try {
        const handler = require('./api/auth/me').default;
        await handler(req, res);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============ PROJECTS ============
app.get('/api/projects', async (req, res) => {
    try {
        const handler = require('./api/projects/index').default;
        await handler(req, res);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/projects', async (req, res) => {
    try {
        const handler = require('./api/projects/index').default;
        await handler(req, res);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/projects/:id', async (req, res) => {
    try {
        req.query.id = req.params.id;
        const handler = require('./api/projects/[id]').default;
        await handler(req, res);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/projects/:id', async (req, res) => {
    try {
        req.query.id = req.params.id;
        const handler = require('./api/projects/[id]').default;
        await handler(req, res);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/projects/:id', async (req, res) => {
    try {
        req.query.id = req.params.id;
        const handler = require('./api/projects/[id]').default;
        await handler(req, res);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/projects/import', async (req, res) => {
    try {
        const handler = require('./api/projects/import').default;
        await handler(req, res);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============ TRANSACTIONS ============
app.get('/api/transactions', async (req, res) => {
    try {
        const handler = require('./api/transactions/index').default;
        await handler(req, res);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/transactions/:id', async (req, res) => {
    try {
        req.query.id = req.params.id;
        const handler = require('./api/transactions/[id]').default;
        await handler(req, res);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/transactions/:id', async (req, res) => {
    try {
        req.query.id = req.params.id;
        const handler = require('./api/transactions/[id]').default;
        await handler(req, res);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/transactions/:id/status', async (req, res) => {
    try {
        req.query.id = req.params.id;
        const handler = require('./api/transactions/[id]/status').default;
        await handler(req, res);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/transactions/:id/refund', async (req, res) => {
    try {
        req.query.id = req.params.id;
        const handler = require('./api/transactions/[id]/refund').default;
        await handler(req, res);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/transactions/:id/qr', async (req, res) => {
    try {
        req.query.id = req.params.id;
        const handler = require('./api/transactions/[id]/qr').default;
        await handler(req, res);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.all('/api/transactions/confirm/:token', async (req, res) => {
    try {
        req.query.token = req.params.token;
        const handler = require('./api/transactions/confirm/[token]').default;
        await handler(req, res);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============ BANK ============
app.get('/api/bank/balance', async (req, res) => {
    try {
        const handler = require('./api/bank/balance').default;
        await handler(req, res);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/bank/transactions', async (req, res) => {
    try {
        const handler = require('./api/bank/transactions').default;
        await handler(req, res);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/bank/transactions', async (req, res) => {
    try {
        const handler = require('./api/bank/transactions').default;
        await handler(req, res);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/bank/adjust-opening', async (req, res) => {
    try {
        const handler = require('./api/bank/adjust-opening').default;
        await handler(req, res);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.all('/api/bank/calculate-interest', async (req, res) => {
    try {
        const handler = require('./api/bank/calculate-interest').default;
        await handler(req, res);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============ USERS ============
app.get('/api/users', async (req, res) => {
    try {
        const handler = require('./api/users/index').default;
        await handler(req, res);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/users', async (req, res) => {
    try {
        const handler = require('./api/users/index').default;
        await handler(req, res);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/users/:id', async (req, res) => {
    try {
        req.query.id = req.params.id;
        const handler = require('./api/users/[id]').default;
        await handler(req, res);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/users/:id', async (req, res) => {
    try {
        req.query.id = req.params.id;
        const handler = require('./api/users/[id]').default;
        await handler(req, res);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        req.query.id = req.params.id;
        const handler = require('./api/users/[id]').default;
        await handler(req, res);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============ SETTINGS ============
app.get('/api/settings/interest-rate', async (req, res) => {
    try {
        const handler = require('./api/settings/interest-rate').default;
        await handler(req, res);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/settings/interest-rate', async (req, res) => {
    try {
        const handler = require('./api/settings/interest-rate').default;
        await handler(req, res);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============ AUDIT LOGS ============
app.get('/api/audit-logs', async (req, res) => {
    try {
        const handler = require('./api/audit-logs').default;
        await handler(req, res);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============ POLLING ============
app.get('/api/events/poll', async (req, res) => {
    try {
        const handler = require('./api/events/poll').default;
        await handler(req, res);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`
====================================
🚀 API Server running on http://localhost:${PORT}
====================================

Test endpoints:
  POST http://localhost:${PORT}/api/auth/login
  GET  http://localhost:${PORT}/api/projects
  GET  http://localhost:${PORT}/api/transactions
  GET  http://localhost:${PORT}/api/bank/balance

Make sure .env.local has:
  MONGODB_URI=your_mongodb_connection_string
  JWT_SECRET=your_secret_key
====================================
  `);
});
