'use client';

import Image from 'next/image';
import { ROLE_LABELS } from '@/lib/constants';

interface HeaderProps {
  userName: string;
  userRole: string;
  onLogout: () => void;
}

export default function Header({ userName, userRole, onLogout }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gov-border sticky top-0 z-40">
      <div className="flex items-center justify-between px-4 md:px-6 h-14">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="AULAU" width={32} height={32} className="rounded-lg" />
            <span className="font-bold text-gray-900 hidden sm:block">AULAU</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-gray-900">{userName}</p>
            <p className="text-xs text-gov-text-secondary">{ROLE_LABELS[userRole] || userRole}</p>
          </div>
          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-primary">
              {userName.charAt(0).toUpperCase()}
            </span>
          </div>
          <button
            onClick={onLogout}
            className="text-sm text-gov-text-secondary hover:text-gov-danger transition-colors"
            title="Выйти"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
