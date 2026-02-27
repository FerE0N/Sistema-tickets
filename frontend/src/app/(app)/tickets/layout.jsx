// src/tickets/layout.jsx
import AuthGuard from '@/components/AuthGuard';

export default function TicketsLayout({ children }) {
    return <AuthGuard>{children}</AuthGuard>;
}
