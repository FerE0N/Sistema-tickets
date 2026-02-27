'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();

    // Ocultar navbar en auth
    const hide = pathname === '/login' || pathname === '/register';
    const [user, setUser] = useState(null);

    useEffect(() => {
        try {
            const raw = localStorage.getItem('user');
            setUser(raw ? JSON.parse(raw) : null);
        } catch { setUser(null); }
    }, [pathname]);

    if (hide) return null;

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.replace('/login');
    };

    const isAdmin = user?.role_id === 1 || user?.role_id === 2;

    // Helper de clase activa
    const linkCls = useMemo(() => (href) =>
        `underline ${pathname?.startsWith(href) ? 'font-semibold' : ''}`
        , [pathname]);

    return (
        <header className="border-b bg-white">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
                <Link href="/dashboard" className="font-semibold">Home</Link>

                {/* Opciones para todos los usuarios */}
                <nav className="flex items-center gap-3">
                    <Link href="/tickets" className={linkCls('/tickets')}>Mis tickets</Link>
                    <Link href="/tickets/new" className={linkCls('/tickets/new')}>Crear ticket</Link>

                    {/* Opciones sólo para admin/superadmin */}
                    {isAdmin && (
                        <>
                            <span className="text-gray-300">|</span>
                            <Link href="/admin/tickets" className={linkCls('/admin/tickets')}>Admin: Tickets</Link>
                            <Link href="/admin/usuarios" className={linkCls('/admin/usuarios')}>Admin: Usuarios</Link>
                            <Link href="/admin/categorias" className={linkCls('/admin/categorias')}>Admin: Categorías</Link>
                            <Link href="/admin/tokens" className={linkCls('/admin/tokens')}>Admin: Tokens</Link>
                        </>
                    )}
                </nav>

                <div className="ml-auto flex items-center gap-3">
                    {user && <span className="text-sm text-gray-600 truncate max-w-[180px]">Hola, {user.name}</span>}
                    <button className="px-3 py-1 border rounded" onClick={logout}>Salir</button>
                </div>
            </div>
        </header>
    );
}
