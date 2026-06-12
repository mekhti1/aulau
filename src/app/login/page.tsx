'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ROLE_PATHS } from '@/lib/constants';

const DEMO_ACCOUNTS = [
  { username: 'fisher1', password: '123456', label: 'Рыбак', icon: '🐟', role: 'FISHER' },
  { username: 'inspector1', password: '123456', label: 'Инспектор', icon: '🛡️', role: 'INSPECTOR' },
  { username: 'buyer1', password: '123456', label: 'Покупатель', icon: '🛒', role: 'BUYER' },
  { username: 'admin1', password: '123456', label: 'Администратор', icon: '⚙️', role: 'ADMIN' },
];

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Registration fields
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('FISHER');
  const [edsStep, setEdsStep] = useState<'form' | 'signing' | 'done'>('form');
  const [edsCert, setEdsCert] = useState('');

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

  const handleRegister = async () => {
    if (!regName || !regUsername || !regPassword) {
      setError('Заполните все поля');
      return;
    }

    // Step 1: Simulate EDS signing
    if (edsStep === 'form') {
      setEdsStep('signing');
      setError('');

      // Simulate EDS signing process
      setTimeout(() => {
        const cert = `KZ-EDS-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        setEdsCert(cert);
        setEdsStep('done');
      }, 2000);
      return;
    }

    // Step 2: Submit registration
    if (edsStep === 'done') {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: regName,
            username: regUsername,
            password: regPassword,
            role: regRole,
            certNumber: edsCert,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Ошибка регистрации');
          setLoading(false);
          return;
        }

        // Auto-login
        await handleLogin(regUsername, regPassword);
      } catch {
        setError('Ошибка соединения с сервером');
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gov-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Image
            src="/logo.png"
            alt="AULAU Logo"
            width={72}
            height={72}
            className="mx-auto mb-4 rounded-2xl shadow-lg"
          />
          <h1 className="text-2xl font-bold text-gray-900">AULAU</h1>
          <p className="text-sm text-gov-text-secondary mt-1">
            Интеллектуальная система мониторинга<br />
            и учета рыбных ресурсов Каспия
          </p>
        </div>

        {/* Mode Tabs */}
        <div className="flex bg-white rounded-xl border border-gov-border mb-4 overflow-hidden">
          <button
            onClick={() => { setMode('login'); setError(''); setEdsStep('form'); }}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              mode === 'login' ? 'bg-primary text-white' : 'text-gov-text-secondary hover:text-gray-900'
            }`}
          >
            Вход
          </button>
          <button
            onClick={() => { setMode('register'); setError(''); setEdsStep('form'); }}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              mode === 'register' ? 'bg-primary text-white' : 'text-gov-text-secondary hover:text-gray-900'
            }`}
          >
            Регистрация (ЭЦП)
          </button>
        </div>

        {mode === 'login' ? (
          <>
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
          </>
        ) : (
          /* Registration Card */
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-5">
              Регистрация через ЭЦП
            </h2>

            {edsStep === 'form' && (
              <div className="space-y-4">
                <div>
                  <label className="label-text">ФИО</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Иванов Иван Иванович"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label-text">Имя пользователя</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Логин для входа"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label-text">Пароль</label>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="Минимум 6 символов"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label-text">Роль</label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value)}
                    className="input-field"
                  >
                    <option value="FISHER">🐟 Рыбак</option>
                    <option value="BUYER">🛒 Покупатель</option>
                  </select>
                </div>

                {error && (
                  <div className="bg-red-50 text-gov-danger text-sm px-3 py-2 rounded-lg border border-red-200">
                    {error}
                  </div>
                )}

                <button onClick={handleRegister} className="btn-primary w-full">
                  🔐 Подписать ЭЦП и создать аккаунт
                </button>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-primary font-medium mb-1">💡 Демо-режим ЭЦП</p>
                  <p className="text-xs text-gov-text-secondary">
                    В демо-режиме подпись ЭЦП симулируется автоматически. 
                    В продакшене будет подключена интеграция с НУЦ РК (NCA).
                  </p>
                </div>
              </div>
            )}

            {edsStep === 'signing' && (
              <div className="text-center py-8 space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full">
                  <span className="text-3xl animate-pulse">🔐</span>
                </div>
                <h3 className="font-semibold text-gray-900">Подписание ЭЦП...</h3>
                <p className="text-sm text-gov-text-secondary">
                  Проверка сертификата электронной<br />цифровой подписи
                </p>
                <div className="flex items-center justify-center gap-1">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            {edsStep === 'done' && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <span className="text-3xl block mb-2">✅</span>
                  <h3 className="font-semibold text-gov-success mb-1">ЭЦП подтверждена</h3>
                  <p className="text-xs text-gov-text-secondary">Сертификат: {edsCert}</p>
                </div>

                <div className="bg-white border border-gov-border rounded-lg p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-gov-text-secondary">ФИО</span>
                    <span className="text-xs font-medium">{regName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gov-text-secondary">Логин</span>
                    <span className="text-xs font-medium">{regUsername}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gov-text-secondary">Роль</span>
                    <span className="text-xs font-medium">
                      {regRole === 'FISHER' ? 'Рыбак' : 'Покупатель'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gov-text-secondary">Сертификат ЭЦП</span>
                    <span className="text-xs font-mono text-primary">{edsCert}</span>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 text-gov-danger text-sm px-3 py-2 rounded-lg border border-red-200">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleRegister}
                  disabled={loading}
                  className="btn-primary w-full"
                >
                  {loading ? 'Создание аккаунта...' : '✓ Завершить регистрацию'}
                </button>
              </div>
            )}
          </div>
        )}

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
