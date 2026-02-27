// src/components/SlideOver.jsx
'use client';

export default function SlideOver({ open, title, onClose, children, width = 460 }) {
    return (
        <>
            {/* Overlay */}
            <div
                className={`slideover-overlay ${open ? 'open' : ''}`}
                onClick={onClose}
                aria-hidden={!open}
            />

            {/* Panel */}
            <aside
                className={`slideover-panel glass-panel ${open ? 'open' : ''}`}
                style={{ width }}
                role="dialog"
                aria-modal="true"
            >
                <header className="slideover-header">
                    <h3 className="slideover-title">{title}</h3>
                    <button className="slideover-close" onClick={onClose} aria-label="Cerrar">✕</button>
                </header>

                <div className="slideover-body">
                    {children}
                </div>
            </aside>
        </>
    );
}
