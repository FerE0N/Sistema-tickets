// src/app/(app)/admin/tokens/page.jsx
'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import BackBar from '@/components/BackBar';

export default function TokensPage() {
    const [data, setData] = useState({ items: [], page: 1, totalPages: 1, total: 0, pageSize: 10 });
    const [loading, setLoading] = useState(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const load = async (page = 1) => {
        setLoading(true);
        try {
            const res = await apiFetch(`/admin/revoked-tokens?page=${page}&pageSize=10&orderBy=revoked_at&orderDir=DESC`, { token });
            setData(res);
        } catch (e) { alert(e.message); }
        setLoading(false);
    };

    useEffect(() => { load(1); }, []);

    return (
        <main>
            <BackBar />
            <h1 className="text-2xl mb-4">Tokens revocados</h1>
            {loading ? <div>Cargando…</div> : (
                <>
                    <div className="overflow-auto border rounded">
                        <table className="min-w-[800px] w-full">
                            <thead className="bg-gray-100 text-left">
                                <tr>
                                    <th className="p-2">JTI</th>
                                    <th className="p-2">User</th>
                                    <th className="p-2">Email</th>
                                    <th className="p-2">Revocado</th>
                                    <th className="p-2">Expira</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.items.map(r => (
                                    <tr key={r.jti} className="border-t">
                                        <td className="p-2 text-xs">{r.jti}</td>
                                        <td className="p-2">{r.user_name} (id: {r.user_id})</td>
                                        <td className="p-2">{r.user_email}</td>
                                        <td className="p-2 text-sm">{r.revoked_at?.slice(0, 19).replace('T', ' ')}</td>
                                        <td className="p-2 text-sm">{r.expires_at?.slice(0, 19).replace('T', ' ')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                        <button
                            className="px-3 py-1 border rounded disabled:opacity-50"
                            disabled={data.page <= 1}
                            onClick={() => load(data.page - 1)}
                        >Anterior</button>
                        <span>Página {data.page} / {data.totalPages} (Total: {data.total})</span>
                        <button
                            className="px-3 py-1 border rounded disabled:opacity-50"
                            disabled={data.page >= data.totalPages}
                            onClick={() => load(data.page + 1)}
                        >Siguiente</button>
                    </div>
                </>
            )}
        </main>
    );
}
