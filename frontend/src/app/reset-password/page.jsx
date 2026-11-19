// src/app/reset-password/page.jsx
'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { API } from '@/lib/config';

export default function ResetPasswordPage() {
    // useSearchParams necesita un límite de Suspense para el prerender de Next.js
    return (
        <Suspense fallback={null}>
            <ResetPasswordForm />
        </Suspense>
    );
}

function ResetPasswordForm() {
    const sp = useSearchParams();
    const token = sp.get('token') || '';

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState('');
    const [ok, setOk] = useState(false);

    useEffect(() => {
        if (!token) setErr('Token no encontrado. Repite el proceso de recuperación.');
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErr('');
        if (!token) return setErr('Falta el token de recuperación.');
        if (!password.trim() || !confirm.trim()) return setErr('Completa ambos campos.');
        if (password !== confirm) return setErr('Las contraseñas no coinciden.');
        if (password.length < 8) return setErr('La nueva contraseña debe tener al menos 8 caracteres.');

        try {
            setLoading(true);
            const res = await fetch(`${API}/api/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message || 'No se pudo cambiar la contraseña');
            setOk(true);
        } catch (e) {
            setErr(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden">
            <main className="relative">
                <div className="container" style={{ display: 'grid', placeItems: 'center', minHeight: '100dvh' }}>
                    <section className="panel-glass" style={{ width: '100%', maxWidth: 520, padding: '28px' }}>
                        {/* Logo grande */}
                        <div className="text-center stack">
                            <div style={{ display: 'grid', placeContent: 'center' }}>
                                <div className="login-badge" style={{ width: 72, height: 72, borderRadius: "50%" }}>
                                    <img
                                        src="/images/logo_tickets.jpg"
                                        alt="Logo"
                                        style={{ width: 70, height: 70, objectFit: 'cover', borderRadius: "50%" }}
                                    />
                                </div>
                            </div>
                            <h1 className="hero-title" style={{ color: '#fff', textAlign: 'center' }}>
                                Crear nueva contraseña
                            </h1>
                            <p className="text-white" style={{ opacity: .85, textAlign: 'center' }}>
                                Elige una contraseña segura y guárdala en un lugar seguro.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="stack-lg" style={{ marginTop: 18 }}>
                            <div>
                                <label className="text-white" style={{ fontSize: '.9rem', opacity: .9, display: 'block', marginBottom: 6 }}>
                                    Nueva contraseña
                                </label>
                                <input
                                    type="password"
                                    className="input input-lg"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    style={{
                                        borderColor: 'rgba(255,255,255,.28)',
                                        background: 'rgba(255,255,255,.12)',
                                        color: '#fff'
                                    }}
                                />
                            </div>

                            <div>
                                <label className="text-white" style={{ fontSize: '.9rem', opacity: .9, display: 'block', marginBottom: 6 }}>
                                    Confirmar contraseña
                                </label>
                                <input
                                    type="password"
                                    className="input input-lg"
                                    placeholder="••••••••"
                                    value={confirm}
                                    onChange={(e) => setConfirm(e.target.value)}
                                    style={{
                                        borderColor: 'rgba(255,255,255,.28)',
                                        background: 'rgba(255,255,255,.12)',
                                        color: '#fff'
                                    }}
                                />
                            </div>

                            {err && <div className="alert">{err}</div>}

                            {ok ? (
                                <div className="panel" style={{ padding: '12px', borderRadius: 12, background: 'rgba(16,185,129,.12)', border: '1px solid rgba(16,185,129,.35)', color: '#eafff5' }}>
                                    ¡Contraseña actualizada! Ya puedes iniciar sesión.
                                </div>
                            ) : (
                                <button
                                    type="submit"
                                    className="btn btn-white btn-lg"
                                    disabled={loading || !token}
                                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                                >
                                    {loading && <span className="spinner" />}
                                    Guardar contraseña
                                </button>
                            )}
                        </form>

                        <div className="stack" style={{ marginTop: 18, textAlign: 'center' }}>
                            <Link href="/login" className="link-ghost">Ir al inicio de sesión</Link>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}
