import AppShell from "@/components/AppShell";
import '@/app/styles/appshell.css';
import '@/app/styles/globals.css';
import "@/app/styles/admin.css";

export default function MainLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <div className="animated-bg pattern-overlay">
                {/* 👇 aquí SÍ aplicamos el “wrapper” de la app */}
                <AppShell>{children}</AppShell>
            </div>
        </>
    );
}
