// routes/departamentos.js
const express = require('express');
const router = express.Router();
const c = require('../controllers/departamentoController');
const { authenticate, requireRoles, ROLES } = require('../middleware/authMiddleware');

// Lecturas públicas (se usan en el formulario de registro, sin token)
router.get('/', c.list);
router.get('/search', c.search);

// Mutaciones: solo admin / superadmin
const adminOnly = [authenticate, requireRoles(ROLES.ADMIN, ROLES.SUPERADMIN)];
router.post('/', ...adminOnly, c.create);
router.put('/:id', ...adminOnly, c.update);
router.delete('/:id', ...adminOnly, c.remove);

module.exports = router;
