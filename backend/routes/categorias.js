// backend/routes/categorias.js
const express = require('express');
const router = express.Router();
const c = require('../controllers/categoriaController.js');
const { authenticate, requireRoles, ROLES } = require('../middleware/authMiddleware.js');

router.get('/search', authenticate, c.search);  // ← primero
router.get('/', authenticate, c.list);
router.get('/:id', authenticate, c.get);

router.post('/', authenticate, requireRoles(ROLES.ADMIN, ROLES.SUPERADMIN), c.create);
router.put('/:id', authenticate, requireRoles(ROLES.ADMIN, ROLES.SUPERADMIN), c.update);
router.delete('/:id', authenticate, requireRoles(ROLES.ADMIN, ROLES.SUPERADMIN), c.remove);

module.exports = router;
