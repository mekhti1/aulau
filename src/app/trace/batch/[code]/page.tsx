'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface TimelineStep {
  step: string;
  date: string | null;
  done: boolean;
}

interface BatchData {
  batch: {
    batchCode: string;
    species: string;
    weightKg: number;
    caughtAt: string;
    lat: number;
    lng: number;
    status: string;
    listed: boolean;
    sold: boolean;
    signedBy: string | null;
    certNumber: string | null;
    price: number | null;
    owner: { name: string; username: string; trustScore: number };
    transactions: Array<{
      price: number;
      createdAt: string;
      buyer: { name: string };
    }>;
  };
  verified: boolean;
  timeline: TimelineStep[];
}

export default function TraceBatchPage() {
  const params = useParams();
  const code = params.code as string;
  const [data, setData] = useState<BatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/trace/batch/${code}`)
      .then(r => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then(setData)
      .catch(() => setError('Партия не найдена'))
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

  const batch = data.batch;

  return (
    <div className="min-h-screen bg-gov-bg p-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-primary rounded-xl mb-2">
            <span className="text-white text-lg">🐟</span>
          </div>
          <h1 className="text-lg font-bold text-gray-900">Цифровой паспорт партии</h1>
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

        {/* Batch Info */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-900">Информация о партии</h2>
          <div className="flex justify-between">
            <span className="text-sm text-gov-text-secondary">Код</span>
            <span className="text-sm font-mono font-medium">{batch.batchCode}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gov-text-secondary">Вид рыбы</span>
            <span className="text-sm font-medium">{batch.species}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gov-text-secondary">Вес</span>
            <span className="text-sm font-medium">{batch.weightKg} кг</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gov-text-secondary">Рыбак</span>
            <span className="text-sm font-medium">{batch.owner.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gov-text-secondary">Дата вылова</span>
            <span className="text-sm font-medium">{new Date(batch.caughtAt).toLocaleDateString('ru-RU')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gov-text-secondary">Местоположение</span>
            <span className="text-sm font-medium">{batch.lat.toFixed(2)}°, {batch.lng.toFixed(2)}°</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gov-text-secondary">Статус</span>
            <span className={`badge ${
              batch.status === 'VERIFIED' ? 'badge-success' :
              batch.status === 'FLAGGED' ? 'badge-danger' : 'badge-warning'
            }`}>
              {batch.status === 'VERIFIED' ? 'Проверено' : batch.status === 'FLAGGED' ? 'Подозрительно' : 'На рассмотрении'}
            </span>
          </div>
          {batch.sold && (
            <div className="flex justify-between">
              <span className="text-sm text-gov-text-secondary">Продажа</span>
              <span className="badge badge-info">Продано</span>
            </div>
          )}
        </div>

        {/* EDS */}
        {batch.signedBy && (
          <div className="card !bg-blue-50 !border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-primary">🔐</span>
              <h2 className="font-semibold text-primary">Подписано ЭЦП</h2>
            </div>
            <p className="text-sm text-gov-text-secondary">Подписал: {batch.signedBy}</p>
            <p className="text-sm text-gov-text-secondary">Сертификат: {batch.certNumber}</p>
          </div>
        )}

        {/* Timeline */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-3">История партии</h2>
          <div className="space-y-0">
            {data.timeline.map((step, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full ${step.done ? 'bg-gov-success' : 'bg-gray-300'}`} />
                  {i < data.timeline.length - 1 && (
                    <div className={`w-0.5 h-8 ${step.done ? 'bg-gov-success' : 'bg-gray-200'}`} />
                  )}
                </div>
                <div className="pb-4">
                  <p className={`text-sm font-medium ${step.done ? 'text-gray-900' : 'text-gray-400'}`}>
                    {step.step}
                  </p>
                  {step.date && (
                    <p className="text-xs text-gov-text-secondary">
                      {new Date(step.date).toLocaleString('ru-RU')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transaction history */}
        {batch.transactions.length > 0 && (
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-3">Транзакции</h2>
            {batch.transactions.map((t, i) => (
              <div key={i} className="flex justify-between py-2 border-b border-gov-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{t.buyer.name}</p>
                  <p className="text-xs text-gov-text-secondary">
                    {new Date(t.createdAt).toLocaleDateString('ru-RU')}
                  </p>
                </div>
                <p className="text-sm font-bold text-primary">{t.price.toLocaleString('ru-RU')} ₸</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
