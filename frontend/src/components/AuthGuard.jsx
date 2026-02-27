// src/components/AuthGuard.jsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthGuard({ children, roles }) {
    const router = useRouter();
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userRaw = localStorage.getItem('user');

        if (!token || !userRaw) {
            router.replace('/login');
            return;
        }

        const user = JSON.parse(userRaw);
        if (roles && roles.length > 0 && !roles.includes(user.role_id)) {
            // si no tiene permisos, mándalo a su dashboard básico
            router.replace('/dashboard');
            return;
        }

        setReady(true);
    }, [router, roles]);

    if (!ready) return <main className="p-6">Cargando…</main>;
    return children;
}
