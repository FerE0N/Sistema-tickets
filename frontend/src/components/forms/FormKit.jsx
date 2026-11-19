// src/components/forms/FormKit.jsx
// Kit mínimo de formularios (usa las clases de app/styles/forms.css).
'use client';

const cx = (...c) => c.filter(Boolean).join(' ');

export default function Form({ className, children, ...props }) {
    return (
        <form className={cx('form', className)} noValidate {...props}>
            {children}
        </form>
    );
}

export function FormSection({ className, children }) {
    return <section className={cx('form-section', className)}>{children}</section>;
}

export function FormTitle({ children }) {
    return <h2 className="form-section-title">{children}</h2>;
}

export function FormGrid({ className, children }) {
    return <div className={cx('form-grid', className)}>{children}</div>;
}

export function FormField({ label, htmlFor, error, help, className, children }) {
    return (
        <div className={cx('form-field', className)}>
            {label && <label className="form-label" htmlFor={htmlFor}>{label}</label>}
            {children}
            {help && !error && <p className="form-help">{help}</p>}
            {error && <p className="error-text" role="alert">{error}</p>}
        </div>
    );
}

export function Input({ className, error, ...props }) {
    return <input className={cx('input', error && 'field-error', className)} aria-invalid={error || undefined} {...props} />;
}

export function Select({ className, error, children, ...props }) {
    return (
        <select className={cx('select', error && 'field-error', className)} aria-invalid={error || undefined} {...props}>
            {children}
        </select>
    );
}

export function FormActions({ children }) {
    return <div className="form-actions">{children}</div>;
}
