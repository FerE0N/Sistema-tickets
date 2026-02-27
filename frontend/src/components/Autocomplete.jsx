'use client';
import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';

export default function Autocomplete({
    token,
    searchPath,         // '/users/search' o '/categorias/search'
    labelKey,           // 'name'
    valueKey,           // 'user_id'
    placeholder = 'Buscar…',
    initialValue = null, // { value, label }
    onChange,           // (value, item) => void
    minLength = 1,
    limit = 10,
    disabled = false,
}) {
    const [query, setQuery] = useState(initialValue?.label || '');
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [selected, setSelected] = useState(initialValue || null);
    const [hi, setHi] = useState(-1);
    const ref = useRef(null);

    // cierra al hacer click afuera
    useEffect(() => {
        const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    // fetch con debounce
    useEffect(() => {
        if (disabled) { setItems([]); setOpen(false); return; }
        if (query.trim().length < minLength) { setItems([]); setOpen(false); return; }
        const id = setTimeout(async () => {
            try {
                const data = await apiFetch(
                    `${searchPath}?q=${encodeURIComponent(query)}&limit=${limit}`, { token }
                );
                const arr = Array.isArray(data) ? data
                    : Array.isArray(data?.items) ? data.items
                        : Array.isArray(data?.rows) ? data.rows
                            : [];
                setItems(arr);
                setOpen(true);
                setHi(-1);
            } catch { setItems([]); setOpen(false); }
        }, 250);
        return () => clearTimeout(id);
    }, [query, searchPath, token, minLength, limit, disabled]);

    // si cambian props initialValue externamente
    useEffect(() => {
        if (initialValue) {
            setSelected(initialValue);
            setQuery(initialValue.label);
        }
    }, [initialValue]);

    const pick = (it) => {
        const val = { value: it[valueKey], label: it[labelKey] };
        setSelected(val);
        setQuery(val.label || '');
        setOpen(false);
        onChange?.(val.value, it);
    };

    const onKeyDown = (e) => {
        if (!open || !items.length) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); setHi(i => Math.min(i + 1, items.length - 1)); }
        if (e.key === 'ArrowUp') { e.preventDefault(); setHi(i => Math.max(i - 1, 0)); }
        if (e.key === 'Enter' && hi >= 0) { e.preventDefault(); pick(items[hi]); }
        if (e.key === 'Escape') setOpen(false);
    };

    return (
        <div ref={ref} className="ac">
            <input
                className="ac-input"
                placeholder={placeholder}
                value={query}
                disabled={disabled}
                onChange={e => { setQuery(e.target.value); setSelected(null); }}
                onFocus={() => { if (items.length) setOpen(true); }}
                onKeyDown={onKeyDown}
                aria-autocomplete="list"
                aria-expanded={open}
            />
            {open && (
                <div className="ac-pop" role="listbox">
                    {query.trim().length < minLength ? (
                        <div className="ac-hint">Escribe al menos {minLength} caracter(es)</div>
                    ) : items.length === 0 ? (
                        <div className="ac-empty">Sin resultados</div>
                    ) : (
                        items.map((it, idx) => (
                            <button
                                key={it[valueKey]}
                                type="button"
                                role="option"
                                aria-selected={idx === hi}
                                className="ac-item"
                                onMouseEnter={() => setHi(idx)}
                                onClick={() => pick(it)}
                            >
                                <div className="text-sm">{it[labelKey]}</div>
                                {'email' in it && <div className="ac-muted">{it.email}</div>}
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
