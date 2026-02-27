//src/app/(app)/register
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import BackBar from '@/components/BackBar';
import DepartamentoSelector from '@/components/DepartamentoSelector';
import RoleSelector from '@/components/RoleSelector';

// Si ya usas el kit de formularios (UseForm.jsx) puedes importarlo;
// si no, este componente usa directamente las clases de CSS que ya definiste.

export default function RegisterPage() {
    const router = useRouter();

    const [form, setForm] = useState({
        name: '',
        last_name: '',
        email: '',
        password: '',
        role_id: 2,        // por defecto Admin (ajusta si prefieres 3 = Auxiliar)
        department_id: ''
    });

    const [isAdmin, setIsAdmin] = useState(false);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({}); // { field: 'mensaje' }
    const [errMsg, setErrMsg] = useState('');

    // ¿quién está logueado? (para permitir cambiar rol si es admin)
    useEffect(() => {
        try {
            const raw = localStorage.getItem('user');
            const u = raw ? JSON.parse(raw) : null;
            const admin = u && (u.role_id === 1 || u.role_id === 2);
            setIsAdmin(Boolean(admin));
        } catch {
            setIsAdmin(false);
        }
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((f) => ({ ...f, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => {
                const { [name]: _omit, ...rest } = prev;
                return rest;
            });
        }
        if (errMsg) setErrMsg('');
    };

    const validate = () => {
        const errs = {};
        if (!form.name.trim()) errs.name = 'El nombre es obligatorio.';
        if (!form.last_name.trim()) errs.last_name = 'El apellido es obligatorio.';
        if (!form.email.trim()) errs.email = 'El correo es obligatorio.';
        else if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Correo no válido.';
        if (!form.password.trim()) errs.password = 'La contraseña es obligatoria.';
        // role_id y department_id ya se controlan por los selectores externos
        return errs;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrMsg('');
        const errs = validate();
        setErrors(errs);
        if (Object.keys(errs).length > 0) return;

        setSaving(true);
        try {
            const res = await fetch('http://localhost:4000/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data?.message || 'Error al registrar');

            // feedback y salida
            alert('Usuario registrado correctamente');
            router.push('/login');
        } catch (err) {
            setErrMsg(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <main className="app-shell page-stack">
            <BackBar />

            {/* Encabezado tipo “hero” suave */}
            <section className="glass-panel" style={{ padding: '1rem 1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="login-badge" style={{ width: 82, height: 82, borderRadius: "50%" }}>
                        {/* Si tienes un logo en /public, úsalo aquí */}
                        <img src="/images/logo_tickets.jpg" alt="Logo" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: "50%" }} />
                    </div>
                    <div>
                        <h1 className="hero-title" style={{ color: '#fff' }}>Registro de usuario</h1>
                        <p className="text-white" style={{ opacity: .85, marginTop: 4, fontSize: '.95rem' }}>
                            Crea una cuenta para comenzar a gestionar tus tickets.
                        </p>
                    </div>
                </div>
            </section>

            {/* Formulario principal */}
            <form onSubmit={handleSubmit} className="form">

                <section className="form-section">
                    <h2 className="form-section-title">Información personal</h2>

                    <div className="form-grid">
                        <div className="form-field">
                            <label htmlFor="name" className="form-label">Nombre</label>
                            <input
                                id="name"
                                name="name"
                                className={`input ${errors.name ? 'field-error' : ''}`}
                                placeholder="Nombre"
                                value={form.name}
                                onChange={handleChange}
                                disabled={saving}
                            />
                            {errors.name && <div className="error-text">{errors.name}</div>}
                        </div>

                        <div className="form-field">
                            <label htmlFor="last_name" className="form-label">Apellido</label>
                            <input
                                id="last_name"
                                name="last_name"
                                className={`input ${errors.last_name ? 'field-error' : ''}`}
                                placeholder="Apellido"
                                value={form.last_name}
                                onChange={handleChange}
                                disabled={saving}
                            />
                            {errors.last_name && <div className="error-text">{errors.last_name}</div>}
                        </div>

                        <div className="form-field">
                            <label htmlFor="email" className="form-label">Correo</label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                className={`input ${errors.email ? 'field-error' : ''}`}
                                placeholder="usuario@correo.com"
                                value={form.email}
                                onChange={handleChange}
                                disabled={saving}
                            />
                            {errors.email && <div className="error-text">{errors.email}</div>}
                        </div>

                        <div className="form-field">
                            <label htmlFor="password" className="form-label">Contraseña</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                className={`input ${errors.password ? 'field-error' : ''}`}
                                placeholder="••••••••"
                                value={form.password}
                                onChange={handleChange}
                                disabled={saving}
                            />
                            {errors.password && <div className="error-text">{errors.password}</div>}
                        </div>
                    </div>
                </section>

                <section className="form-section">
                    <h2 className="form-section-title">Rol y departamento</h2>

                    <div className="form-grid">
                        {/* RoleSelector controla el valor y el cambio del rol; “isAdmin” decide qué opciones mostrar */}
                        <div className="form-field">
                            <label className="form-label">Rol</label>
                            <RoleSelector
                                value={form.role_id}
                                onChange={(role_id) => setForm((f) => ({ ...f, role_id }))}
                                isAdmin={isAdmin}
                            />
                            <div className="form-help">Solo un administrador puede asignar roles diferentes al predeterminado.</div>
                        </div>

                        <div className="form-field">
                            <DepartamentoSelector
                                value={form.department_id}
                                onChange={(depId) => setForm((f) => ({ ...f, department_id: depId }))}
                            />
                            <div className="form-help">Opcional. Puedes dejarlo en blanco.</div>
                        </div>
                    </div>
                </section>

                {errMsg && (
                    <div className="alert">{errMsg}</div>
                )}

                <div className="form-actions">
                    <button type="button" className="btn btn-ghost" onClick={() => router.push('/login')} disabled={saving}>
                        Cancelar
                    </button>
                    <button type="submit" className="btn btn-brand" disabled={saving}>
                        {saving && <span className="spinner" />}
                        Registrar
                    </button>
                </div>
            </form>
        </main>
    );
}
