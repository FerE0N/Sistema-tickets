// src/app/admin/tickets/page.jsx
'use client';

import { useState } from 'react';
import { useTable } from '@/hooks/useTable';
import { apiFetch } from '@/lib/api';
import TicketForm from '@/components/forms/TicketForm';
import BackBar from '@/components/BackBar';

// Presentacionales
import TicketsTable from '@/components/tickets/TicketsTable';
import TicketsPager from '@/components/tickets/TicketsPager';

// 🔔 Hook de tiempo real
import { useSSERefresh } from '@/hooks/useSSERefresh';
import SlideOver from '@/components/SlideOver';

export default function TicketsAdminPage() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const {
        state,
        data,
        loading,
        error,
        setPage,
        setPageSize,
        setSortBy,
        setFilters,
    } = useTable({
        basePath: '/tickets/paged',
        token,
        enabled: !!token,
        initial: { pageSize: 10, sort: 't.created_at', dir: 'DESC', filters: {} },
        debug: process.env.NODE_ENV === 'development',
    });

    // ⏱️ Suscripción en tiempo real (SSE con fallback a polling)
    useSSERefresh({
        onTicketChange: () => {
            // Refetch sin tocar los filtros actuales
            setFilters((f) => ({ ...f }));
        },
    });

    // --- DRAFT de filtros (no aplica hasta click en Filtrar) ---
    const [draft, setDraft] = useState({
        q: '',
        status: '',
        category_id: '',
        agent_id: '',
        responsible_id: '',
        from: '',
        to: '',
    });

    // helper: construye objeto de filtros sin claves vacías
    // helper: construye filters sin claves vacías y con ALIAS para status/fechas
    const buildFilters = (d) => {
        const out = {};
        const toNum = (v) => {
            if (v === '' || v == null) return undefined;
            const n = Number(v);
            return Number.isFinite(n) ? n : undefined;
        };

        // Mapeo posible de estatus (ajústalo si tu API usa otros)
        const statusMap = {
            'abierto': 'open',
            'en progreso': 'in_progress',
            'cerrado': 'closed',
        };

        // Texto libre
        if (d.q?.trim()) {
            const q = d.q.trim();
            out.q = q;
            // Alias comunes
            out.search = q;
            out.query = q;
        }

        // Status: enviamos varias variantes por si el backend usa otra
        if (d.status) {
            const s = d.status;              // español
            const code = statusMap[s] || s;  // código en inglés si aplica
            out.status = code;               // status=open|...
            out.estado = s;                  // estado=cerrado|...
            out.status_eq = code;            // status_eq=open|...
            out.state = code;                // state=open|...
        }

        // IDs numéricos
        const cid = toNum(d.category_id);
        if (cid !== undefined) out.category_id = cid;

        const aid = toNum(d.agent_id);
        if (aid !== undefined) out.agent_id = aid;

        const rid = toNum(d.responsible_id);
        if (rid !== undefined) out.responsible_id = rid;

        // Fechas: también mandamos alias comunes
        if (d.from) {
            out.from = d.from;
            out.created_from = d.from;
            out.date_from = d.from;
        }
        if (d.to) {
            out.to = d.to;
            out.created_to = d.to;
            out.date_to = d.to;
        }

        return out;
    };

    const apply = () => {
        const f = buildFilters(draft);
        // útil para depurar: ver qué mandamos realmente
        // console.debug('[admin/tickets] apply =>', f);
        setFilters(f);
        setPage(1);
    };

    const clear = () => {
        setDraft({
            q: '',
            status: '',
            category_id: '',
            agent_id: '',
            responsible_id: '',
            from: '',
            to: '',
        });
        setFilters({}); // objeto vacío => sin filtros
        setPage(1);
    };

    const closeTicket = async (id) => {
        try {
            await apiFetch(`/tickets/${id}`, { method: 'PUT', token, body: { status: 'cerrado' } });
            setFilters((x) => ({ ...x })); // refetch
        } catch (e) {
            alert(e.message);
        }
    };

    const reassign = async (id) => {
        const agent = prompt('Nuevo agent_id:');
        if (!agent) return;
        try {
            await apiFetch(`/tickets/${id}`, { method: 'PUT', token, body: { agent_id: Number(agent) } });
            setFilters((x) => ({ ...x })); // refetch
        } catch (e) {
            alert(e.message);
        }
    };

    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const openCreate = () => { setEditing(null); setOpen(true); };
    const openEdit = (t) => { setEditing(t); setOpen(true); };
    const onSaved = () => { setOpen(false); setEditing(null); setFilters((f) => ({ ...f })); };

    return (
        <main className="page-stack">
            <BackBar />
            <h1 className="text-2xl mb-2 text-white">Tickets</h1>

            {/* === Filtros con glass === */}
            <section className="admin-filters glass-panel">
                <div className="filt-field" style={{ gridColumn: 'span 3' }}>
                    <label className="filt-label">Buscar</label>
                    <input
                        className="filt-input"
                        placeholder="Asunto o descripción…"
                        value={draft.q}
                        onChange={(e) => setDraft({ ...draft, q: e.target.value })}
                    />
                </div>

                <div className="filt-field" style={{ gridColumn: 'span 2' }}>
                    <label className="filt-label">Estado</label>
                    <select
                        className="filt-select"
                        value={draft.status}
                        onChange={(e) => setDraft({ ...draft, status: e.target.value })}
                    >
                        <option value="">(todos)</option>
                        <option value="abierto">abierto</option>
                        <option value="en progreso">en progreso</option>
                        <option value="cerrado">cerrado</option>
                    </select>
                </div>

                <div className="filt-field">
                    <label className="filt-label">Categoría</label>
                    <input
                        className="filt-input"
                        placeholder="category_id"
                        value={draft.category_id}
                        onChange={(e) =>
                            setDraft({ ...draft, category_id: e.target.value.replace(/\D/g, '') })
                        }
                    />
                </div>

                <div className="filt-field">
                    <label className="filt-label">Agente</label>
                    <input
                        className="filt-input"
                        placeholder="agent_id"
                        value={draft.agent_id}
                        onChange={(e) =>
                            setDraft({ ...draft, agent_id: e.target.value.replace(/\D/g, '') })
                        }
                    />
                </div>

                <div className="filt-field">
                    <label className="filt-label">Responsable</label>
                    <input
                        className="filt-input"
                        placeholder="responsible_id"
                        value={draft.responsible_id}
                        onChange={(e) =>
                            setDraft({ ...draft, responsible_id: e.target.value.replace(/\D/g, '') })
                        }
                    />
                </div>

                <div className="filt-field">
                    <label className="filt-label">Desde</label>
                    <input
                        type="date"
                        className="filt-date"
                        value={draft.from}
                        onChange={(e) => setDraft({ ...draft, from: e.target.value })}
                    />
                </div>

                <div className="filt-field">
                    <label className="filt-label">Hasta</label>
                    <input
                        type="date"
                        className="filt-date"
                        value={draft.to}
                        onChange={(e) => setDraft({ ...draft, to: e.target.value })}
                    />
                </div>

                <div className="filt-actions" style={{ gridColumn: 'span 3' }}>
                    <button className="btn-mini" onClick={apply}>Filtrar</button>
                    <button className="btn-mini" onClick={clear}>Limpiar</button>
                    <button className="btn-mini btn-create" onClick={openCreate}>+ Crear ticket</button>
                </div>
            </section>

            {/* === Tabla + paginación === */}
            {loading ? (
                <div className="glass-panel" style={{ padding: '1rem', color: '#fff' }}>Cargando…</div>
            ) : error ? (
                <div className="glass-panel" style={{ padding: '1rem', color: '#ffe1e1', borderColor: 'rgba(239,68,68,.4)' }}>
                    {error}
                </div>
            ) : (
                <>
                    <TicketsTable
                        data={data}
                        admin
                        onEdit={openEdit}
                        onClose={closeTicket}
                        onReassign={reassign}
                        debug // <- activa logs
                    />
                    {/* DEBUG temporal: quítalo cuando verifiques */}
                    <section className="glass-panel" style={{ padding: '8px 12px', color: '#fff', fontSize: 12 }}>
                        <div><b>QueryString</b> (useTable): <code>{state?.filters ? JSON.stringify(state.filters) : '{}'}</code></div>
                        <div><b>Items recibidos:</b> {Array.isArray(data?.items) ? data.items.length : (Array.isArray(data?.rows) ? data.rows.length : 0)}</div>
                    </section>

                    <TicketsPager
                        data={data}
                        page={state.page}
                        pageSize={state.pageSize}
                        setPage={setPage}
                        setPageSize={setPageSize}
                    />
                </>
            )}

            {/* === Panel deslizante con el formulario === */}
            <SlideOver
                open={open}
                title={editing ? 'Editar ticket' : 'Crear ticket'}
                onClose={() => setOpen(false)}
                width={520}
            >
                <TicketForm
                    token={token}
                    initial={editing}
                    onCancel={() => setOpen(false)}
                    onSaved={onSaved}
                    // Si en admin quieres permitir cambiar responsable, quita estas dos props:
                    hiddenFields={['responsible_id']}
                    disabledFields={['responsible_id']}
                />
            </SlideOver>
        </main>
    );
}
