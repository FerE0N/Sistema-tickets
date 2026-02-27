// src/tickets/[id]/page.jsx
'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import Modal from '@/components/Modal';
import TicketForm from '@/components/forms/TicketForm';

export default function TicketDetailPage() {
    const params = useParams(); // { id: '...' }
    const router = useRouter();
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const [me, setMe] = useState(null);
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [error, setError] = useState('');

    const load = async () => {
        setLoading(true);
        setError('');
        try {
            if (!token) {
                // si no hay token, manda a login (opcional)
                router.push('/login');
                return;
            }

            const { user } = await apiFetch('/auth/me', { token });
            setMe(user);

            const t = await apiFetch(`/tickets/${params.id}`, { token });
            // --- Autorización en cliente: solo ver si es admin, agente o responsable ---
            const isAdmin = [1, 2].includes(Number(user.role_id));
            const isAgent = Number(user.id) === Number(t.agent_id);
            const ownsTicket = Number(user.id) === Number(t.responsible_id);

            if (!(isAdmin || isAgent || ownsTicket)) {
                setTicket(null);
                setError('No autorizado: este ticket no pertenece a tu cuenta.');
                return;
            }

            setTicket(t);
        } catch (e) {
            setError(e.message || 'Error al cargar');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [params.id]);

    const perms = useMemo(() => {
        const isAdmin = me ? [1, 2].includes(Number(me.role_id)) : false;
        const isAgent = me && ticket ? Number(me.id) === Number(ticket.agent_id) : false;
        const ownsTicket = me && ticket ? Number(me.id) === Number(ticket.responsible_id) : false;

        return {
            isAdmin,
            isAgent,
            ownsTicket,
            canEdit: isAdmin || isAgent,   // editar solo admin/agent
            canClose: isAdmin || isAgent,  // cerrar solo admin/agent
            canAssign: isAdmin             // reasignar solo admin
        };
    }, [me, ticket]);

    const closeTicket = async () => {
        if (!confirm('¿Cerrar este ticket?')) return;
        try {
            await apiFetch(`/tickets/${ticket.ticket_id}`, { method: 'PUT', token, body: { status: 'cerrado' } });
            await load();
        } catch (e) { alert(e.message); }
    };

    const reassign = async () => {
        const agent = prompt('Nuevo agent_id:'); if (!agent) return;
        try {
            await apiFetch(`/tickets/${ticket.ticket_id}`, { method: 'PUT', token, body: { agent_id: Number(agent) } });
            await load();
        } catch (e) { alert(e.message); }
    };

    const onSaved = async () => {
        setOpen(false);
        await load();
    };

    if (loading) return <div className="p-6">Cargando…</div>;
    if (error) return <div className="p-6 text-red-600">{error}</div>;
    if (!me) return <div className="p-6">Cargando usuario…</div>;
    if (!ticket) return <div className="p-6">Ticket no encontrado</div>;

    return (
        <main className="p-6 max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl">Ticket #{ticket.ticket_id}</h1>
                <a className="underline" href="/tickets">← Volver</a>
            </div>

            <div className="border rounded p-4 space-y-2">
                <div><b>Asunto:</b> {ticket.subject}</div>
                <div><b>Estado:</b> {ticket.status}</div>
                <div><b>Categoría:</b> {ticket.category_name ?? ticket.category_id}</div>
                <div><b>Responsable:</b> {ticket.responsible_name ?? ticket.responsible_id}</div>
                <div><b>Agente:</b> {ticket.agent_name ?? ticket.agent_id}</div>
                <div><b>Creado:</b> {ticket.created_at?.slice(0, 19).replace('T', ' ')}</div>
                <div><b>Actualizado:</b> {ticket.updated_at?.slice(0, 19).replace('T', ' ')}</div>
                <div>
                    <b>Descripción:</b>
                    <div className="whitespace-pre-wrap">{ticket.description || '(sin descripción)'}</div>
                </div>
            </div>

            <div className="flex gap-2 mt-4">
                {perms.canEdit && (
                    <button className="px-3 py-1 border rounded" onClick={() => setOpen(true)}>
                        Editar
                    </button>
                )}
                {perms.canClose && ticket.status !== 'cerrado' && (
                    <button className="px-3 py-1 border rounded" onClick={closeTicket}>
                        Cerrar
                    </button>
                )}
                {perms.canAssign && (
                    <button className="px-3 py-1 border rounded" onClick={reassign}>
                        Reasignar agente
                    </button>
                )}
            </div>

            <Modal open={open} title="Editar ticket" onClose={() => setOpen(false)}>
                <TicketForm
                    token={token}
                    initial={ticket}
                    onCancel={() => setOpen(false)}
                    onSaved={onSaved}
                    // Para usuarios no admin, evita que cambien campos sensibles desde el formulario
                    hiddenFields={perms.isAdmin ? [] : ['responsible_id']}
                    disabledFields={perms.isAdmin ? [] : ['category_id', 'agent_id', 'status']}
                />
            </Modal>
        </main>
    );
}
