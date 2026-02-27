// src/components/AdminGuard.jsx
'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';

export default function AdminGuard({ children }) {
    const { loading, user, error } = useAuth(true); // tu hook actual
    const router = useRouter();
    const pathname = usePathname();

    const [canRender, setCanRender] = useState(false);

    useEffect(() => {
        // Aún cargando: no navegar ni renderizar todavía
        if (loading) return;

        // Sin token o token inválido -> al login
        if (error === 'NO_TOKEN' || error === 'INVALID') {
            router.replace('/login');
            setCanRender(false);
            return;
        }

        // Logueado pero sin permisos -> al dashboard
        if (error === 'FORBIDDEN' || !user || ![1, 2].includes(user.role_id)) {
            router.replace('/dashboard');
            setCanRender(false);
            return;
        }

        // Es admin/superadmin -> puede ver la ruta admin
        setCanRender(true);
    }, [loading, error, user, router, pathname]);

    // Mientras decide (primera carga o redirección en curso): placeholder
    if (loading || !canRender) {
        return <div className="p-6">Cargando…</div>;
    }

    return children;
}
