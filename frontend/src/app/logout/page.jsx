// src/app/logout/page.jsx
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LogoutPage() {
    const router = useRouter();

    useEffect(() => {
        (async () => {
            try {
                const token = localStorage.getItem('token');
                if (token) {
                    // Si tienes endpoint de logout en backend:
                    await fetch('http://localhost:4000/api/auth/logout', {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}` }
                    }).catch(() => { });
                }
            } finally {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                router.replace('/login');
            }
        })();
    }, [router]);

    return <main className="p-6">Cerrando sesión…</main>;
}
