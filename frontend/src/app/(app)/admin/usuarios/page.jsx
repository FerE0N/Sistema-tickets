// src/admin/usuarios/page.jsx
'use client';
import { useEffect, useMemo, useState } from 'react';
import { useTable } from '@/hooks/useTable';
import { apiFetch } from '@/lib/api';
import Modal from '@/components/Modal';
import BackBar from '@/components/BackBar';

// ⚙️ Kit de UI de formularios (inputs, grids, etc.)
import Form, {
    FormSection,
    FormTitle,
    FormGrid,
    FormField,
    Input,
    Select,
    FormActions,
} from '@/components/forms/UseForm';

function SortHeader({ label, col, current, dir, onSort, style }) {
    const is = current === col;
    const arrow = !is ? '↕' : (dir === 'ASC' ? '↑' : '↓');
    return (
        <th
            className="cursor-pointer select-none"
            onClick={() => onSort(col)}
            title="Ordenar"
            style={style}
        >
            {label} <span className="opacity-60 text-xs">{arrow}</span>
        </th>
    );
}

export default function UsuariosPage() {
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
        basePath: '/users/paged',
        token,
        initial: { pageSize: 10, sort: 'u.created_at', dir: 'DESC', filters: {} },
        debug: process.env.NODE_ENV === 'development',
    });

    // ====== Filtros (borrador) ======
    const [draft, setDraft] = useState({
        q: '',
        role_id: '',
        department_id: '',
        from: '',
        to: '',
    });

    const buildFilters = (d) => {
        const out = {};
        const toNum = (v) => {
            if (v === '' || v == null) return undefined;
            const n = Number(v);
            return Number.isFinite(n) ? n : undefined;
        };
        if (d.q?.trim()) {
            const q = d.q.trim();
            out.q = q;
            out.search = q;
            out.query = q;
            out.name_or_email = q;
        }
        const rid = toNum(d.role_id);
        if (rid !== undefined) out.role_id = rid;
        const did = toNum(d.department_id);
        if (did !== undefined) out.department_id = did;
        if (d.from) { out.from = d.from; out.created_from = d.from; }
        if (d.to) { out.to = d.to; out.created_to = d.to; }
        return out;
    };

    const applyFilters = () => { setFilters(buildFilters(draft)); setPage(1); };
    const clearFilters = () => { setDraft({ q: '', role_id: '', department_id: '', from: '', to: '' }); setFilters({}); setPage(1); };

    // ====== Acciones de fila ======
    const resetPass = async (user_id) => {
        const newPass = prompt('Nueva contraseña:');
        if (!newPass) return;
        try {
            await apiFetch(`/users/${user_id}/password`, {
                method: 'PATCH', token,
                body: { new_password: newPass, confirm_password: newPass }
            });
            alert('Contraseña actualizada');
        } catch (e) { alert(e.message); }
    };

    const remove = async (user_id) => {
        if (!confirm('¿Eliminar usuario?')) return;
        try {
            await apiFetch(`/users/${user_id}`, { method: 'DELETE', token });
            setFilters((f) => ({ ...f })); // refetch
        } catch (e) { alert(e.message); }
    };

    // ====== Modal + formulario inline ======
    const [open, setOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null); // objeto del user o null (creación)

    // Estado del formulario (inline)
    const editing = Boolean(editingUser?.user_id);
    const [form, setForm] = useState({
        name: '',
        last_name: '',
        email: '',
        role_id: 3,
        department_id: '',
        password: '',
    });
    const [deps, setDeps] = useState([]);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({}); // { field: 'mensaje' }

    // Cargar deps + hidratar form cuando se abre para editar/crear
    useEffect(() => {
        (async () => {
            try {
                const d = await apiFetch('/departamentos'); // GET público
                setDeps(Array.isArray(d) ? d : []);
            } catch { setDeps([]); }
        })();
    }, []);

    useEffect(() => {
        if (editingUser) {
            setForm({
                name: editingUser.name || '',
                last_name: editingUser.last_name || '',
                email: editingUser.email || '',
                role_id: editingUser.role_id ?? 3,
                department_id: editingUser.department_id ?? '',
                password: '', // nunca precargar
            });
        } else {
            setForm({
                name: '',
                last_name: '',
                email: '',
                role_id: 3,
                department_id: '',
                password: '',
            });
        }
        setErrors({});
    }, [editingUser, open]);

    const openCreate = () => { setEditingUser(null); setOpen(true); };
    const openEdit = (u) => { setEditingUser(u); setOpen(true); };
    const onSaved = () => { setOpen(false); setEditingUser(null); setFilters(f => ({ ...f })); };

    const onChange = (e) => {
        const { name, value } = e.target;
        setForm((f) => ({ ...f, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => {
                const { [name]: _omit, ...rest } = prev;
                return rest;
            });
        }
    };

    const validate = () => {
        const errs = {};
        if (!form.name?.trim()) errs.name = 'El nombre es obligatorio.';
        if (!form.last_name?.trim()) errs.last_name = 'El apellido es obligatorio.';
        if (!form.email?.trim()) errs.email = 'El correo es obligatorio.';
        else if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Correo no válido.';
        if (!editing && !form.password?.trim()) errs.password = 'La contraseña es obligatoria.';
        if (form.role_id == null || form.role_id === '') errs.role_id = 'Selecciona un rol.';
        return errs;
    };

    const submit = async (e) => {
        e.preventDefault();
        const errs = validate();
        setErrors(errs);
        if (Object.keys(errs).length > 0) return;

        setSaving(true);
        try {
            if (editing) {
                const { password, ...payload } = form;
                await apiFetch(`/users/${editingUser.user_id}`, { method: 'PUT', token, body: payload });
            } else {
                await apiFetch('/users', { method: 'POST', token, body: form });
            }
            onSaved();
        } catch (e) {
            alert(e.message);
        } finally {
            setSaving(false);
        }
    };

    // filas seguras para la tabla
    const rows = useMemo(
        () => (Array.isArray(data?.items) ? data.items : (Array.isArray(data?.rows) ? data.rows : [])),
        [data]
    );

    const fmt = (d) => {
        try { const dt = new Date(d); return Number.isNaN(+dt) ? '—' : dt.toLocaleString(); }
        catch { return '—'; }
    };

    return (
        <main className="page-stack">
            <BackBar />

            {/* Header */}
            <section className="glass-panel" style={{ padding: '0.9rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <h1 className="text-2xl" style={{ color: '#fff' }}>Usuarios</h1>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '.5rem' }}>
                    <button className="btn-mini btn-create" onClick={openCreate}>+ Crear usuario</button>
                </div>
            </section>

            {/* Filtros */}
            <section className="admin-filters glass-panel">
                <div className="filt-field" style={{ gridColumn: 'span 3' }}>
                    <label className="filt-label">Buscar</label>
                    <input
                        className="filt-input"
                        placeholder="Nombre o correo…"
                        value={draft.q}
                        onChange={(e) => setDraft({ ...draft, q: e.target.value })}
                    />
                </div>

                <div className="filt-field">
                    <label className="filt-label">Rol (id)</label>
                    <input
                        className="filt-input"
                        placeholder="role_id"
                        value={draft.role_id}
                        onChange={(e) => setDraft({ ...draft, role_id: e.target.value.replace(/\D/g, '') })}
                    />
                </div>

                <div className="filt-field">
                    <label className="filt-label">Depto (id)</label>
                    <input
                        className="filt-input"
                        placeholder="department_id"
                        value={draft.department_id}
                        onChange={(e) => setDraft({ ...draft, department_id: e.target.value.replace(/\D/g, '') })}
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
                    <button className="btn-mini" onClick={applyFilters}>Filtrar</button>
                    <button className="btn-mini" onClick={clearFilters}>Limpiar</button>
                </div>
            </section>

            {/* Tabla */}
            {loading ? (
                <div className="glass-panel" style={{ padding: '1rem', color: '#fff' }}>Cargando…</div>
            ) : error ? (
                <div className="glass-panel" style={{ padding: '1rem', color: '#ffe1e1', borderColor: 'rgba(239,68,68,.4)' }}>
                    {error}
                </div>
            ) : (
                <section className="table glass-panel table-admin">
                    <table className="w-full">
                        <thead>
                            <tr>
                                <SortHeader label="ID" col="u.user_id" current={state.sort} dir={state.dir} onSort={setSortBy} style={{ width: 90 }} />
                                <SortHeader label="Nombre" col="u.name" current={state.sort} dir={state.dir} onSort={setSortBy} />
                                <th>Email</th>
                                <SortHeader label="Rol" col="u.role_id" current={state.sort} dir={state.dir} onSort={setSortBy} style={{ width: 140 }} />
                                <SortHeader label="Depto" col="u.department_id" current={state.sort} dir={state.dir} onSort={setSortBy} style={{ width: 140 }} />
                                <SortHeader label="Creado" col="u.created_at" current={state.sort} dir={state.dir} onSort={setSortBy} style={{ width: 190 }} />
                                <SortHeader label="Actualizado" col="u.updated_at" current={state.sort} dir={state.dir} onSort={setSortBy} style={{ width: 190 }} />
                                <th style={{ textAlign: 'right', width: 260 }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((u) => (
                                <tr key={u.user_id}>
                                    <td>#{u.user_id}</td>
                                    <td className="cell-subject">
                                        <div className="subject">{u.name || '—'} {u.last_name || ''}</div>
                                        {u.username && <div className="muted">@{u.username}</div>}
                                    </td>
                                    <td>{u.email || '—'}</td>
                                    <td>{u.role_name ?? u.role_id ?? '—'}</td>
                                    <td>{u.department_name ?? u.department_id ?? '—'}</td>
                                    <td>{fmt(u.created_at)}</td>
                                    <td>{fmt(u.updated_at)}</td>
                                    <td className="cell-actions">
                                        <div className="row-actions">
                                            <button className="btn-row" onClick={() => openEdit(u)}>Editar</button>
                                            <button className="btn-row" onClick={() => resetPass(u.user_id)}>Reset pass</button>
                                            <button className="btn-row warn" onClick={() => remove(u.user_id)}>Eliminar</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {rows.length === 0 && (
                                <tr><td className="empty" colSpan={8}>Sin resultados</td></tr>
                            )}
                        </tbody>
                    </table>
                </section>
            )}

            {/* Paginación */}
            <div className="glass-panel" style={{ padding: '0.6rem 0.9rem', display: 'flex', gap: '.5rem', alignItems: 'center', color: '#fff' }}>
                <button className="btn-mini" disabled={(data?.page ?? 1) <= 1} onClick={() => setPage((data?.page ?? 1) - 1)}>Anterior</button>
                <div style={{ opacity: .9 }}>Página {data?.page ?? 1} / {data?.totalPages ?? 1} — {data?.total ?? 0} usuarios</div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '.5rem' }}>
                    <select className="filt-select" value={state.pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                        {[10, 20, 50].map((n) => (<option key={n} value={n}>{n} / pág.</option>))}
                    </select>
                    <button className="btn-mini" disabled={(data?.page ?? 1) >= (data?.totalPages ?? 1)} onClick={() => setPage((data?.page ?? 1) + 1)}>Siguiente</button>
                </div>
            </div>

            {/* Modal con formulario inline */}
            <Modal
                open={open}
                title={editing ? 'Editar usuario' : 'Crear usuario'}
                onClose={() => setOpen(false)}
            >
                <Form onSubmit={submit} className="form">
                    <FormSection>
                        <FormTitle>{editing ? 'Editar usuario' : 'Crear usuario'}</FormTitle>
                        <FormGrid>
                            <FormField label="Nombre" htmlFor="name" error={errors.name}>
                                <Input id="name" name="name" placeholder="Nombre" value={form.name} onChange={onChange} disabled={saving} error={!!errors.name} />
                            </FormField>
                            <FormField label="Apellido" htmlFor="last_name" error={errors.last_name}>
                                <Input id="last_name" name="last_name" placeholder="Apellido" value={form.last_name} onChange={onChange} disabled={saving} error={!!errors.last_name} />
                            </FormField>
                            <FormField label="Email" htmlFor="email" className="col-span-full" error={errors.email}>
                                <Input id="email" name="email" type="email" placeholder="usuario@correo.com" value={form.email} onChange={onChange} disabled={saving} error={!!errors.email} />
                            </FormField>
                            {!editing && (
                                <FormField label="Contraseña" htmlFor="password" className="col-span-full" error={errors.password}>
                                    <Input id="password" name="password" type="password" placeholder="••••••••" value={form.password} onChange={onChange} disabled={saving} error={!!errors.password} />
                                </FormField>
                            )}
                            <FormField label="Rol" htmlFor="role_id" error={errors.role_id}>
                                <Select id="role_id" name="role_id" value={form.role_id} onChange={onChange} disabled={saving} error={!!errors.role_id}>
                                    <option value={1}>Superadmin</option>
                                    <option value={2}>Admin</option>
                                    <option value={3}>Auxiliar</option>
                                </Select>
                            </FormField>
                            <FormField label="Departamento" htmlFor="department_id">
                                <Select id="department_id" name="department_id" value={form.department_id ?? ''} onChange={onChange} disabled={saving}>
                                    <option value="">(sin departamento)</option>
                                    {deps.map((d) => (
                                        <option key={d.department_id} value={d.department_id}>{d.department_name}</option>
                                    ))}
                                </Select>
                            </FormField>
                        </FormGrid>
                    </FormSection>

                    <FormActions>
                        <button disabled={saving} className="btn btn-brand" type="submit">
                            {saving && <span className="spinner" />} {editing ? 'Guardar cambios' : 'Crear usuario'}
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)} disabled={saving}>
                            Cancelar
                        </button>
                    </FormActions>
                </Form>
            </Modal>
        </main>
    );
}
