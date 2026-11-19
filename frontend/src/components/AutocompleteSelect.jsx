'use client';
import { useEffect, useRef, useState } from 'react';
import { API } from '@/lib/config';


export default function AutocompleteSelect({
    label,
    placeholder = 'Escribe para buscar…',
    fetchUrl,          // '/users/search' o '/categorias/search'
    queryParam = 'q',
    token,
    value,             // { id, label } o null
    onChange,          // (item || null) => void
    minChars = 1,
    mapItem = (it) => ({ id: it.id, label: it.name }),
    disabled = false,
}) {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState(value?.label || '');
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hi, setHi] = useState(-1);
    const boxRef = useRef(null);
    const abortRef = useRef(null);

    const canSearch = q.trim().length >= minChars;

    function extractArray(json) {
        if (Array.isArray(json)) return json;
        if (json?.items && Array.isArray(json.items)) return json.items;
        if (json?.rows && Array.isArray(json.rows)) return json.rows;
        return [];
    }

    useEffect(() => {
        if (!canSearch || disabled) { setItems([]); setOpen(false); return; }
        setLoading(true);

        const timer = setTimeout(async () => {
            try {
                abortRef.current?.abort?.();
                const ctrl = new AbortController();
                abortRef.current = ctrl;

                const url = new URL(`/api${fetchUrl}`, API);
                url.searchParams.set(queryParam, q);
                url.searchParams.set('limit', '10');

                const headers = {};
                if (token) headers['Authorization'] = `Bearer ${token}`;

                const res = await fetch(url.toString(), { headers, signal: ctrl.signal });
                const json = await res.json();
                const raw = extractArray(json);
                const mapped = raw.map(mapItem);

                setItems(mapped);
                setOpen(true);
                setHi(-1);
            } catch {
                setItems([]);
                setOpen(false);
            } finally {
                setLoading(false);
            }
        }, 250);

        return () => clearTimeout(timer);
    }, [q, canSearch, fetchUrl, queryParam, token, disabled]);

    useEffect(() => {
        const handle = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, []);

    // si actualizan value desde fuera, sincronizamos el texto
    useEffect(() => {
        setQ(value?.label || '');
    }, [value]);

    const pick = (item) => {
        onChange(item);
        setQ(item?.label || '');
        setOpen(false);
    };

    const onKeyDown = (e) => {
        if (!open || !items.length) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); setHi(i => Math.min(i + 1, items.length - 1)); }
        if (e.key === 'ArrowUp') { e.preventDefault(); setHi(i => Math.max(i - 1, 0)); }
        if (e.key === 'Enter' && hi >= 0) { e.preventDefault(); pick(items[hi]); }
        if (e.key === 'Escape') setOpen(false);
    };

    return (
        <div className="ac" ref={boxRef}>
            {label && <label className="form-label">{label}</label>}
            <input
                className="ac-input"
                placeholder={placeholder}
                value={q}
                disabled={disabled}
                onChange={(e) => { setQ(e.target.value); if (!e.target.value) onChange(null); }}
                onFocus={() => { if (items.length) setOpen(true); }}
                onKeyDown={onKeyDown}
                aria-autocomplete="list"
                aria-expanded={open}
            />
            {open && (
                <div className="ac-pop" role="listbox">
                    {loading ? (
                        <div className="ac-hint">Buscando…</div>
                    ) : (
                        <>
                            {!canSearch && <div className="ac-hint">Escribe al menos {minChars} caracter(es)</div>}
                            {canSearch && items.length === 0 && <div className="ac-empty">Sin resultados</div>}
                            {items.map((it, idx) => (
                                <button
                                    key={it.id}
                                    type="button"
                                    role="option"
                                    aria-selected={idx === hi}
                                    className="ac-item"
                                    onMouseEnter={() => setHi(idx)}
                                    onClick={() => pick(it)}
                                >
                                    <div className="text-sm">{it.label}</div>
                                </button>
                            ))}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
