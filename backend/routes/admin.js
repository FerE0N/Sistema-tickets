// backend/routes/adin.js
const express = require('express');
const router = express.Router();
const adminCtrl = require('../controllers/adminController.js');
const { authenticate, requireRoles, ROLES } = require('../middleware/authMiddleware.js');

// Todo aquí es solo para ADMIN / SUPERADMIN
router.use(authenticate, requireRoles(ROLES.ADMIN, ROLES.SUPERADMIN));
router.get('/revoked-tokens', adminCtrl.listRevokedTokens);

module.exports = router;
