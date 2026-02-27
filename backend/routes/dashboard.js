// routes/dashboard.js
const express = require('express');
const router = express.Router();
const { authenticate, ROLES } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/dashboardController');

router.use(authenticate);

// scope=mine -> métricas del usuario actual
// scope=all  -> requiere admin/superadmin
router.get('/summary', ctrl.summary);
router.get('/by-status', ctrl.byStatus);
router.get('/by-category', ctrl.byCategory);
router.get('/by-day', ctrl.byDay);
router.get('/by-agent', ctrl.byAgent);

module.exports = router;
