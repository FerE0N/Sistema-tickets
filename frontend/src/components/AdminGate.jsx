// src/components/AdminGate.jsx
'use client';
import AdminGuard from './AdminGuard';

export default function AdminGate({ children }) {
    return <AdminGuard>{children}</AdminGuard>;
}
