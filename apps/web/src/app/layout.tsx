import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LEADLY AI - Central de Agentes',
  description: 'Plataforma SaaS multi-tenant para gerenciamento de agentes de IA',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="matrix-bg" />
        {children}
      </body>
    </html>
  );
}
