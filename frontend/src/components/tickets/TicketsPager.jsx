// src/components/tickets/TicketsPager.jsx
'use client';
import React from 'react';

export default function TicketsPager({
    data,
    page,
    pageSize,
    setPage,
    setPageSize,
}) {
    const total = Number(data?.total ?? 0);
    const totalPages = Math.max(1, Number(data?.totalPages ?? 1));
    const curPage = Math.min(Math.max(1, Number(page ?? 1)), totalPages);
    const ps = Number(pageSize ?? 10);

    const prevDisabled = curPage <= 1;
    const nextDisabled = curPage >= totalPages;

    return (
        <div className="pager">
            <div className="pager-left">
                <button
                    type="button"
                    className="pager-btn"
                    onClick={() => !prevDisabled && setPage(curPage - 1)}
                    disabled={prevDisabled}
                    aria-label="Página anterior"
                >
                    ◀ Anterior
                </button>

                <div className="pager-info" role="status" aria-live="polite">
                    Página <strong>{curPage}</strong> / <strong>{totalPages}</strong>
                    {Number.isFinite(total) ? <> &nbsp;·&nbsp; Total: <strong>{total}</strong></> : null}
                </div>

                <button
                    type="button"
                    className="pager-btn"
                    onClick={() => !nextDisabled && setPage(curPage + 1)}
                    disabled={nextDisabled}
                    aria-label="Página siguiente"
                >
                    Siguiente ▶
                </button>
            </div>

            <div className="pager-right pager-size">
                <span>Tamaño:</span>
                <select
                    className="pager-select"
                    value={ps}
                    onChange={(e) => {
                        const next = Number(e.target.value) || 10;
                        setPageSize(next);
                        setPage(1);
                    }}
                    aria-label="Tamaño de página"
                >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                </select>
            </div>
        </div>
    );
}
