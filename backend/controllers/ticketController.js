// controllers/ticketController.js
const ticketService = require('../services/ticketService.js');
const { ROLES } = require('../middleware/authMiddleware.js');

const isAdmin = (roleId) => [ROLES.ADMIN, ROLES.SUPERADMIN].includes(roleId);

/* ============ READ: lista de tickets ============ */
async function list(req, res) {
    try {
        const rows = await ticketService.getAllTickets();
        res.json(rows);
    } catch (e) {
        res.status(500).json({ message: 'Error al obtener tickets' });
    }
}

/* ============ READ: ticket por id ============ */
async function get(req, res) {
    try {
        const row = await ticketService.getTicketById(req.params.id);
        if (!row) return res.status(404).json({ message: 'Ticket no encontrado' });
        res.json(row);
    } catch (e) {
        res.status(500).json({ message: 'Error al obtener el ticket' });
    }
}

/* ============ CREATE: crear ticket ============ */
async function create(req, res) {
    try {
        const { subject, category_id, responsible_id, agent_id, status, description } = req.body;

        if (!subject?.trim()) return res.status(400).json({ message: 'subject es requerido' });
        if (!category_id) return res.status(400).json({ message: 'category_id es requerido' });
        if (!responsible_id) return res.status(400).json({ message: 'responsible_id es requerido' });
        if (!agent_id) return res.status(400).json({ message: 'agent_id es requerido' });
        if (!status) return res.status(400).json({ message: 'status es requerido' });

        const newRow = await ticketService.createTicket({
            subject, category_id, responsible_id, agent_id, status, description
        });
        res.status(201).json(newRow);
    } catch (e) {
        res.status(400).json({ message: 'Error al crear ticket' });
    }
}

/* ============ UPDATE: (con tus reglas) ============ */
async function updateTicket(req, res) {
    try {
        const ticketId = req.params.id;
        const current = await ticketService.getTicketById(ticketId);
        if (!current) return res.status(404).json({ message: 'Ticket no encontrado' });

        const user = req.user; // { id, role_id, name }

        // Solo el agente asignado o admin puede editar/cerrar
        if (![ROLES.ADMIN, ROLES.SUPERADMIN].includes(user.role_id) &&
            Number(user.id) !== Number(current.agent_id)) {
            return res.status(403).json({ message: 'No tienes permisos para modificar este ticket' });
        }

        // Cerrar: mismo refuerzo
        if (req.body.status === 'cerrado') {
            if (![ROLES.ADMIN, ROLES.SUPERADMIN].includes(user.role_id) &&
                Number(user.id) !== Number(current.agent_id)) {
                return res.status(403).json({ message: 'Solo el agente asignado (o admin) puede cerrar el ticket' });
            }
        }

        // Reasignar agente: solo admin
        if (req.body.agent_id && Number(req.body.agent_id) !== Number(current.agent_id)) {
            if (![ROLES.ADMIN, ROLES.SUPERADMIN].includes(user.role_id)) {
                return res.status(403).json({ message: 'Solo un administrador puede reasignar el agente de un ticket' });
            }
        }

        const updated = await ticketService.updateTicket(ticketId, req.body);
        res.json(updated);
    } catch (error) {
        res.status(400).json({ message: 'Error al actualizar el ticket' });
    }
}

/* ============ DELETE: (con tu regla) ============ */
async function deleteTicket(req, res) {
    try {
        const ticketId = req.params.id;
        const current = await ticketService.getTicketById(ticketId);
        if (!current) return res.status(404).json({ message: 'Ticket no encontrado' });

        const user = req.user;
        if (![ROLES.ADMIN, ROLES.SUPERADMIN].includes(user.role_id) &&
            Number(user.id) !== Number(current.agent_id)) {
            return res.status(403).json({ message: 'No tienes permisos para eliminar este ticket' });
        }

        await ticketService.deleteTicket(ticketId);
        res.json({ message: 'Ticket eliminado' });
    } catch {
        res.status(500).json({ message: 'Error al eliminar ticket' });
    }
}

/* ============ READ: paginado/filtrado ============ */
async function listPaged(req, res) {
    try {
        const user = req.user; // { id, role_id, ... }
        const admin = isAdmin(user.role_id);

        // Normaliza filtros del querystring
        const {
            q,
            status,
            category_id,
            agent_id,
            responsible_id,
            date_from, date_to,   // variante 1
            from, to,             // variante 2
            scope,                // all | as_responsible | as_agent (no-admin)
            page, pageSize, sort, dir,
        } = req.query;

        // Construye objeto "safe" sin usar ninguna variable "query"
        const safe = {
            q: q ?? undefined,
            status: status ?? undefined,
            category_id: category_id ? Number(category_id) : undefined,
            from: (date_from || from) ?? undefined,
            to: (date_to || to) ?? undefined,
            page, pageSize, sort, dir,
            isAdmin: admin,
            userId: user.id,
        };

        if (admin) {
            if (agent_id) safe.agent_id = Number(agent_id);
            if (responsible_id) safe.responsible_id = Number(responsible_id);
        } else {
            safe.scope = ['as_responsible', 'as_agent', 'all'].includes(scope) ? scope : 'all';
            // Asegura que nadie fuerce filtros de otros usuarios
            delete safe.agent_id;
            delete safe.responsible_id;
        }

        const result = await ticketService.listPaged(safe);
        res.json(result);
    } catch (e) {
        console.error('tickets.listPaged error:', e);
        res.status(500).json({ message: 'Error al listar tickets' });
    }
}

module.exports = {
    list,          // ← nombre que esperan tus rutas
    get,           // ← nombre que esperan tus rutas
    create,        // ← nombre que esperan tus rutas
    updateTicket,
    deleteTicket,
    listPaged
};
