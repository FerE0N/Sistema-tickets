'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

type User = { id: number; name: string; role_id: number; department_id?: number } | null;

const PUBLIC_ROUTES = new Set<string>(['/login', '/register']);

function isActive(pathname: string, href: string) {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
}

export default function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [user, setUser] = useState<User>(null);
    const [open, setOpen] = useState(false); // mobile menu

    // mount + session
    useEffect(() => {
        setMounted(true);
        try {
            const raw = localStorage.getItem('user');
            setUser(raw ? JSON.parse(raw) : null);
        } catch {
            setUser(null);
        }
    }, []);

    // close mobile menu on route change
    useEffect(() => { setOpen(false); }, [pathname]);

    const hideNavbar = useMemo(() => {
        if (!mounted || !pathname) return true;
        return PUBLIC_ROUTES.has(pathname);
    }, [mounted, pathname]);

    const isAdmin = user && (user.role_id === 1 || user.role_id === 2);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.replace('/login');
    };

    // Links base
    const commonLinks = [
        { href: '/dashboard', label: 'Dashboard' },
        { href: '/tickets/new', label: 'Crear ticket' },
        { href: '/tickets', label: 'Mis tickets' },
    ];
    const adminLinks = [
        { href: '/admin/tickets', label: 'Admin · Tickets' },
        { href: '/admin/categorias', label: 'Admin · Categorías' },
        { href: '/admin/usuarios', label: 'Admin · Usuarios' },
    ];

    return (
        <>
            {!hideNavbar && (
                <>
                    <header className="nav-glass">
                        <div className="nav-inner">
                            <Link href="/dashboard" className="brand" aria-label="Inicio">
                                <span className="logo">IT</span>
                                <span className="title">Sistema de Tickets</span>
                            </Link>

                            {/* enlaces desktop */}
                            <nav className="nav-links" aria-label="Navegación principal">
                                {commonLinks.map(l => (
                                    <Link
                                        key={l.href}
                                        href={l.href}
                                        className={`nav-link ${isActive(pathname!, l.href) ? 'active' : ''}`}
                                    >
                                        {l.label}
                                    </Link>
                                ))}
                                {isAdmin && adminLinks.map(l => (
                                    <Link
                                        key={l.href}
                                        href={l.href}
                                        className={`nav-link ${isActive(pathname!, l.href) ? 'active' : ''}`}
                                    >
                                        {l.label}
                                    </Link>
                                ))}
                            </nav>

                            <div className="nav-spacer" />

                            {/* usuario + logout (desktop) */}
                            <div className="user-chip">
                                {user && <span>Hola, {user.name}</span>}
                                <button className="btn-logout" onClick={handleLogout}>Salir</button>
                            </div>

                            {/* botón hamburguesa (mobile) */}
                            <button
                                className="hamburger"
                                aria-label="Abrir menú"
                                aria-expanded={open}
                                onClick={() => setOpen(v => !v)}
                            >
                                {/* ícono simple */}
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M4 6h16M4 12h16M4 18h16" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
                                </svg>
                            </button>
                        </div>
                    </header>

                    {/* menú mobile (drawer) */}
                    <div className={`mobile-drawer ${open ? 'open' : ''}`}>
                        <div className="mobile-menu">
                            {commonLinks.map(l => (
                                <Link key={l.href} href={l.href} className={`mobile-link ${isActive(pathname!, l.href) ? 'active' : ''}`}>
                                    {l.label}
                                </Link>
                            ))}
                            {isAdmin && adminLinks.map(l => (
                                <Link key={l.href} href={l.href} className={`mobile-link ${isActive(pathname!, l.href) ? 'active' : ''}`}>
                                    {l.label}
                                </Link>
                            ))}
                            <button className="mobile-link" onClick={handleLogout}>Salir</button>
                        </div>
                    </div>
                </>
            )}

            {/* Contenido de la página (si no hay layout especializado) */}
            <main className="shell-body">{children}</main>
        </>
    );
}
