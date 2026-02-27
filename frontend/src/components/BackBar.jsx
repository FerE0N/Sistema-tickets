// src/components/BackBar.jsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

/**
 * BackBar – barra superior “glassmorphism” con:
 * - Botón regresar
 * - Título + subtítulo (opcional)
 * - Migas (breadcrumbs) opcionales
 * - Acciones a la derecha (botones, links)
 *
 * Props:
 * - title?: string
 * - subtitle?: string
 * - breadcrumbs?: Array<{label: string, href?: string}>
 * - actions?: React.ReactNode
 * - sticky?: boolean    // si true, se pega arriba
 * - onBack?: () => void // callback custom. Si no viene, hace router.back()
 */
export default function BackBar({
    title,
    subtitle,
    breadcrumbs = [],
    actions = null,
    sticky = true,
    onBack,
}) {
    const router = useRouter();

    const goBack = () => {
        if (onBack) return onBack();
        router.back();
    };

    return (
        <div className={`backbar ${sticky ? 'backbar--sticky' : ''} glass-panel`}>
            <div className="backbar__inner">
                {/* Izquierda: botón volver + títulos + migas */}
                <div className="backbar__left">
                    <button className="backbar__back" onClick={goBack} aria-label="Volver">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                            <path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span>Volver</span>
                    </button>

                    <div className="backbar__meta">
                        {breadcrumbs?.length > 0 && (
                            <nav className="backbar__crumbs" aria-label="Breadcrumb">
                                {breadcrumbs.map((c, i) => {
                                    const last = i === breadcrumbs.length - 1;
                                    return (
                                        <span key={i} className={`crumb ${last ? 'is-current' : ''}`}>
                                            {c.href && !last ? <Link href={c.href}>{c.label}</Link> : <span>{c.label}</span>}
                                            {!last && <span className="crumb__sep">/</span>}
                                        </span>
                                    );
                                })}
                            </nav>
                        )}

                        {(title || subtitle) && (
                            <div className="backbar__titles">
                                {title && <h1 className="bb-title">{title}</h1>}
                                {subtitle && <p className="bb-subtitle">{subtitle}</p>}
                            </div>
                        )}
                    </div>
                </div>

                {/* Derecha: acciones */}
                {actions && <div className="backbar__actions">{actions}</div>}
            </div>
        </div>
    );
}
