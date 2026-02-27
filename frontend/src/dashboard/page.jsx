'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API } from '@/lib/config';
import 'chartjs-adapter-date-fns';


// Chart.js + react-chartjs-2
import {
    Chart as ChartJS,
    CategoryScale, LinearScale, TimeScale,
    BarElement, LineElement, PointElement, ArcElement,
    Tooltip, Legend, Filler,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { Line, Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale, LinearScale, TimeScale,
    BarElement, LineElement, PointElement, ArcElement,
    Tooltip, Legend, Filler
);

export default function DashboardPage() {
    const router = useRouter();
    const [token, setToken] = useState(null);
    const [me, setMe] = useState(null);

    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState(null);

    // Datos crudos
    const [summary, setSummary] = useState(null);              // {total, abiertos, en_progreso, cerrados, ...}
    const [byStatus, setByStatus] = useState([]);              // [{status, count}]
    const [byCategory, setByCategory] = useState([]);          // [{category_name, count}]
    const [byDay, setByDay] = useState([]);                    // [{day(YYYY-MM-DD), count}]
    const [byAgent, setByAgent] = useState([]);                // [{agent_name, abierto, en_progreso, cerrado, total}]

    useEffect(() => {
        const t = localStorage.getItem('token');
        const u = localStorage.getItem('user');
        if (!t || !u) { router.replace('/login'); return; }
        setToken(t);
        try { setMe(JSON.parse(u)); } catch { router.replace('/login'); }
    }, [router]);

    useEffect(() => {
        if (!token) return;
        setLoading(true);
        setErr(null);
        (async () => {
            try {
                const headers = { Authorization: `Bearer ${token}` };
                // scope=all si admin, si no, scope=mine
                const scope = (me?.role_id === 1 || me?.role_id === 2) ? 'all' : 'mine';

                const [sRes, stRes, cRes, dRes, aRes] = await Promise.all([
                    fetch(`${API}/api/dashboard/summary?scope=${scope}`, { headers }),
                    fetch(`${API}/api/dashboard/by-status?scope=${scope}`, { headers }),
                    fetch(`${API}/api/dashboard/by-category?scope=${scope}`, { headers }),
                    fetch(`${API}/api/dashboard/by-day?scope=${scope}&days=30`, { headers }),
                    fetch(`${API}/api/dashboard/by-agent?scope=${scope}`, { headers }),
                ]);

                const [s, st, c, d, a] = await Promise.all([
                    sRes.json(), stRes.json(), cRes.json(), dRes.json(), aRes.json()
                ]);

                if (!sRes.ok) throw new Error(s.message || 'Error summary');
                if (!stRes.ok) throw new Error(st.message || 'Error by-status');
                if (!cRes.ok) throw new Error(c.message || 'Error by-category');
                if (!dRes.ok) throw new Error(d.message || 'Error by-day');
                if (!aRes.ok) throw new Error(a.message || 'Error by-agent');

                setSummary(s);
                setByStatus(st || []);
                setByCategory(c || []);
                setByDay(d || []);
                setByAgent(a || []);
            } catch (e) {
                console.error(e);
                setErr(e.message);
            } finally {
                setLoading(false);
            }
        })();
    }, [token, me]);

    if (!token || !me) return <main className="p-6">Cargando…</main>;
    if (loading) return <main className="p-6">Cargando datos del dashboard…</main>;
    if (err) return <main className="p-6 text-red-600">Error: {err}</main>;

    // ====== KPIs
    const total = summary?.total ?? 0;
    const abiertos = summary?.abiertos ?? 0;
    const enProgreso = summary?.en_progreso ?? 0;
    const cerrados = summary?.cerrados ?? 0;

    // ====== Chart 1: Línea (área) — tickets por día (últimos 30)
    const lineData = useMemo(() => {
        const labels = byDay.map(x => x.day);               // 'YYYY-MM-DD'
        const counts = byDay.map(x => Number(x.count || 0));
        return {
            labels,
            datasets: [{
                label: 'Tickets por día',
                data: counts,
                tension: 0.25,
                fill: true,
            }]
        };
    }, [byDay]);

    const lineOpts = {
        responsive: true,
        plugins: { legend: { position: 'top' } },
        scales: {
            x: { type: 'time', time: { unit: 'day' }, ticks: { maxRotation: 0 } },
            y: { beginAtZero: true, suggestedMax: Math.max(5, Math.ceil(total / 10)) }
        }
    };

    // ====== Chart 2: Doughnut — distribución por estado
    const doughnutData = useMemo(() => {
        const order = ['abierto', 'en progreso', 'cerrado'];
        const map = new Map(byStatus.map(s => [s.status, Number(s.count || 0)]));
        const vals = order.map(k => map.get(k) || 0);
        return {
            labels: order,
            datasets: [{ data: vals }]
        };
    }, [byStatus]);

    const doughnutOpts = { responsive: true, plugins: { legend: { position: 'bottom' } } };

    // ====== Chart 3: Barras horizontales — top categorías
    const barCatData = useMemo(() => {
        const rows = [...byCategory].sort((a, b) => (b.count || 0) - (a.count || 0)).slice(0, 8);
        return {
            labels: rows.map(r => r.category_name || `Cat ${r.category_id}`),
            datasets: [{ label: 'Tickets', data: rows.map(r => Number(r.count || 0)) }]
        };
    }, [byCategory]);

    const barCatOpts = {
        indexAxis: 'y',
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true } }
    };

    // ====== Chart 4: Barras apiladas — carga por agente (abierto / en progreso / cerrado)
    const stackedData = useMemo(() => {
        const agents = byAgent.map(a => a.agent_name || `Agente ${a.agent_id}`);
        const opened = byAgent.map(a => Number(a.abierto || 0));
        const progressing = byAgent.map(a => Number(a.en_progreso || 0));
        const closed = byAgent.map(a => Number(a.cerrado || 0));
        return {
            labels: agents,
            datasets: [
                { label: 'Abierto', data: opened, stack: 'stack' },
                { label: 'En progreso', data: progressing, stack: 'stack' },
                { label: 'Cerrado', data: closed, stack: 'stack' },
            ]
        };
    }, [byAgent]);

    const stackedOpts = {
        responsive: true,
        plugins: { legend: { position: 'top' } },
        scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } }
    };

    return (
        <main className="p-6 space-y-6">
            <h1 className="text-2xl font-semibold">Dashboard</h1>

            {/* KPIs */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiCard title="Total" value={total} />
                <KpiCard title="Abiertos" value={abiertos} />
                <KpiCard title="En progreso" value={enProgreso} />
                <KpiCard title="Cerrados" value={cerrados} />
            </section>

            {/* Gráficas */}
            <section className="grid gap-6 lg:grid-cols-2">
                <Card title="Tendencia (últimos 30 días)">
                    {byDay?.length ? <Line data={lineData} options={lineOpts} /> : <Empty />}
                </Card>

                <Card title="Distribución por estado">
                    {byStatus?.length ? <Doughnut data={doughnutData} options={doughnutOpts} /> : <Empty />}
                </Card>

                <Card title="Top categorías por volumen">
                    {byCategory?.length ? <Bar data={barCatData} options={barCatOpts} /> : <Empty />}
                </Card>

                <Card title="Carga por agente (apilado por estado)">
                    {byAgent?.length ? <Bar data={stackedData} options={stackedOpts} /> : <Empty />}
                </Card>
            </section>
        </main>
    );
}

function KpiCard({ title, value }) {
    return (
        <div className="border rounded p-4">
            <div className="text-xs uppercase text-gray-500">{title}</div>
            <div className="text-2xl font-semibold">{value}</div>
        </div>
    );
}

function Card({ title, children }) {
    return (
        <div className="border rounded p-4">
            <div className="mb-2 font-medium">{title}</div>
            <div className="min-h-[260px] flex items-center">{children}</div>
        </div>
    );
}

function Empty() {
    return <div className="text-gray-500 text-sm">Sin datos suficientes.</div>;
}
