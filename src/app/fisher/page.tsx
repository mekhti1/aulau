'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BATCH_STATUS_LABELS } from '@/lib/constants';

interface UserData {
  quotaLimitKg: number;
  quotaUsedKg: number;
}

interface BatchData {
  id: string;
  batchCode: string;
  species: string;
  weightKg: number;
  status: string;
  caughtAt: string;
  listed: boolean;
  sold: boolean;
}

export default function FisherHome() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [batches, setBatches] = useState<BatchData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then((r) => r.json()),
      fetch('/api/batches').then((r) => r.json()),
    ])
      .then(([meData, batchData]) => {
        // Get full user data with quota
        fetch(`/api/fisher/profile`)
          .then((r) => r.json())
          .then((profile) => {
            setUserData(profile.user);
          })
          .catch(() => {
            setUserData({ quotaLimitKg: 500, quotaUsedKg: 0 });
          });
        setBatches(batchData.batches || []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-8 text-gov-text-secondary">Загрузка...</div>;
  }

  const quotaLimit = userData?.quotaLimitKg || 500;
  const quotaUsed = userData?.quotaUsedKg || 0;
  const quotaRemaining = quotaLimit - quotaUsed;
  const quotaPercent = Math.round((quotaUsed / quotaLimit) * 100);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Главная</h1>

      {/* Quota Card */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gov-text-secondary uppercase tracking-wider mb-3">
          Квота на вылов
        </h2>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{quotaLimit}</p>
            <p className="text-xs text-gov-text-secondary">Общая (кг)</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{Math.round(quotaUsed * 10) / 10}</p>
            <p className="text-xs text-gov-text-secondary">Использовано</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gov-success">{Math.round(quotaRemaining * 10) / 10}</p>
            <p className="text-xs text-gov-text-secondary">Остаток</p>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all ${
              quotaPercent > 90 ? 'bg-gov-danger' : quotaPercent > 70 ? 'bg-gov-warning' : 'bg-gov-success'
            }`}
            style={{ width: `${Math.min(quotaPercent, 100)}%` }}
          />
        </div>
        <p className="text-xs text-gov-text-secondary mt-1 text-right">{quotaPercent}%</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/fisher/catch" className="card hover:border-primary transition-colors text-center !p-4">
          <span className="text-2xl block mb-1">🎣</span>
          <span className="text-sm font-medium text-gray-900">Зарегистрировать улов</span>
        </Link>
        <Link href="/fisher/nets" className="card hover:border-primary transition-colors text-center !p-4">
          <span className="text-2xl block mb-1">🥅</span>
          <span className="text-sm font-medium text-gray-900">Мои сети</span>
        </Link>
      </div>

      {/* Offline indicator */}
      <div id="offline-indicator" className="hidden card !bg-yellow-50 !border-yellow-200">
        <div className="flex items-center gap-2">
          <span className="text-yellow-600">⚠️</span>
          <p className="text-sm text-yellow-800">
            Данные будут отправлены после восстановления соединения
          </p>
        </div>
      </div>

      {/* Recent Batches */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gov-text-secondary uppercase tracking-wider mb-3">
          Последние партии
        </h2>
        {batches.length === 0 ? (
          <p className="text-sm text-gov-text-secondary text-center py-4">
            Нет зарегистрированных партий
          </p>
        ) : (
          <div className="space-y-2">
            {batches.slice(0, 5).map((batch) => (
              <div key={batch.id} className="flex items-center justify-between py-2 border-b border-gov-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{batch.species}</p>
                  <p className="text-xs text-gov-text-secondary">
                    {batch.weightKg} кг · {new Date(batch.caughtAt).toLocaleDateString('ru-RU')}
                  </p>
                </div>
                <span className={`badge ${
                  batch.status === 'VERIFIED' ? 'badge-success' :
                  batch.status === 'FLAGGED' ? 'badge-danger' : 'badge-warning'
                }`}>
                  {BATCH_STATUS_LABELS[batch.status]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
