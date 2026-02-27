// src/app/layout.tsx  (Server Component)
import '@/app/styles/globals.css';
import '@/app/styles/appshell.css';
import '@/app/styles/tables.css';
import '@/app/styles/forms.css';
import '@/app/styles/backbar.css';

export const metadata = { title: 'Tickets', description: 'Sistema de tickets' };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        {/* Tipografía Inter (opcional, moderna y legible) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className='bg-app text-ink'>
        {/* Contenedor máximo + padding global */}
        <div className="animated-bg pattern-overlay">
          {children}
        </div>
      </body>
    </html>
  );
}
