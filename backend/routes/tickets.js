// routes/tickets.js
const express = require('express');
const router = express.Router();
const c = require('../controllers/ticketController.js'); // respeta el casing del archivo
const { authenticate } = require('../middleware/authMiddleware.js');

// listado paginado con filtros (auth requerido)
router.get('/paged', authenticate, c.listPaged);

// Todas las rutas de tickets exigen estar autenticado
router.get('/', authenticate, c.list);
router.get('/:id', authenticate, c.get);
router.post('/', authenticate, c.create);

// Reglas finas (admin o el agente asignado) se validan dentro del controller
router.put('/:id', authenticate, c.updateTicket);
router.delete('/:id', authenticate, c.deleteTicket);


module.exports = router;
