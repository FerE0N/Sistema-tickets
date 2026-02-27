// src/lib/session.js
export function getSession() {
    if (typeof window === 'undefined') return { token: null, user: null };
    const token = localStorage.getItem('token');
    const userRaw = localStorage.getItem('user');
    return { token, user: userRaw ? JSON.parse(userRaw) : null };
}
