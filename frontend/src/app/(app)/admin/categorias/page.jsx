// src/app/admin/categorias/page.jsx
'use client';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/Modal';
import BackBar from '@/components/BackBar';

export default function CategoriasAdminPage() {
    const router = useRouter();
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null); // {category_id, name}
    const [name, setName] = useState('');
    const [order, setOrder] = useState('asc'); // asc | desc

    useEffect(() => {
        if (!token) { router.replace('/login'); return; }
        fetchList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    async function fetchList() {
        setLoading(true);
        try {
            const res = await fetch('http://localhost:4000/api/categorias', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const json = await res.json();
            setRows(Array.isArray(json) ? json : (json.items || json.rows || []));
        } catch (e) {
            alert('Error al cargar categorías');
        } finally {
            setLoading(false);
        }
    }

    const openCreate = () => { setEditing(null); setName(''); setOpen(true); };
    const openEdit = (row) => { setEditing(row); setName(row.name || ''); setOpen(true); };
    const close = () => { setOpen(false); setEditing(null); setName(''); };

    async function save() {
        if (!name.trim()) { alert('Nombre requerido'); return; }
        try {
            const url = editing
                ? `http://localhost:4000/api/categorias/${editing.category_id}`
                : 'http://localhost:4000/api/categorias';
            const method = editing ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ name: name.trim() })
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.message || 'Error al guardar categoría');
            close();
            fetchList();
        } catch (e) {
            alert(e.message);
        }
    }

    async function remove(category_id) {
        if (!confirm('¿Eliminar categoría?')) return;
        try {
            const res = await fetch(`http://localhost:4000/api/categorias/${category_id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) {
                const j = await res.json();
                throw new Error(j.message || 'Error al eliminar');
            }
            fetchList();
        } catch (e) { alert(e.message); }
    }

    // 👉 Orden local por ID (cliente)
    const sorted = useMemo(() => {
        const arr = Array.isArray(rows) ? [...rows] : [];
        arr.sort((a, b) => {
            const A = Number(a?.category_id ?? 0);
            const B = Number(b?.category_id ?? 0);
            return order === 'asc' ? A - B : B - A;
        });
        return arr;
    }, [rows, order]);

    return (
        <main className="page-stack">
            <BackBar />

            {/* Header + acción principal */}
            <section className="glass-panel" style={{ padding: '0.9rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <h1 className="text-2xl" style={{ color: '#fff' }}>Categorías</h1>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '.5rem' }}>
                    <button className="btn-mini btn-create" onClick={openCreate}>+ Nueva</button>
                </div>
            </section>

            {/* Tabla */}
            {loading ? (
                <div className="glass-panel" style={{ padding: '1rem', color: '#fff' }}>Cargando…</div>
            ) : (
                <section className="table glass-panel table-admin">
                    <table className="w-full">
                        <thead>
                            <tr>
                                <th
                                    style={{ width: 120, cursor: 'pointer' }}
                                    aria-sort={order === 'asc' ? 'ascending' : 'descending'}
                                    onClick={() => setOrder(order === 'asc' ? 'desc' : 'asc')}
                                    title="Ordenar por ID"
                                >
                                    ID {order === 'asc' ? '▲' : '▼'}
                                </th>
                                <th>Nombre</th>
                                <th style={{ textAlign: 'right', width: 220 }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sorted.map((r) => (
                                <tr key={r.category_id}>
                                    <td>#{r.category_id}</td>
                                    <td className="cell-subject">
                                        <div className="subject">{r.name || '—'}</div>
                                    </td>
                                    <td className="cell-actions">
                                        <div className="row-actions">
                                            <button className="btn-row" onClick={() => openEdit(r)}>Editar</button>
                                            <button className="btn-row warn" onClick={() => remove(r.category_id)}>Eliminar</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {sorted.length === 0 && (
                                <tr>
                                    <td className="empty" colSpan={3}>Sin resultados</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </section>
            )}

            {/* Modal: crear/editar */}
            <Modal open={open} onClose={close} title={editing ? 'Editar categoría' : 'Nueva categoría'}>
                <form
                    onSubmit={(e) => { e.preventDefault(); save(); }}
                    className="form form--on-glass"
                    style={{ minWidth: 360 }}
                >
                    <section className="form-section">
                        <div className="form-grid">
                            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                                <label className="form-label" htmlFor="cat-name">Nombre</label>
                                <input
                                    id="cat-name"
                                    className="input input-lg"
                                    placeholder="Nombre de la categoría"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                        </div>
                    </section>

                    <div className="form-actions">
                        <button type="button" className="btn btn-ghost" onClick={close}>Cancelar</button>
                        <button className="btn btn-brand">{editing ? 'Guardar cambios' : 'Crear'}</button>
                    </div>
                </form>
            </Modal>
        </main>
    );
}
