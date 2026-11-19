// src/app/forgot-password/page.jsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { API } from '@/lib/config';


export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErr('');
        if (!email.trim()) return setErr('Escribe tu correo.');
        try {
            setLoading(true);
            const res = await fetch(`${API}/api/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message || 'No se pudo enviar el enlace');
            setSent(true);
        } catch (e) {
            setErr(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* Fondo animado ya está global; aquí solo centramos el contenido */}
            <main className="relative">
                <div className="container" style={{ display: 'grid', placeItems: 'center', minHeight: '100dvh' }}>
                    <section className="panel-glass" style={{ width: '100%', maxWidth: 520, padding: '28px' }}>
                        {/* Logo grande */}
                        <div className="text-center stack">
                            <div style={{ display: 'grid', placeContent: 'center' }}>
                                <div className="login-badge" style={{ width: 72, height: 72, borderRadius: "50%" }}>
                                    {/* Usa tu imagen actual */}
                                    <img
                                        src="/images/logo_tickets.jpg"
                                        alt="Logo"
                                        style={{ width: 70, height: 70, objectFit: 'cover', borderRadius: "50%" }}
                                    />
                                </div>
                            </div>
                            <h1 className="hero-title" style={{ color: '#fff', textAlign: 'center' }}>
                                Restablecer contraseña
                            </h1>
                            <p className="text-white" style={{ opacity: .85, textAlign: 'center' }}>
                                Escribe tu correo y te enviaremos un enlace de recuperación.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="stack-lg" style={{ marginTop: 18 }}>
                            <div>
                                <label className="text-white" style={{ fontSize: '.9rem', opacity: .9, display: 'block', marginBottom: 6 }}>
                                    Correo electrónico
                                </label>
                                <input
                                    type="email"
                                    className="input input-lg"
                                    placeholder="tu@correo.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    style={{
                                        borderColor: 'rgba(255,255,255,.28)',
                                        background: 'rgba(255,255,255,.12)',
                                        color: '#fff'
                                    }}
                                />
                            </div>

                            {err && <div className="alert">{err}</div>}

                            {sent ? (
                                <div className="panel" style={{ padding: '12px', borderRadius: 12, background: 'rgba(16,185,129,.12)', border: '1px solid rgba(16,185,129,.35)', color: '#eafff5' }}>
                                    ¡Listo! Si el correo existe, te enviamos un enlace de recuperación.
                                </div>
                            ) : (
                                <button
                                    type="submit"
                                    className="btn btn-white btn-lg"
                                    disabled={loading}
                                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                                >
                                    {loading && <span className="spinner" />}
                                    Enviar enlace
                                </button>
                            )}
                        </form>

                        <div className="stack" style={{ marginTop: 18, textAlign: 'center' }}>
                            <Link href="/login" className="link-ghost">Volver al inicio de sesión</Link>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}
