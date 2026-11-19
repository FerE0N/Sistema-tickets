// src/app/login/page.jsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { API } from '@/lib/config';

export default function LoginPage() {
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errMsg, setErrMsg] = useState('');

    // Si ya hay sesión, redirige al dashboard
    useEffect(() => {
        const t = localStorage.getItem('token');
        const u = localStorage.getItem('user');
        if (t && u) router.replace('/dashboard');
    }, [router]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setErrMsg('');

        if (!email.trim() || !password.trim()) {
            setErrMsg('Completa correo y contraseña.');
            return;
        }

        try {
            setLoading(true);
            const res = await fetch(`${API}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data?.message || 'Error al iniciar sesión');

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            router.replace('/dashboard');
        } catch (err) {
            setErrMsg(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* Fondo animado + patrón de puntos */}
            <div className="absolute inset-0 bg-animated-gradient" />
            <div className="absolute inset-0 bg-dots" />

            {/* Contenido */}
            <main className="relative min-h-screen">
                <div className="container" style={{ paddingTop: 48, paddingBottom: 48 }}>
                    <div className="grid-2" style={{ alignItems: 'center' }}>
                        {/* Columna izquierda: branding / mensaje */}
                        <section className="text-white stack-lg">
                            {/* Logo grande */}
                            <div className="stack">
                                <div className="login-badge">
                                    {/* Usa .svg o .jpg según tengas el archivo en /public */}
                                    <img
                                        src="/images/logo_tickets.jpg"
                                        alt="Logo"
                                        width={50}
                                        height={50}
                                        style={{ display: 'block', borderRadius: "50%" }}
                                        onError={(e) => {
                                            // fallback mínimo si no existe el archivo
                                            e.currentTarget.replaceWith(document.createTextNode('TI'));
                                        }}
                                    />
                                </div>
                                <h1 className="hero-title">Sistema de Tickets</h1>
                            </div>

                            <p style={{ color: 'rgba(255,255,255,.92)', lineHeight: 1.6 }}>
                                Centraliza reportes, acelera respuestas y da visibilidad al equipo.
                                Inicia sesión para gestionar tus tickets — o administrar toda la operación si eres parte del equipo.
                            </p>

                            <ul style={{ color: 'rgba(255,255,255,.85)', fontSize: '0.98rem' }} className="stack">
                                <li>• Seguimiento en tiempo real</li>
                                <li>• Dashboard con métricas y tendencias</li>
                                <li>• Roles y permisos por equipo</li>
                            </ul>
                        </section>

                        {/* Columna derecha: formulario (glass) */}
                        <section className="panel-glass" style={{ padding: 24 }}>
                            <h2 className="text-white" style={{ fontSize: 22, fontWeight: 650, marginBottom: 18 }}>
                                Bienvenido de nuevo
                            </h2>

                            <form onSubmit={handleLogin} className="stack-lg">
                                <div>
                                    <label className="text-white" style={{ fontSize: 14, display: 'block', marginBottom: 6 }}>
                                        Correo
                                    </label>
                                    <input
                                        type="email"
                                        autoComplete="email"
                                        placeholder="tu@correo.com"
                                        className="input input-lg input-focus-glow"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        // Ajustes para legibilidad sobre panel translúcido
                                        style={{
                                            background: 'rgba(255,255,255,0.10)',
                                            color: '#fff',
                                            borderColor: 'rgba(255,255,255,0.28)',
                                            outline: 'none',
                                        }}
                                    />
                                </div>

                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <label className="text-white" style={{ fontSize: 14 }}>
                                            Contraseña
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setShowPass(v => !v)}
                                            className="link-ghost"
                                            style={{ fontSize: 12, background: "none", border: "none" }}
                                        >
                                            {showPass ? 'Ocultar' : 'Mostrar'}
                                        </button>
                                    </div>

                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type={showPass ? 'text' : 'password'}
                                            autoComplete="current-password"
                                            placeholder="••••••••"
                                            className="input input-lg input-focus-glow"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            style={{
                                                background: 'rgba(255,255,255,0.10)',
                                                color: '#fff',
                                                borderColor: 'rgba(255,255,255,0.28)',
                                                paddingRight: 40,
                                                outline: 'none',
                                            }}
                                        />
                                        {/* iconito candado decorativo */}
                                        <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', opacity: .75 }}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                                <path d="M7 10V8a5 5 0 0 1 10 0v2" stroke="white" strokeWidth="1.5" />
                                                <rect x="5" y="10" width="14" height="10" rx="2" stroke="white" strokeWidth="1.5" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {errMsg && (
                                    <div className="alert">
                                        {errMsg}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn btn-white btn-lg"
                                    style={{ justifyContent: 'center', gap: 8 }}
                                >
                                    {loading && <span className="spinner" />}
                                    Entrar
                                </button>
                            </form>

                            <div
                                className="stack"
                                style={{
                                    marginTop: 18,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    color: 'rgba(255,255,255,.85)',
                                    fontSize: 14
                                }}
                            >
                                <Link href="/register" className="link-ghost">Crear cuenta</Link>
                                <Link href="/forgot-password" className="link-ghost">¿Olvidaste tu contraseña?</Link>
                            </div>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
}
