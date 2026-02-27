// src/components/ui/Card.jsx
export default function Card({ title, actions, children, className = '' }) {
    // si el card se usa como panel del dashboard, le quitamos borde del header
    const isPanel = className.includes('panel-card');

    return (
        <section
            className={`bg-white/90 backdrop-blur border border-soft rounded-xl shadow-soft ${className}`}
        >
            {(title || actions) && (
                <header
                    className={
                        isPanel
                            ? 'flex items-center justify-between p-4' // 👈 sin border-b para paneles
                            : 'flex items-center justify-between p-4 border-b border-soft'
                    }
                >
                    {/* data-card-title nos permite estilizar el título desde CSS */}
                    {title && <h3 data-card-title className="font-semibold text-ink">{title}</h3>}
                    {actions && <div className="flex gap-2">{actions}</div>}
                </header>
            )}

            <div className="p-4">{children}</div>
        </section>
    );
}
