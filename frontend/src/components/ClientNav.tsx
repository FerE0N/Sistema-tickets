// src/components/ClientNav.tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API } from '@/lib/config';

type User = {
    name: string;
    role_id: number; // 1/2 admin, 3 aux
};

export default function ClientNav() {
    const [user, setUser] = useState<User | null>(null);
    const [mounted, setMounted] = useState(false);
    const router = useRouter();

    useEffect(() => {
        setMounted(true); // evita mismatch entre SSR y cliente
        const token = localStorage.getItem('token');
        if (!token) return;

        (async () => {
            try {
                const res = await fetch(`${API}/api/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` },
                    cache: 'no-store',
                });
                if (!res.ok) throw new Error('No autorizado');
                const data = await res.json();
                setUser(data.user || data);
            } catch {
                localStorage.removeItem('token');
                setUser(null);
            }
        })();
    }, []);

    // Mientras no está montado en cliente, no renderizamos nada
    if (!mounted) return null;

    return user ? (
        <div className="flex items-center gap-3">
            <span className="text-gray-600">Hola, {user.name}</span>
            <button
                onClick={() => {
                    localStorage.removeItem('token');
                    router.push('/login');
                }}
                className="text-red-600 hover:underline"
            >
                Cerrar sesión
            </button>
        </div>
    ) : (
        <Link href="/login" className="hover:underline">
            Iniciar sesión
        </Link>
    );
}
