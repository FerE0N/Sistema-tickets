'use client';

import { useEffect, useRef } from 'react';

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

/**
 * Suscribe a Server-Sent Events (SSE) del backend y dispara callbacks
 * cuando haya cambios de tickets. Si SSE no está disponible, hace fallback a polling.
 *
 * @param {{ onTicketChange?: () => void, intervalMs?: number }} opts
 */
export function useSSERefresh({ onTicketChange, intervalMs = 15000 } = {}) {
    const cbRef = useRef(onTicketChange);
    cbRef.current = onTicketChange;

    useEffect(() => {
        // Este hook debe ejecutarse SOLO en componentes cliente.
        if (typeof window === 'undefined') return;

        let closed = false;
        let pollTimer = null;

        // 1) Intentar SSE
        let es;
        try {
            es = new EventSource(`${API}/api/events`, { withCredentials: false });

            // Mensaje “ping” genérico
            es.addEventListener('message', () => {
                if (!closed && cbRef.current) cbRef.current();
            });

            // Canal específico que emite tu backend (ajústalo si usas otro nombre)
            es.addEventListener('tickets:update', () => {
                if (!closed && cbRef.current) cbRef.current();
            });

            es.onerror = () => {
                // Si falla SSE, cerramos y caemos a polling
                try { es.close(); } catch { }
                startPolling();
            };
        } catch {
            startPolling();
        }

        function startPolling() {
            if (pollTimer) return;
            pollTimer = setInterval(() => {
                if (!closed && cbRef.current) cbRef.current();
            }, intervalMs);
        }

        return () => {
            closed = true;
            if (es) try { es.close(); } catch { }
            if (pollTimer) clearInterval(pollTimer);
        };
    }, [intervalMs]);
}
