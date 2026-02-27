// src/components/forms/TicketForm.jsx
'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import Autocomplete from '../Autocomplete';

export default function TicketForm({
    token,
    initial,
    onCancel,
    onSaved,
    hiddenFields = [],     // NEW
    disabledFields = [],   // NEW
}) {
    const editing = Boolean(initial?.ticket_id);
    const [me, setMe] = useState(null);

    const [form, setForm] = useState({
        subject: '',
        category_id: '',
        responsible_id: '',
        agent_id: '',
        status: 'abierto',
        description: ''
    });

    // helpers NEW
    const isHidden = (name) => hiddenFields.includes(name);
    const isDisabled = (name) => disabledFields.includes(name);

    useEffect(() => {
        (async () => {
            try {
                const { user } = await apiFetch('/auth/me', { token });
                setMe(user);
                // Si NO se está editando, y el campo responsable no está oculto,
                // setea por defecto el responsable como el usuario actual.
                if (!editing && !isHidden('responsible_id')) {
                    setForm((f) => ({ ...f, responsible_id: user.id }));
                }
            } catch { /* ignore */ }
        })();

        if (initial) {
            // Merge inicial (manteniendo compatibilidad con tus nombres)
            setForm((f) => ({ ...f, ...initial }));
        }
    }, [initial, editing, token]);

    const onChange = (e) => {
        const { name, value } = e.target;
        if (isDisabled(name)) return; // no permitimos cambios si está deshabilitado
        setForm({ ...form, [name]: value });
    };

    const isAdmin = me && [1, 2].includes(me.role_id);

    const submit = async (e) => {
        e.preventDefault();

        // Validaciones mínimas
        if (!form.subject?.trim()) return alert('Asunto requerido');
        if (!form.category_id) return alert('Categoría requerida');
        if (!form.agent_id) return alert('Agente requerido');

        // Protección extra: si NO es admin, no puede cambiar responsable
        if (!isAdmin) {
            // Si ocultaste el campo, asumimos que el responsable debe permanecer (me.id).
            // Si está deshabilitado o visible, también evitamos cambio respecto a me.id.
            const expected = Number(me?.id);
            const requested = Number(form.responsible_id ?? expected);
            if (requested !== expected) {
                return alert('No puedes cambiar el responsable');
            }
            // Fuerza el responsable al actual por seguridad
            form.responsible_id = expected;
        }

        // Si un campo está oculto, evitamos enviar cambios accidentales:
        // (Esto respeta valores ya existentes en edición, pero no los modifica)
        const safeBody = { ...form };
        if (isHidden('responsible_id')) delete safeBody.responsible_id;
        if (isHidden('agent_id')) delete safeBody.agent_id;
        if (isHidden('category_id')) delete safeBody.category_id;
        if (isHidden('status')) delete safeBody.status;
        if (isHidden('subject')) delete safeBody.subject;
        if (isHidden('description')) delete safeBody.description;

        try {
            if (editing) {
                await apiFetch(`/tickets/${initial.ticket_id}`, { method: 'PUT', token, body: safeBody });
            } else {
                await apiFetch('/tickets', { method: 'POST', token, body: safeBody });
            }
            onSaved?.();
        } catch (err) {
            alert(err.message);
        }
    };

    return (
        <form onSubmit={submit} className="form form--on-glass">
            {/* Sección: datos principales */}
            <section className="form-section">
                <h3 className="form-section-title">Datos del ticket</h3>

                <div className="form-grid">
                    {/* Asunto */}
                    {!isHidden('subject') && (
                        <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                            <label className="form-label" htmlFor="subject">Asunto</label>
                            <input
                                id="subject"
                                name="subject"
                                className="input input-lg"
                                placeholder="Resumen corto del problema"
                                value={form.subject}
                                onChange={onChange}
                                disabled={isDisabled('subject')}
                            />
                            <div className="form-help">Ayuda a que sea fácil de encontrar.</div>
                        </div>
                    )}

                    {/* Categoría */}
                    {!isHidden('category_id') && (
                        <div className="form-field">
                            <label className="form-label">Categoría</label>
                            {isDisabled('category_id') ? (
                                // Lectura: muestra el label actual si viene en initial
                                <div className="chip glass-panel">
                                    <span><b>{initial?.category_name ?? '—'}</b></span>
                                    {initial?.category_id && (
                                        <span className="text-muted"> (id: {initial.category_id})</span>
                                    )}
                                </div>
                            ) : (
                                <Autocomplete
                                    token={token}
                                    searchPath="/categorias/search"
                                    labelKey="name"
                                    valueKey="category_id"
                                    placeholder="Buscar categoría…"
                                    initialValue={
                                        initial?.category_id
                                            ? { value: initial.category_id, label: initial.category_name }
                                            : undefined
                                    }
                                    onChange={(val) => setForm((f) => ({ ...f, category_id: val }))}
                                />
                            )}
                            <div className="form-help">Clasifica el ticket para priorizarlo mejor.</div>
                        </div>
                    )}

                    {/* Agente */}
                    {!isHidden('agent_id') && (
                        <div className="form-field">
                            <label className="form-label">Agente</label>
                            {isDisabled('agent_id') ? (
                                <div className="chip glass-panel">
                                    <span><b>{initial?.agent_name ?? '—'}</b></span>
                                    {initial?.agent_id && (
                                        <span className="text-muted"> (id: {initial.agent_id})</span>
                                    )}
                                </div>
                            ) : (
                                <Autocomplete
                                    token={token}
                                    searchPath="/users/search"
                                    labelKey="name"
                                    valueKey="user_id"
                                    placeholder="Buscar agente…"
                                    initialValue={
                                        initial?.agent_id
                                            ? { value: initial.agent_id, label: initial.agent_name }
                                            : undefined
                                    }
                                    onChange={(val) => setForm((f) => ({ ...f, agent_id: val }))}
                                />
                            )}
                            <div className="form-help">Déjalo vacío para asignarlo después si lo prefieres.</div>
                        </div>
                    )}

                    {/* Responsable */}
                    {!isHidden('responsible_id') && (
                        <>
                            {isAdmin ? (
                                <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                                    <label className="form-label">Responsable</label>
                                    {isDisabled('responsible_id') ? (
                                        <div className="chip glass-panel">
                                            <span><b>{initial?.responsible_name ?? me?.name ?? '—'}</b></span>
                                            <span className="text-muted"> (id: {initial?.responsible_id ?? me?.id ?? '—'})</span>
                                        </div>
                                    ) : (
                                        <Autocomplete
                                            token={token}
                                            searchPath="/users/search"
                                            labelKey="name"
                                            valueKey="user_id"
                                            placeholder="Buscar responsable…"
                                            initialValue={
                                                initial?.responsible_id
                                                    ? { value: initial.responsible_id, label: initial.responsible_name }
                                                    : (me ? { value: me.id, label: `${me.name}` } : undefined)
                                            }
                                            onChange={(val) => setForm((f) => ({ ...f, responsible_id: val }))}
                                        />
                                    )}
                                </div>
                            ) : (
                                // No admin: siempre lectura
                                <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                                    <label className="form-label">Responsable</label>
                                    <div className="chip glass-panel" aria-readonly>
                                        <span><b>{me?.name}</b></span>
                                        <span className="text-muted"> (id: {me?.id})</span>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </section>

            {/* Sección: descripción */}
            {!isHidden('description') && (
                <section className="form-section">
                    <h3 className="form-section-title">Descripción</h3>
                    <div className="form-field">
                        <label className="form-label" htmlFor="description">Detalles</label>
                        <textarea
                            id="description"
                            name="description"
                            rows={5}
                            className="textarea"
                            placeholder="Describe el problema con suficiente detalle para que el equipo pueda resolverlo…"
                            value={form.description}
                            onChange={onChange}
                            disabled={isDisabled('description')}
                        />
                    </div>
                </section>
            )}

            {/* Acciones */}
            <div className="form-actions">
                <button type="button" className="btn btn-ghost" onClick={onCancel}>
                    Cancelar
                </button>
                <button className="btn btn-brand">
                    {editing ? 'Guardar cambios' : 'Crear ticket'}
                </button>
            </div>
        </form>
    );
}
