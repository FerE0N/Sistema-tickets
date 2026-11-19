// src/app/(app)/dashboard/page.jsx
'use client';

import { useEffect, useState } from 'react';
import {
    Chart as ChartJS,
    LineElement, PointElement, BarElement, ArcElement,
    CategoryScale, LinearScale, TimeScale,
    Tooltip, Legend, Filler,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { Line, Doughnut, Bar, Pie } from 'react-chartjs-2';

import Card from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useSSERefresh } from '@/hooks/useSSERefresh';
import { API } from '@/lib/config';


ChartJS.register(
    LineElement, PointElement, BarElement, ArcElement,
    CategoryScale, LinearScale, TimeScale,
    Tooltip, Legend, Filler
);

/* lee variables CSS de :root para que ChartJS respete la paleta */
const readCSSVars = () => {
    if (typeof window === 'undefined') return {};
    const cs = getComputedStyle(document.documentElement);
    const v = (name) => cs.getPropertyValue(name).trim();
    return {
        brand: v('--brand') || '#4A8F94',
        accent: v('--accent') || '#3C8D40',
        warn: v('--warn') || '#F59E0B',
        ok: v('--ok') || '#10B981',
        surface: v('--surface') || '#fff',
        border: v('--border') || '#E5E7EB',
        softGrid: '#eef2f7',
    };
};

