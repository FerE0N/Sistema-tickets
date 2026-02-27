// src/components/tickets/TicketsTable.jsx
'use client';
import { useEffect, useMemo } from 'react';

export default function TicketsTable({
    data,
    admin = false,
    onEdit,
    onClose,
    onReassign,
    className = '',
    debug = false, // <- puedes activar logs pasando debug
}) {
    const safe = (data && typeof data === 'object') ? data : {};

    // Acepta múltiples shapes: items | rows | data | result.items/rows
    const rows = useMemo(() => {
        const arr =
            Array.isArray(safe.items) ? safe.items :
                Array.isArray(safe.rows) ? safe.rows :
                    Array.isArray(safe.data) ? safe.data :
                        (safe.result && Array.isArray(safe.result.items)) ? safe.result.items :
                            (safe.result && Array.isArray(safe.result.rows)) ? safe.result.rows :
                                [];
        return arr;
    }, [safe]);

    // Log útil para confirmar qué llega realmente
    useEffect(() => {
        if (!debug) return;
        // evita log gigante: solo tamaños y claves principales
        const keys = Object.keys(safe || {});
        const size = rows.length;
        console.debug('[TicketsTable] data keys:', keys, 'rows.size:', size, { data: safe });
    }, [safe, rows, debug]);

    const fmt = (d) => {
        try {
            const dt = new Date(d);
            if (Number.isNaN(+dt)) return '—';
            return dt.toLocaleString();
        } catch { return '—'; }
    };

    return (
        <section className={`table glass-panel table-admin ${className}`}>
            <table className="w-full">
                <thead>
                    <tr>
                        <th style={{ width: 72 }}>ID</th>
                        <th>Asunto</th>
                        <th style={{ width: 130 }}>Estado</th>
                        <th style={{ width: 160 }}>Categoría</th>
                        <th style={{ width: 160 }}>Agente</th>
                        <th style={{ width: 160 }}>Resp.</th>
                        <th style={{ width: 190 }}>Creado</th>
                        <th style={{ textAlign: 'right', width: 220 }}>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((t) => (
                        <tr key={t.ticket_id}>
                            <td>#{t.ticket_id}</td>
                            <td className="cell-subject">
                                <div className="subject">{t.subject || '—'}</div>
                                {t.description && <div className="muted">{t.description}</div>}
                            </td>
                            <td>
                                <span
                                    className={`chip ${(t.status || '').toLowerCase() === 'cerrado'
                                            ? 'ok'
                                            : (t.status || '').toLowerCase().startsWith('en')
                                                ? 'warn'
                                                : 'muted'
                                        }`}
                                >
                                    {t.status || '—'}
                                </span>
                            </td>
                            <td>{t.category_name || t.category_id || '—'}</td>
                            <td>{t.agent_name || t.agent_id || '—'}</td>
                            <td>{t.responsible_name || t.responsible_id || '—'}</td>
                            <td>{fmt(t.created_at)}</td>
                            <td className="cell-actions">
                                <div className="row-actions">
                                    {admin && (
                                        <>
                                            <button className="btn-row" onClick={() => onEdit?.(t)}>Editar</button>
                                            {(t.status || '').toLowerCase() !== 'cerrado' && (
                                                <button className="btn-row warn" onClick={() => onClose?.(t.ticket_id)}>Cerrar</button>
                                            )}
                                            <button className="btn-row ghost" onClick={() => onReassign?.(t.ticket_id)}>Reasignar</button>
                                        </>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}

                    {rows.length === 0 && (
                        <tr>
                            <td className="empty" colSpan={8}>Sin resultados</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </section>
    );
}
