'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';

export default function DepartamentoSelector({
    value,
    onChange,
    label = 'Departamento',
    placeholder = 'Selecciona…',
}) {
    const [q, setQ] = useState('');
    const [items, setItems] = useState([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const wrapRef = useRef(null);

    // Normaliza el shape de datos (acepta name o department_name)
    const normalizeList = (data) => {
        const raw =
            Array.isArray(data) ? data :
                Array.isArray(data?.items) ? data.items :
                    Array.isArray(data?.rows) ? data.rows : [];
        return raw.map(d => ({
            id: d.department_id ?? d.id ?? d.value,
            name: d.department_name ?? d.name ?? d.label ?? '(sin nombre)',
        })).filter(d => d.id != null);
    };

    // Carga inicial
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                const data = await apiFetch('/departamentos');
                if (!cancelled) setItems(normalizeList(data));
            } catch (e) {
                console.error('Departamentos init error:', e);
                if (!cancelled) setItems([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    // Búsqueda remota (debounce)
    useEffect(() => {
        let cancelled = false;
        const t = setTimeout(async () => {
            if (!q.trim()) return; // conserva la lista inicial
            try {
                setLoading(true);
                const data = await apiFetch(`/departamentos/search?q=${encodeURIComponent(q)}&limit=10`);
                if (!cancelled) setItems(normalizeList(data));
            } catch (e) {
                console.error('Departamentos search error:', e);
                if (!cancelled) setItems([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }, 250);
        return () => { cancelled = true; clearTimeout(t); };
    }, [q]);

    const selected = useMemo(
        () => items.find(d => String(d.id) === String(value)) || null,
        [items, value]
    );

    // Cerrar al hacer click fuera
    useEffect(() => {
        const onDocClick = (e) => {
            if (!wrapRef.current) return;
            if (!wrapRef.current.contains(e.target)) setOpen(false);
        };
        if (open) document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, [open]);

    const choose = (dep) => {
        onChange?.(dep.id);
        setOpen(false);
        setQ('');
    };

    return (
        <div className="form-field combo-wrap" ref={wrapRef}>
            <label className="form-label">{label}</label>

            {/* Trigger con look glass */}
            <div
                className={`combo-trigger ${open ? 'open' : ''}`}
                tabIndex={0}
                role="button"
                aria-haspopup="listbox"
                aria-expanded={open}
                onClick={() => setOpen(v => !v)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setOpen(v => !v); }}
            >
                <span className={`combo-value ${selected ? '' : 'placeholder'}`}>
                    {selected ? selected.name : placeholder}
                </span>
                <svg className="combo-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>

            {/* Panel flotante */}
            {open && (
                <div className="combo-panel glass-panel" role="listbox">
                    <div className="combo-search">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
                            <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                        </svg>
                        <input
                            autoFocus
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Buscar departamento…"
                            className="input"
                        />
                    </div>

                    <div className="combo-list">
                        {loading && <div className="combo-empty">Cargando…</div>}
                        {!loading && items.length === 0 && (
                            <div className="combo-empty">Sin resultados</div>
                        )}
                        {!loading && items.map(d => (
                            <button
                                key={d.id}
                                className={`combo-item ${selected && String(selected.id) === String(d.id) ? 'active' : ''}`}
                                onClick={() => choose(d)}
                                type="button"
                            >
                                {d.name}
                            </button>
                        ))}
                    </div>

                    <div className="combo-footer">
                        <button type="button" className="btn btn-ghost" onClick={() => { setOpen(false); setQ(''); }}>
                            Cerrar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
