// src/components/ui/Button.jsx
export function Button({ children, variant = 'primary', className = '', ...props }) {
    const base = 'inline-flex items-center justify-center px-3.5 py-2 rounded-lg text-sm font-medium transition';
    const styles = {
        primary: 'bg-brand-600 hover:bg-brand-700 text-white',
        soft: 'bg-soft hover:bg-brand-100 text-ink',
        outline: 'border border-soft hover:border-brand-300 text-ink bg-white',
        danger: 'bg-rose-600 hover:bg-rose-700 text-white'
    };
    return <button className={`${base} ${styles[variant]} ${className}`} {...props}>{children}</button>;
}
