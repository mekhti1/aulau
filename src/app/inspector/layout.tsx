'use client';

import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';

export default function InspectorLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth('INSPECTOR');

  if (loading) {
    return (
      <div className="min-h-screen bg-gov-bg flex items-center justify-center">
        <div className="text-gov-text-secondary">Загрузка...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gov-bg flex flex-col">
      <Header userName={user.name} userRole={user.role} onLogout={logout} />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
