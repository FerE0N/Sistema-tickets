// controllers/dashboardController.js
const svc = require('../services/dashboardService');
const { ROLES } = require('../middleware/authMiddleware');

const isAdmin = (r) => [ROLES.ADMIN, ROLES.SUPERADMIN].includes(r);

function getScope(req) {
    const scope = (req.query.scope || 'mine').toLowerCase();
    return scope === 'all' ? 'all' : 'mine';
}
function dateRange(req) {
    const from = req.query.from || null;
    const to = req.query.to || null;
    return { from, to };
}

async function summary(req, res) {
    try {
        const scope = getScope(req);
        const range = dateRange(req);

        if (scope === 'all' && !isAdmin(req.user.role_id)) {
            return res.status(403).json({ message: 'Solo admin/superadmin para scope=all' });
        }

        const data = await svc.summary({
            scope,
            userId: req.user.id,
            ...range
        });
        res.json(data);
    } catch (e) {
        console.error('dashboard.summary error:', e);
        res.status(500).json({ message: 'Error en summary' });
    }
};

async function byStatus(req, res) {
    try {
        const scope = getScope(req);
        const range = dateRange(req);
        if (scope === 'all' && !isAdmin(req.user.role_id)) {
            return res.status(403).json({ message: 'Solo admin/superadmin para scope=all' });
        }
        const rows = await svc.byStatus({ scope, userId: req.user.id, ...range });
        res.json(rows);
    } catch (e) {
        console.error('dashboard.byStatus error:', e);
        res.status(500).json({ message: 'Error en byStatus' });
    }
};

async function byCategory(req, res) {
    try {
        const scope = getScope(req);
        const range = dateRange(req);
        if (scope === 'all' && !isAdmin(req.user.role_id)) {
            return res.status(403).json({ message: 'Solo admin/superadmin para scope=all' });
        }
        const rows = await svc.byCategory({ scope, userId: req.user.id, ...range });
        res.json(rows);
    } catch (e) {
        console.error('dashboard.byCategory error:', e);
        res.status(500).json({ message: 'Error en byCategory' });
    }
};

async function byDay(req, res) {
    try {
        const scope = getScope(req);
        const range = dateRange(req);
        const days = Math.max(1, Math.min(365, parseInt(req.query.days || '30', 10)));
        if (scope === 'all' && !isAdmin(req.user.role_id)) {
            return res.status(403).json({ message: 'Solo admin/superadmin para scope=all' });
        }
        const rows = await svc.byDay({ scope, userId: req.user.id, days, ...range });
        res.json(rows);
    } catch (e) {
        console.error('dashboard.byDay error:', e);
        res.status(500).json({ message: 'Error en byDay' });
    }
};

async function byAgent(req, res) {
    try {
        const scope = getScope(req);
        const range = dateRange(req);
        if (scope === 'all' && !isAdmin(req.user.role_id)) {
            return res.status(403).json({ message: 'Solo admin/superadmin para scope=all' });
        }
        const rows = await svc.byAgent({ scope, userId: req.user.id, ...range });
        res.json(rows);
    } catch (e) {
        console.error('dashboard.byAgent error:', e);
        res.status(500).json({ message: 'Error en byAgent' });
    }
};

module.exports = {
    summary,
    byStatus,
    byCategory,
    byDay,
    byAgent
}