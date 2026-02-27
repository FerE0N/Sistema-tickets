// src/app/tickets/page.jsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TicketsTable from '@/components/tickets/TicketsTable';
import TicketsPager from '@/components/tickets/TicketsPager';
import { useTable } from '@/hooks/useTable';
import SlideOver from '@/components/SlideOver';
import TicketForm from '@/components/forms/TicketForm';
import BackBar from '@/components/BackBar';

export default function MisTicketsPage() {
    const router = useRouter();

    // --- Hooks SIEMPRE al tope (sin returns antes) ---
    const [me, setMe] = useState(null);
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const {
        state,
        data,
        loading, error,
        setPage, setPageSize, setSortBy, setFilters,
    } = useTable({
        basePath: '/tickets/paged',
        token,
        initial: { pageSize: 10, sort: 't.created_at', dir: 'DESC', filters: {} },
    });

    // filtros de usuario
    const [f, setF] = useState({
        q: '',
        status: '',
        category_id: '',
        from: '',
        to: '',
        view: 'all', // 'all' | 'agent' | 'responsible'
    });

    // panel de edición (hooks antes del posible return)
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);

    // cargar usuario/logueo
    useEffect(() => {
        if (!token) { router.replace('/login'); return; }
        try {
            const u = localStorage.getItem('user');
            if (!u) { router.replace('/login'); return; }
            setMe(JSON.parse(u));
        } catch {
            router.replace('/login');
        }
    }, [token, router]);

    // aplicar filtros cuando cambie algo
    useEffect(() => {
        if (!me) return;

        const next = {
            q: f.q || '',
            status: f.status || '',
            category_id: f.category_id || '',
            from: f.from || '',
            to: f.to || '',
        };

        if (f.view === 'agent') {
            next.agent_id = Number(me.id);
        } else if (f.view === 'responsible') {
            next.responsible_id = Number(me.id);
        } else {
            next.mine = 1; // 'all' -> míos (agente o responsable) soportado por backend
        }

        setFilters(next);
        setPage(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [me, f.q, f.status, f.category_id, f.from, f.to, f.view]);

    // acciones de auxiliar
    const openCreate = () => { setEditing(null); setOpen(true); };
    const openEdit = (t) => { setEditing(t); setOpen(true); };
    const onSaved = () => { setOpen(false); setEditing(null); setFilters((x) => ({ ...x })); };

    const onClose = undefined;      // desactivado para auxiliar
    const onReassign = undefined;   // no permitido

    // --- aquí sí podemos retornar UI ---
    if (!me) return <main className="p-6">Cargando…</main>;

    return (
        <main className="page-stack">
            <BackBar />
            <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold text-white">Mis tickets</h1>
                <div className="ml-auto" />
            </div>

            {/* Filtros (glass) */}
            <section className="admin-filters glass-panel">
                <div className="filt-field" style={{ gridColumn: 'span 3' }}>
                    <label className="filt-label">Buscar</label>
                    <input
                        className="filt-input"
                        placeholder="Asunto o descripción…"
                        value={f.q}
                        onChange={(e) => setF({ ...f, q: e.target.value })}
                    />
                </div>

                <div className="filt-field" style={{ gridColumn: 'span 2' }}>
                    <label className="filt-label">Estado</label>
                    <select
                        className="filt-select"
                        value={f.status}
                        onChange={(e) => setF({ ...f, status: e.target.value })}
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
                        value={f.category_id}
                        onChange={(e) => setF({ ...f, category_id: e.target.value.replace(/\D/g, '') })}
                    />
                </div>

                <div className="filt-field">
                    <label className="filt-label">Desde</label>
                    <input
                        type="date"
                        className="filt-date"
                        value={f.from}
                        onChange={(e) => setF({ ...f, from: e.target.value })}
                    />
                </div>

                <div className="filt-field">
                    <label className="filt-label">Hasta</label>
                    <input
                        type="date"
                        className="filt-date"
                        value={f.to}
                        onChange={(e) => setF({ ...f, to: e.target.value })}
                    />
                </div>

                <div className="filt-actions" style={{ gridColumn: 'span 3', flexWrap: 'wrap' }}>
                    <div style={{ display: 'inline-flex', gap: '.4rem', marginRight: 'auto' }}>
                        <button
                            className="btn-mini"
                            style={{ opacity: f.view === 'all' ? 1 : .8 }}
                            onClick={() => setF((x) => ({ ...x, view: 'all' }))}
                            title="Míos (agente o responsable)"
                        >
                            Míos
                        </button>
                        <button
                            className="btn-mini"
                            style={{ opacity: f.view === 'agent' ? 1 : .8 }}
                            onClick={() => setF((x) => ({ ...x, view: 'agent' }))}
                        >
                            Como Agente
                        </button>
                        <button
                            className="btn-mini"
                            style={{ opacity: f.view === 'responsible' ? 1 : .8 }}
                            onClick={() => setF((x) => ({ ...x, view: 'responsible' }))}
                        >
                            Como Responsable
                        </button>
                    </div>

                    <div style={{ display: 'inline-flex', gap: '.5rem' }}>
                        <button className="btn-mini" onClick={() => setF((x) => ({ ...x }))}>
                            Aplicar
                        </button>
                        <button
                            className="btn-mini"
                            onClick={() => setF({ q: '', status: '', category_id: '', from: '', to: '', view: f.view })}
                        >
                            Limpiar
                        </button>
                        <a href="/tickets/new" className="btn-mini btn-create" title="Crear ticket">
                            + Crear
                        </a>
                    </div>
                </div>
            </section>

            {/* Tabla + paginación */}
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
                        admin={false}
                        onEdit={openEdit}
                        onClose={onClose}
                        onReassign={undefined}
                    />
                    <TicketsPager
                        data={data}
                        page={state.page}
                        pageSize={state.pageSize}
                        setPage={setPage}
                        setPageSize={setPageSize}
                    />
                </>
            )}

            {/* Panel deslizante */}
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
                    hiddenFields={['responsible_id']}
                    disabledFields={['responsible_id']}
                />
            </SlideOver>
        </main>
    );
}
