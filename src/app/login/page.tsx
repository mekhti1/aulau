'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ROLE_PATHS } from '@/lib/constants';

const DEMO_ACCOUNTS = [
  { username: 'fisher1', password: '123456', label: 'Рыбак', icon: '🐟', role: 'FISHER' },
  { username: 'inspector1', password: '123456', label: 'Инспектор', icon: '🛡️', role: 'INSPECTOR' },
  { username: 'buyer1', password: '123456', label: 'Покупатель', icon: '🛒', role: 'BUYER' },
  { username: 'admin1', password: '123456', label: 'Администратор', icon: '⚙️', role: 'ADMIN' },
];

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (user?: string, pass?: string) => {
    setLoading(true);
    setError('');

    const loginUsername = user || username;
    const loginPassword = pass || password;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Ошибка входа');
        setLoading(false);
        return;
      }

      const redirectPath = ROLE_PATHS[data.user.role] || '/';
      router.push(redirectPath);
    } catch {
      setError('Ошибка соединения с сервером');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gov-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">AULAU</h1>
          <p className="text-sm text-gov-text-secondary mt-1">
            Интеллектуальная система мониторинга<br />
            и учета рыбных ресурсов Каспия
          </p>
        </div>

        {/* Login Card */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">Вход в систему</h2>

          <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-4">
            <div>
              <label htmlFor="username" className="label-text">Имя пользователя</label>
              <input
                id="username"
                type="text"
                className="input-field"
                placeholder="Введите имя пользователя"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="password" className="label-text">Пароль</label>
              <input
                id="password"
                type="password"
                className="input-field"
                placeholder="Введите пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="bg-red-50 text-gov-danger text-sm px-3 py-2 rounded-lg border border-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Вход...' : 'Войти'}
            </button>
          </form>
        </div>

        {/* Demo Accounts */}
        <div className="mt-6">
          <p className="text-xs text-gov-text-secondary text-center mb-3 uppercase tracking-wider font-medium">
            Демо-аккаунты
          </p>
          <div className="grid grid-cols-2 gap-3">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.username}
                onClick={() => handleLogin(account.username, account.password)}
                disabled={loading}
                className="card hover:border-primary hover:shadow-md transition-all duration-150 text-center cursor-pointer group !p-3"
              >
                <span className="text-2xl block mb-1">{account.icon}</span>
                <span className="text-sm font-medium text-gray-900 group-hover:text-primary">
                  {account.label}
                </span>
                <span className="text-xs text-gov-text-secondary block mt-0.5">
                  {account.username}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gov-text-secondary">
            © 2024 AULAU — Мангистауская область
          </p>
          <p className="text-xs text-gov-text-secondary mt-1">
            Республика Казахстан
          </p>
        </div>
      </div>
    </div>
  );
}
