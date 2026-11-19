// routes/users.js
const express = require('express');
const router = express.Router();
const c = require('../controllers/userController.js');
const { authenticate, requireRoles, requireSelfOrRoles, ROLES } = require('../middleware/authMiddleware.js');

// Listado paginado + filtros (solo admin/superadmin)
router.get('/paged', authenticate, requireRoles(ROLES.ADMIN, ROLES.SUPERADMIN), c.listPaged);

// Buscar usuarios por texto (autocomplete) — debe ir ANTES de '/:id'
router.get('/search', authenticate, c.search);

// Cambiar contraseña (self; admin/superadmin pueden forzar)
router.patch(
    '/:id/password',
    authenticate,
    requireSelfOrRoles(req => parseInt(req.params.id), ROLES.ADMIN, ROLES.SUPERADMIN),
    c.changePassword
);

// Listar todos -> solo admin/superadmin
router.get('/', authenticate, requireRoles(ROLES.ADMIN, ROLES.SUPERADMIN), c.list);

// Ver uno -> self o admin/superadmin
router.get('/:id', authenticate, requireSelfOrRoles(req => parseInt(req.params.id), ROLES.ADMIN, ROLES.SUPERADMIN), c.get);

// Crear usuario -> solo admin/superadmin
router.post('/', authenticate, requireRoles(ROLES.ADMIN, ROLES.SUPERADMIN), c.create);

// Actualizar -> self o admin/superadmin
router.put('/:id', authenticate, requireSelfOrRoles(req => parseInt(req.params.id), ROLES.ADMIN, ROLES.SUPERADMIN), c.update);

// Eliminar -> solo admin/superadmin
router.delete('/:id', authenticate, requireRoles(ROLES.ADMIN, ROLES.SUPERADMIN), c.remove);

module.exports = router;
