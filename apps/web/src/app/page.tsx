'use client';

import { useEffect } from 'react';
import { useHasMounted } from '@/hooks/useHasMounted';

export default function Home() {
  const hasMounted = useHasMounted();

  useEffect(() => {
    if (!hasMounted) return;

    // Redirect to dashboard or login
    const token = localStorage.getItem('token');
    if (token) {
      window.location.href = '/dashboard';
    } else {
      window.location.href = '/login';
    }
  }, [hasMounted]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-orbitron gradient-text mb-4">LEADLY AI</h1>
        <p className="text-gray-400">Carregando...</p>
      </div>
    </div>
  );
}
