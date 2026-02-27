// src/hooks/useTable.js
'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '../lib/api';

export function useTable({
    basePath,
    initial = {},
    token,
    enabled = true,
    deps = [],
    debug = false,
}) {
    const [page, setPage] = useState(initial.page ?? 1);
    const [pageSize, setPageSize] = useState(initial.pageSize ?? 10);
    const [sort, setSort] = useState(initial.sort ?? '');
    const [dir, setDir] = useState(initial.dir ?? 'ASC');
    const [filters, setFilters] = useState(initial.filters ?? {});
    const [data, setData] = useState({ items: [], page: 1, totalPages: 1, total: 0, pageSize: 10 });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const abortRef = useRef(null);

    const qs = useMemo(() => {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('pageSize', String(pageSize));
        if (sort) params.set('sort', String(sort));
        if (dir) params.set('dir', String(dir));
        Object.entries(filters).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
        });
        const s = `?${params.toString()}`;
        if (debug) console.log('[useTable] qs ->', s);
        return s;
    }, [page, pageSize, sort, dir, filters, debug]);

    const canFetch = Boolean(enabled && basePath && token);

    // helpers robustos
    const extractArray = (res) => {
        if (Array.isArray(res)) return res;
        if (Array.isArray(res?.items)) return res.items;
        if (Array.isArray(res?.rows)) return res.rows;
        if (Array.isArray(res?.data)) return res.data;

        if (res?.result) {
            if (Array.isArray(res.result)) return res.result;
            if (Array.isArray(res.result.items)) return res.result.items;
            if (Array.isArray(res.result.rows)) return res.result.rows;
            if (Array.isArray(res.result.data)) return res.result.data;
        }
        if (res?.payload) {
            if (Array.isArray(res.payload)) return res.payload;
            if (Array.isArray(res.payload.items)) return res.payload.items;
            if (Array.isArray(res.payload.rows)) return res.payload.rows;
            if (Array.isArray(res.payload.data)) return res.payload.data;
        }
        if (res?.meta?.data && Array.isArray(res.meta.data)) return res.meta.data;
        if (res?.records && Array.isArray(res.records)) return res.records;

        return [];
    };

    const extractNumber = (v, fallback) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : fallback;
    };

    useEffect(() => {
        if (!canFetch) { setLoading(false); return; }

        let cancelled = false;
        abortRef.current?.abort?.();
        const ctrl = new AbortController();
        abortRef.current = ctrl;

        setLoading(true);
        setError(null);

        const url = `${basePath}${qs}`;
        if (debug) console.log('[useTable] GET', url);

        apiFetch(url, { token, signal: ctrl.signal })
            .then((res) => {
                if (cancelled) return;

                // DEBUG CLARO
                if (debug) {
                    try {
                        const keys = Object.keys(res || {});
                        console.log('[useTable] response keys:', keys);
                        // si hay anidaciones comunes
                        if (res?.result) console.log('[useTable] result keys:', Object.keys(res.result));
                        if (res?.data && !Array.isArray(res.data)) console.log('[useTable] data keys:', Object.keys(res.data));
                    } catch { }
                }

                const arr = extractArray(res);
                // total/meta
                let total =
                    extractNumber(res?.total, undefined) ??
                    extractNumber(res?.count, undefined) ??
                    (Array.isArray(arr) ? arr.length : 0);

                // page/pageSize
                let pg =
                    extractNumber(res?.page, undefined) ??
                    extractNumber(res?.currentPage, undefined) ??
                    page;
                let ps =
                    extractNumber(res?.pageSize, undefined) ??
                    extractNumber(res?.limit, undefined) ??
                    pageSize;

                // totalPages
                let totalPages =
                    extractNumber(res?.totalPages, undefined) ??
                    extractNumber(res?.pages, undefined);
                if (!Number.isFinite(totalPages) || totalPages <= 0) {
                    totalPages = Math.max(1, Math.ceil((total || 0) / (ps || 1)));
                }

                const next = { items: arr, page: pg, totalPages, total, pageSize: ps };

                if (debug) {
                    console.log('[useTable] parsed ->', {
                        size: arr.length, page: pg, pageSize: ps, total, totalPages,
                    });
                }

                setData(next);

                if (next.totalPages > 0 && pg > next.totalPages) {
                    setPage(next.totalPages);
                }
            })
            .catch((err) => {
                if (cancelled || err?.name === 'AbortError') return;
                if (debug) console.error('[useTable] error', err);
                setError(err.message || 'Error al cargar datos');
                setData((d) => d ?? { items: [], page: 1, totalPages: 1, total: 0, pageSize });
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
            ctrl.abort();
        };
    }, [basePath, qs, token, canFetch, debug, page, pageSize, ...deps]);

    const setSortBy = (key) => {
        if (sort === key) setDir((d) => (d === 'ASC' ? 'DESC' : 'ASC'));
        else { setSort(key); setDir('ASC'); }
    };

    const refresh = () => setFilters((f) => ({ ...f }));

    return {
        state: { page, pageSize, sort, dir, filters },
        data, loading, error,
        setPage, setPageSize, setSortBy, setFilters,
        refresh,
    };
}
