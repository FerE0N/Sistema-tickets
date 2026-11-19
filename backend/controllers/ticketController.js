// controllers/ticketController.js
const ticketService = require('../services/ticketService');
const { isAdmin } = require('../middleware/authMiddleware');

const toId = (v) => {
    const n = Number(v);
    return Number.isInteger(n) && n > 0 ? n : null;
};

// Un auxiliar solo ve los tickets donde es agente o responsable
const canView = (user, t) =>
    isAdmin(user.role_id) || Number(t.agent_id) === Number(user.id) || Number(t.responsible_id) === Number(user.id);

async function list(req, res) {
    try {
        const rows = await ticketService.getAllTickets(
            isAdmin(req.user.role_id) ? {} : { visibleTo: req.user.id }
        );
        res.json(rows);
    } catch (e) {
        console.error('tickets.list error:', e.message);
        res.status(500).json({ message: 'Error al obtener tickets' });
    }
}

async function get(req, res) {
    try {
        const id = toId(req.params.id);
        if (!id) return res.status(400).json({ message: 'id inválido' });
        const row = await ticketService.getTicketById(id);
        if (!row || !canView(req.user, row)) return res.status(404).json({ message: 'Ticket no encontrado' });
        res.json(row);
    } catch (e) {
        console.error('tickets.get error:', e.message);
        res.status(500).json({ message: 'Error al obtener el ticket' });
    }
}

async function create(req, res) {
    try {
        const { subject, category_id, agent_id, status = 'abierto', description } = req.body || {};
        // Un auxiliar siempre queda como responsable del ticket que crea
        const responsible_id = isAdmin(req.user.role_id)
            ? toId(req.body?.responsible_id) ?? req.user.id
            : req.user.id;

        if (!subject?.trim()) return res.status(400).json({ message: 'subject es requerido' });
        if (!toId(category_id)) return res.status(400).json({ message: 'category_id es requerido' });
        if (!toId(agent_id)) return res.status(400).json({ message: 'agent_id es requerido' });
        if (!ticketService.STATUSES.includes(status)) return res.status(400).json({ message: 'status no válido' });

        const newRow = await ticketService.createTicket({
            subject: subject.trim(), category_id: toId(category_id), responsible_id,
            agent_id: toId(agent_id), status, description,
        });
        res.status(201).json(newRow);
    } catch (e) {
        if (e.code === '23503') return res.status(400).json({ message: 'Categoría o usuario inexistente' });
        console.error('tickets.create error:', e.message);
        res.status(500).json({ message: 'Error al crear ticket' });
    }
}

async function updateTicket(req, res) {
    try {
        const id = toId(req.params.id);
        if (!id) return res.status(400).json({ message: 'id inválido' });
        const current = await ticketService.getTicketById(id);
        if (!current || !canView(req.user, current)) return res.status(404).json({ message: 'Ticket no encontrado' });

        const admin = isAdmin(req.user.role_id);
        // Solo el agente asignado o un admin pueden modificar o cerrar el ticket
        if (!admin && Number(req.user.id) !== Number(current.agent_id)) {
            return res.status(403).json({ message: 'No tienes permisos para modificar este ticket' });
        }

        const body = { ...req.body };
        if (body.status !== undefined && !ticketService.STATUSES.includes(body.status)) {
            return res.status(400).json({ message: 'status no válido' });
        }
        if (!admin) {
            if (body.agent_id !== undefined && Number(body.agent_id) !== Number(current.agent_id)) {
                return res.status(403).json({ message: 'Solo un administrador puede reasignar el agente de un ticket' });
            }
            delete body.responsible_id;
        }

        const updated = await ticketService.updateTicket(id, body);
        res.json(updated);
    } catch (e) {
        if (e.code === '23503') return res.status(400).json({ message: 'Categoría o usuario inexistente' });
        console.error('tickets.update error:', e.message);
        res.status(500).json({ message: 'Error al actualizar el ticket' });
    }
}

async function deleteTicket(req, res) {
    try {
        const id = toId(req.params.id);
        if (!id) return res.status(400).json({ message: 'id inválido' });
        const current = await ticketService.getTicketById(id);
        if (!current || !canView(req.user, current)) return res.status(404).json({ message: 'Ticket no encontrado' });

        if (!isAdmin(req.user.role_id) && Number(req.user.id) !== Number(current.agent_id)) {
            return res.status(403).json({ message: 'No tienes permisos para eliminar este ticket' });
        }

        await ticketService.deleteTicket(id);
        res.json({ message: 'Ticket eliminado' });
    } catch (e) {
        console.error('tickets.delete error:', e.message);
        res.status(500).json({ message: 'Error al eliminar ticket' });
    }
}

async function listPaged(req, res) {
    try {
        const me = Number(req.user.id);
        const { q, status, category_id, agent_id, responsible_id, mine, page, pageSize, sort, dir } = req.query;
        const filters = {
            q, status, category_id,
            from: req.query.from || req.query.date_from,
            to: req.query.to || req.query.date_to,
            page, pageSize, sort, dir,
        };

        if (isAdmin(req.user.role_id)) {
            if (mine) filters.mine = me;
            filters.agent_id = toId(agent_id);
            filters.responsible_id = toId(responsible_id);
        } else if (toId(agent_id) === me) {
            filters.agent_id = me;            // vista "como agente"
        } else if (toId(responsible_id) === me) {
            filters.responsible_id = me;      // vista "como responsable"
        } else {
            filters.mine = me;                // por defecto: solo mis tickets
        }

        res.json(await ticketService.listPaged(filters));
    } catch (e) {
        console.error('tickets.listPaged error:', e.message);
        res.status(500).json({ message: 'Error al listar tickets' });
    }
}

module.exports = { list, get, create, updateTicket, deleteTicket, listPaged };
