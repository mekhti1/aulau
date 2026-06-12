'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';

const NAV_ITEMS = [
  { href: '/fisher', label: 'Главная', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { href: '/fisher/nets', label: 'Сети', icon: 'M4 6h16M4 12h16m-7 6h7' },
  { href: '/fisher/catch', label: 'Улов', icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6' },
  { href: '/fisher/batches', label: 'Партии', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
];

export default function FisherLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth('FISHER');
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="min-h-screen bg-gov-bg flex items-center justify-center">
        <div className="text-gov-text-secondary">Загрузка...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gov-bg pb-16 md:pb-0">
      <Header userName={user.name} userRole={user.role} onLogout={logout} />
      
      <main className="max-w-2xl mx-auto px-4 py-4 md:py-6">
        {children}
      </main>

      {/* Mobile bottom navigation */}
      <nav className="bottom-nav md:hidden">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`bottom-nav-item ${pathname === item.href ? 'active' : ''}`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
            </svg>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
