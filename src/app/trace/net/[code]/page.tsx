'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface NetData {
  net: {
    netCode: string;
    zone: string;
    expiresAt: string;
    createdAt: string;
    owner: { name: string; username: string; trustScore: number };
  };
  verified: boolean;
  expired: boolean;
}

export default function TraceNetPage() {
  const params = useParams();
  const code = params.code as string;
  const [data, setData] = useState<NetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/trace/net/${code}`)
      .then(r => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then(setData)
      .catch(() => setError('Сеть не найдена'))
      .finally(() => setLoading(false));
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gov-bg flex items-center justify-center">
        <div className="text-gov-text-secondary">Загрузка...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gov-bg flex items-center justify-center p-4">
        <div className="card max-w-sm w-full text-center">
          <span className="text-4xl">❌</span>
          <h1 className="text-lg font-bold text-gov-danger mt-2">{error}</h1>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gov-bg p-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-primary rounded-xl mb-2">
            <span className="text-white text-lg">🥅</span>
          </div>
          <h1 className="text-lg font-bold text-gray-900">Цифровой паспорт сети</h1>
          <p className="text-sm text-gov-text-secondary">AULAU — Мониторинг рыбных ресурсов</p>
        </div>

        {/* Verification */}
        <div className={`card ${data.verified ? '!border-green-300 !bg-green-50' : '!border-red-300 !bg-red-50'}`}>
          <div className="flex items-center gap-2">
            <span className="text-lg">{data.verified ? '✅' : '❌'}</span>
            <p className={`font-semibold ${data.verified ? 'text-gov-success' : 'text-gov-danger'}`}>
              {data.verified ? 'QR-код действителен' : 'Недействительный QR-код'}
            </p>
          </div>
        </div>

        <div className="card space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gov-text-secondary">Код сети</span>
            <span className="text-sm font-mono font-medium">{data.net.netCode}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gov-text-secondary">Владелец</span>
            <span className="text-sm font-medium">{data.net.owner.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gov-text-secondary">Зона лова</span>
            <span className="text-sm font-medium">{data.net.zone}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gov-text-secondary">Статус</span>
            <span className={`badge ${data.expired ? 'badge-danger' : 'badge-success'}`}>
              {data.expired ? 'Срок истёк' : 'Активна'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gov-text-secondary">Действительна до</span>
            <span className="text-sm font-medium">{new Date(data.net.expiresAt).toLocaleDateString('ru-RU')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gov-text-secondary">Зарегистрирована</span>
            <span className="text-sm font-medium">{new Date(data.net.createdAt).toLocaleDateString('ru-RU')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
