'use client';

import dynamic from 'next/dynamic';

const Sidebar = dynamic(() => import('@/components/layout/Sidebar'), { ssr: false });

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-dark-bg">
      <Sidebar />
      <main className="ml-64 min-h-screen transition-all duration-300">
        {children}
      </main>
    </div>
  );
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
