// src/admin/layout.jsx
import AdminGuard from '@/components/AdminGuard';
import "@/app/styles/admin.css";

export const metadata = { title: 'Admin' };

export default function AdminLayout({ children }) {
    return (
        <AdminGuard>
            <div className="p-6 space-y-4">
                {children}
            </div>
        </AdminGuard>
    );
}