export default function DashboardPage() {
    // === PALETA HARMÓNICA PARA SERIES (no ejes) ===
    // Mantengo tus CSS vars pero redefino tonos para datos
    const [COL, setCOL] = useState({
        brand: '#2E8797', // teal más sobrio para líneas
        accent: '#38BDF8', // sky azul p/“en progreso”
        warn: '#F59E0B', // amber p/“abiertos”
        ok: '#22C55E', // green p/“cerrados”
        surface: '#FFFFFF',
        border: '#E5E7EB',
        softGrid: '#eef2f7',
    });

    // helper alpha: alpha('#2563EB', 0.22) -> 'rgba(37,99,235,0.22)'
    const alpha = (hex, a = 0.25) => {
        const h = hex.replace('#', '');
        const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
        const r = (bigint >> 16) & 255, g = (bigint >> 8) & 255, b = bigint & 255;
        return `rgba(${r},${g},${b},${a})`;
    };

    // Paletas cualitativas para múltiples categorías / agentes (hasta ~10)
    const QUAL = [
        '#2DD4BF', // teal claro
        '#60A5FA', // blue
        '#A78BFA', // violet
        '#F472B6', // pink
        '#F59E0B', // amber
        '#34D399', // emerald
        '#FCA5A5', // red suave
        '#93C5FD', // light blue
        '#C084FC', // light violet
        '#4ADE80', // green claro
    ];


    useEffect(() => { setCOL(readCSSVars()); }, []);

    // ---- STATE ----
    const [token, setToken] = useState(null);
    const [me, setMe] = useState(null);

    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');

    const [summary, setSummary] = useState(null);
    const [byStatus, setByStatus] = useState([]);
    const [byCategory, setByCategory] = useState([]);
    const [byDay, setByDay] = useState([]);
    const [byAgent, setByAgent] = useState([]);

    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState(null);

    useEffect(() => {
        const t = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const u = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
        setToken(t || null);
        try { setMe(u ? JSON.parse(u) : null); } catch { setMe(null); }
    }, []);

    const withRange = (base) => {
        const url = new URL(base, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
        if (from) url.searchParams.set('from', from);
        if (to) url.searchParams.set('to', to);
        return url;
    };

    useEffect(() => {
        if (!token || !me) return;

        setLoading(true);
        setErr(null);

        (async () => {
            try {
                const headers = { Authorization: `Bearer ${token}` };
                const scope = (me?.role_id === 1 || me?.role_id === 2) ? 'all' : 'mine';

                const sUrl = withRange(`${API}/api/dashboard/summary?scope=${scope}`);
                const stUrl = withRange(`${API}/api/dashboard/by-status?scope=${scope}`);
                const cUrl = withRange(`${API}/api/dashboard/by-category?scope=${scope}`);
                const aUrl = withRange(`${API}/api/dashboard/by-agent?scope=${scope}`);
                const dUrl = withRange(`${API}/api/dashboard/by-day?scope=${scope}`);
                if (!from && !to) dUrl.searchParams.set('days', '30');

                const [sRes, stRes, cRes, dRes, aRes] = await Promise.all([
                    fetch(sUrl, { headers }),
                    fetch(stUrl, { headers }),
                    fetch(cUrl, { headers }),
                    fetch(dUrl, { headers }),
                    fetch(aUrl, { headers }),
                ]);

                const [s, st, c, d, a] = await Promise.all([
                    sRes.json(), stRes.json(), cRes.json(), dRes.json(), aRes.json()
                ]);

                if (!sRes.ok) throw new Error(s?.message || 'Error summary');
                if (!stRes.ok) throw new Error(st?.message || 'Error by-status');
                if (!cRes.ok) throw new Error(c?.message || 'Error by-category');
                if (!dRes.ok) throw new Error(d?.message || 'Error by-day');
                if (!aRes.ok) throw new Error(a?.message || 'Error by-agent');

                const normalizeSummary = (obj = {}) => {
                    const get = (keys, fallback = 0) =>
                        keys.reduce((acc, k) => (acc ?? obj?.[k]), undefined) ?? fallback;

                    const open = get(['open', 'abiertos', 'opened', 'status_open']);
                    const inProgress = get(['in_progress', 'en_progreso', 'progress', 'inProgress']);
                    const closed = get(['closed', 'cerrados', 'status_closed']);

                    let total = obj.total ?? obj.count;
                    if (total == null) {
                        const sum = [open, inProgress, closed].filter(n => typeof n === 'number').reduce((a, b) => a + b, 0);
                        total = sum || 0;
                    }
                    return { total, open, in_progress: inProgress, closed };
                };

                const deriveFromByStatus = (rows = []) => {
                    const norm = (s = '') => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
                    const m = { open: 0, in_progress: 0, closed: 0 };
                    for (const r of rows) {
                        const name = norm(r.status ?? r.estado ?? '');
                        const count = Number(r.count ?? r.total ?? 0);
                        if (name.includes('abiert') || name.includes('open')) m.open += count;
                        else if (name.includes('progreso') || name.includes('progress')) m.in_progress += count;
                        else if (name.includes('cerrad') || name.includes('closed')) m.closed += count;
                    }
                    m.total = m.open + m.in_progress + m.closed;
                    return m;
                };

                let normalized = normalizeSummary(s);
                if ([normalized.open, normalized.in_progress, normalized.closed].some(v => v == null)) {
                    const derv = deriveFromByStatus(st);
                    normalized = {
                        total: normalized.total ?? derv.total,
                        open: normalized.open ?? derv.open,
                        in_progress: normalized.in_progress ?? derv.in_progress,
                        closed: normalized.closed ?? derv.closed
                    };
                }

                setSummary(normalized);
                setByStatus(Array.isArray(st) ? st : []);
                setByCategory(Array.isArray(c) ? c : []);
                setByDay(Array.isArray(d) ? d : []);
                setByAgent(Array.isArray(a) ? a : []);
            } catch (e) {
                console.error(e);
                setErr(e.message);
                setSummary(null);
                setByStatus([]); setByCategory([]); setByDay([]); setByAgent([]);
            } finally {
                setLoading(false);
            }
        })();
    }, [token, me, from, to]);

    useSSERefresh({
        onTicketChange: () => setFrom(v => (v ? v : '')) // “tocar” para re-fetch
    });

    // === datasets (usan variables de la paleta CSS) ===

    function hexToRgba(hex, alpha = 1) {
        const h = hex.replace('#', '');
        const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
        const r = (bigint >> 16) & 255, g = (bigint >> 8) & 255, b = bigint & 255;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    const commonTitle = (text) => ({
        display: true,
        text,
        align: 'center',
        color: '#fff',
        font: { size: 18, weight: 'bold' },
        padding: { top: 8, bottom: 4 },
    });

    const commonLegend = {
        position: 'bottom',
        labels: { color: '#fff' }
    };

    const gridColor = 'rgba(255,255,255,.15)';

    // Línea
    const lineData = {
        datasets: [{
            label: 'Tickets por día',
            data: byDay.map(r => ({ x: r.date, y: r.count })),
            borderColor: COL.brand,                 // teal sobrio
            backgroundColor: alpha(COL.brand, .22), // relleno suave
            borderWidth: 2,
            tension: .35,
            fill: true,
        }]
    };
    const lineOptions = {
        responsive: true,
        parsing: false,
        plugins: { title: commonTitle('Tickets por día'), legend: commonLegend, tooltip: { enabled: true } },
        scales: {
            x: { type: 'time', time: { unit: 'day' }, grid: { color: gridColor }, ticks: { color: '#fff' } },
            y: { beginAtZero: true, ticks: { precision: 0, color: '#fff' }, grid: { color: gridColor } }
        }
    };

    // Doughnut
    const doughnutData = {
        labels: byStatus.map(r => r.status),
        datasets: [{
            data: byStatus.map(r => r.count),
            backgroundColor: [COL.warn, COL.accent, COL.ok],
            borderColor: COL.surface,
            borderWidth: 2
        }]
    };
    // Doughnut
    const doughnutOptions = {
        responsive: true,
        plugins: { title: commonTitle('Distribución por estado'), legend: commonLegend, tooltip: { enabled: true } }
    };

    // Barras
    const barData = {
        labels: byCategory.map(r => r.category_name || `Cat ${r.category_id}`),
        datasets: [{
            label: 'Tickets',
            data: byCategory.map(r => r.count),
            backgroundColor: byCategory.map((_, i) => alpha(QUAL[i % QUAL.length], .25)),
            borderColor: byCategory.map((_, i) => QUAL[i % QUAL.length]),
            borderWidth: 1,
        }]
    };

    // Barras horizontales
    const barOptions = {
        responsive: true,
        indexAxis: 'y',
        plugins: { title: commonTitle('Por categoría'), legend: { display: false }, tooltip: { enabled: true } },
        scales: {
            x: { beginAtZero: true, ticks: { precision: 0, color: '#fff' }, grid: { color: gridColor } },
            y: { ticks: { color: '#fff' }, grid: { display: false } }
        }
    };

    // Pie
    const pieData = {
        labels: byAgent.map(r => r.agent_name || `Agente ${r.agent_id}`),
        datasets: [{
            data: byAgent.map(r => r.count),
            backgroundColor: byAgent.map((_, i) => QUAL[i % QUAL.length]),
            borderColor: COL.surface,
            borderWidth: 2
        }]
    };

    // Pie
    const pieOptions = {
        responsive: true,
        plugins: { title: commonTitle('Por agente'), legend: commonLegend, tooltip: { enabled: true } }
    };

    return (
        <main className="dash-shell">
            {/* cabecera con rango y estilo vidrio */}
            <section className="dash-header glass-panel" style={{ margin: '12px' }}>
                <div className="range">
                    <div className="field">
                        <label>Desde</label>
                        <input type="date" className="dash-input" value={from} onChange={(e) => setFrom(e.target.value)} />
                    </div>
                    <div className="field">
                        <label>Hasta</label>
                        <input type="date" className="dash-input" value={to} onChange={(e) => setTo(e.target.value)} />
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '.5rem' }}>
                        <Button className="btn-ghost-sm" variant="outline" onClick={() => { setFrom(''); setTo(''); }}>
                            Limpiar rango
                        </Button>
                    </div>
                </div>
            </section>

            {/* KPIs */}
            <section className="kpis" style={{ margin: '12px' }}>
                <div className="kpi glass-panel">
                    <div className="label">Total</div>
                    <div className="value">{summary?.total ?? '—'}</div>
                </div>
                <div className="kpi glass-panel">
                    <div className="label">Abiertos</div>
                    <div className="value" style={{ color: COL.warn }}>{summary?.open ?? '—'}</div>
                </div>
                <div className="kpi glass-panel">
                    <div className="label">En progreso</div>
                    <div className="value" style={{ color: COL.accent }}>{summary?.in_progress ?? '—'}</div>
                </div>
                <div className="kpi glass-panel">
                    <div className="label">Cerrados</div>
                    <div className="value" style={{ color: COL.ok }}>{summary?.closed ?? '—'}</div>
                </div>
            </section>

            {/* Paneles con gráficas */}
            <section className="panels" style={{ margin: '12px' }}>
                <Card title="Evolución de tickets" className="panel-card">
                    <Line data={lineData} options={lineOptions} />
                </Card>
                <Card title="Distribución por estado" className="panel-card">
                    <Doughnut data={doughnutData} options={doughnutOptions} />
                </Card>
            </section>

            <section className="panels" style={{ margin: '12px' }}>
                <Card title="Por categoría" className="panel-card">
                    <Bar data={barData} options={barOptions} />
                </Card>
                <Card title="Por agente" className="panel-card">
                    <Pie data={pieData} options={pieOptions} />
                </Card>
            </section>

            {loading && (
                <div style={{ margin: '12px' }}>
                    <Card><div>Cargando…</div></Card>
                </div>
            )}
            {err && (
                <div style={{ margin: '12px' }}>
                    <Card><div className="text-rose-600">{err}</div></Card>
                </div>
            )}
        </main>
    );
}
