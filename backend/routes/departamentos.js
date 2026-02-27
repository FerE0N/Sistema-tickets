// routes/departamenos.js
const express = require('express');
const router = express.Router();
const c = require('../controllers/departamentoController.js');
const { authenticate, requireRoles, ROLES } = require('../middleware/authMiddleware');

// Lecturas públicas (para poder usarlas en registro sin token)
router.get('/', c.list);
router.get('/search', c.search);

// Mutaciones protegidas
router.post('/', authenticate, requireRoles(ROLES.ADMIN, ROLES.SUPERADMIN), /* controller.create */);
router.put('/:id', authenticate, requireRoles(ROLES.ADMIN, ROLES.SUPERADMIN), /* controller.update */);
router.delete('/:id', authenticate, requireRoles(ROLES.ADMIN, ROLES.SUPERADMIN), /* controller.remove */);

module.exports = router;