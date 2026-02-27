// src/lib/api.js
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

// src/lib/api.js
export async function apiFetch(path, { method = 'GET', token, body } = {}) {
    const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';
    const url = path.startsWith('/api') ? `${base}${path}` : `${base}/api${path}`;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(url, {
        method, headers,
        body: body ? JSON.stringify(body) : undefined
    });

    let data = null;
    try { data = await res.json(); } catch { data = null; }

    if (!res.ok) {
        throw new Error((data && data.message) || `HTTP ${res.status}`);
    }
    return data ?? {};
}
