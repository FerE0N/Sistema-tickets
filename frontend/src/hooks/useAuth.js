// src/hooks/useAuth.js
'use client';
import { useEffect, useState } from 'react';
import { API } from '@/lib/config';

export function useAuth(requireAdmin = false) {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [error, setError] = useState(null); // 'NO_TOKEN' | 'INVALID' | 'FORBIDDEN' | null

    useEffect(() => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const userRaw = typeof window !== 'undefined' ? localStorage.getItem('user') : null;

        if (!token || !userRaw) {
            setError('NO_TOKEN'); setLoading(false); return;
        }

        const localUser = JSON.parse(userRaw);

        // Si exiges admin, valida rol de inmediato
        if (requireAdmin && !(localUser.role_id === 1 || localUser.role_id === 2)) {
            setError('FORBIDDEN'); setUser(localUser); setLoading(false); return;
        }

        // Validación con /auth/me para asegurar token vivo
        (async () => {
            try {
                const res = await fetch(`${API}/api/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!res.ok) throw new Error('INVALID');
                const data = await res.json();
                const me = data.user || data;

                // Si exiges admin, revalida con el servidor
                if (requireAdmin && !(me.role_id === 1 || me.role_id === 2)) {
                    setError('FORBIDDEN'); setUser(me); return;
                }

                setUser(me);
            } catch {
                setError('INVALID');
                // opcional: localStorage.removeItem('token'); localStorage.removeItem('user');
            } finally {
                setLoading(false);
            }
        })();
    }, [requireAdmin]);

    return { loading, user, error };
}
