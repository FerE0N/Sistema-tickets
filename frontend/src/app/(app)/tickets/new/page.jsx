'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AutocompleteSelect from '@/components/AutocompleteSelect';
import { API } from '@/lib/config';



export default function NewTicketPage() {
    const router = useRouter();
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const [subject, setSubject] = useState('');
    const [category, setCategory] = useState(null);       // { id, label }
    const [responsible, setResponsible] = useState(null); // { id, label }
    const [agent, setAgent] = useState(null);             // { id, label }
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Si no hay token -> login. También precargamos responsable con el usuario actual.
    useEffect(() => {
        if (!token) {
            router.replace('/login');
            return;
        }
        try {
            const raw = localStorage.getItem('user');
            if (raw) {
                const me = JSON.parse(raw);
                // Preselecciona responsable = usuario actual (coherente con TicketForm)
                setResponsible((r) => r ?? { id: me.id, label: `${me.name}` });
            }
        } catch { }
    }, [token, router]);

    const submit = async (e) => {
        e.preventDefault();
        if (!subject.trim() || !category?.id || !responsible?.id || !agent?.id) {
            alert('Completa asunto, categoría, responsable y agente.');
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch(`${API}/api/tickets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    subject,
                    category_id: category.id,
                    responsible_id: responsible.id,
                    agent_id: agent.id,
                    status: 'abierto',
                    description,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Error al crear ticket');
            alert('Ticket creado');
            router.push('/tickets'); // o '/admin/tickets' según rol
        } catch (err) {
            alert(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    // mapeos para AutocompleteSelect
    const mapUser = (u) => ({ id: u.user_id, label: `${u.name} ${u.last_name} — ${u.email}` });
    const mapCat = (c) => ({ id: c.category_id, label: c.name });

    return (
        <main className="page-stack">
            <h1 className="text-2xl font-semibold text-white">Crear ticket</h1>

            {/* ===== Formulario en vidrio ===== */}
            <form onSubmit={submit} className="form">
                {/* Sección: datos del ticket */}
                <section className="form-section">
                    <h3 className="form-section-title">Datos del ticket</h3>

                    <div className="form-grid">
                        {/* Asunto */}
                        <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                            <label className="form-label" htmlFor="subject">Asunto</label>
                            <input
                                id="subject"
                                className="filt-input"
                                placeholder="Resumen corto del problema"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                            />
                        </div>

                        {/* Categoría */}
                        <div className="form-field">
                            <label className="form-label">Categoría</label>
                            <AutocompleteSelect
                                label={null}
                                fetchUrl="/categorias/search"
                                queryParam="q"
                                token={token}
                                value={category}
                                onChange={setCategory}
                                mapItem={mapCat}
                                placeholder="Buscar categoría…"
                            />
                            <div className="form-help">Clasifica el ticket para priorizarlo mejor.</div>
                        </div>

                        {/* Responsable */}
                        <div className="form-field">
                            <label className="form-label">Responsable</label>
                            <AutocompleteSelect
                                label={null}
                                fetchUrl="/users/search"
                                queryParam="q"
                                token={token}
                                value={responsible}
                                onChange={setResponsible}
                                mapItem={mapUser}
                                placeholder="Buscar responsable…"
                            />
                        </div>

                        {/* Agente */}
                        <div className="form-field">
                            <label className="form-label">Agente</label>
                            <AutocompleteSelect
                                label={null}
                                fetchUrl="/users/search"
                                queryParam="q"
                                token={token}
                                value={agent}
                                onChange={setAgent}
                                mapItem={mapUser}
                                placeholder="Buscar agente…"
                            />
                            <div className="form-help">Puedes asignarlo ahora o dejarlo para más tarde.</div>
                        </div>
                    </div>
                </section>

                {/* Sección: descripción */}
                <section className="form-section">
                    <h3 className="form-section-title">Descripción</h3>
                    <div className="form-field">
                        <label className="form-label" htmlFor="description">Detalles</label>
                        <textarea
                            id="description"
                            className="filt-input textarea"
                            rows={6}
                            placeholder="Describe el problema con suficiente detalle…"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                </section>

                {/* Acciones */}
                <div className="form-actions">
                    <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => router.back()}
                    >
                        Cancelar
                    </button>
                    <button
                        className="btn btn-brand"
                        disabled={submitting}
                    >
                        {submitting ? 'Creando…' : 'Crear ticket'}
                    </button>
                </div>
            </form>
        </main>
    );
}
