// src/app/(app)/dashboard/layout.jsx
import '../../styles/dashboard.css';

export default function DashboardLayout({ children }) {
    // Nada de AppShell aquí para evitar duplicado.
    return <>{children}</>;
}
