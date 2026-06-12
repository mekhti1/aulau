'use client';

import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth('BUYER');

  if (loading) {
    return (
      <div className="min-h-screen bg-gov-bg flex items-center justify-center">
        <div className="text-gov-text-secondary">Загрузка...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gov-bg">
      <Header userName={user.name} userRole={user.role} onLogout={logout} />
      <main className="max-w-6xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
