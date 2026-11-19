// src/lib/api.js
import { API } from './config';

/**
 * fetch con JSON, token Bearer opcional y errores legibles.
 * `path` puede venir con o sin el prefijo /api.
 */
export async function apiFetch(path, { method = 'GET', token, body, signal } = {}) {
    const url = path.startsWith('/api') ? `${API}${path}` : `${API}/api${path}`;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(url, {
        method,
        headers,
        signal,
        body: body ? JSON.stringify(body) : undefined,
    });

    let data = null;
    try { data = await res.json(); } catch { data = null; }

    if (!res.ok) {
        throw new Error((data && data.message) || `HTTP ${res.status}`);
    }
    return data ?? {};
}
