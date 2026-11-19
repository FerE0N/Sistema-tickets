// routes/tickets.js
const express = require('express');
const router = express.Router();
const c = require('../controllers/ticketController.js');
const { authenticate } = require('../middleware/authMiddleware.js');

// listado paginado con filtros (auth requerido)
router.get('/paged', authenticate, c.listPaged);

// Todas las rutas de tickets exigen estar autenticado
router.get('/', authenticate, c.list);
router.get('/:id', authenticate, c.get);
router.post('/', authenticate, c.create);

// Permisos finos (admin, agente asignado o responsable) se validan en el controlador
router.put('/:id', authenticate, c.updateTicket);
router.delete('/:id', authenticate, c.deleteTicket);


module.exports = router;
