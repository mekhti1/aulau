'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FISH_SPECIES } from '@/lib/constants';

interface Batch {
  id: string;
  batchCode: string;
  species: string;
  weightKg: number;
  price: number | null;
  caughtAt: string;
  lat: number;
  lng: number;
  status: string;
  listed: boolean;
  sold: boolean;
  signedBy: string | null;
  certNumber: string | null;
  owner: {
    name: string;
    username: string;
    trustScore: number;
  };
}

export default function MarketplacePage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [filterSpecies, setFilterSpecies] = useState('');
  const [filterWeight, setFilterWeight] = useState('');
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    const res = await fetch('/api/batches?status=VERIFIED&listed=true&sold=false');
    const data = await res.json();
    setBatches(data.batches || []);
    setLoading(false);
  };

  const handlePurchase = async (id: string) => {
    setPurchasing(id);
    const res = await fetch(`/api/batches/${id}/purchase`, { method: 'POST' });
    if (res.ok) {
      setPurchaseSuccess(id);
      fetchBatches();
    }
    setPurchasing(null);
  };

  const filteredBatches = batches.filter((b) => {
    if (filterSpecies && b.species !== filterSpecies) return false;
    if (filterWeight) {
      const min = parseFloat(filterWeight);
      if (b.weightKg < min) return false;
    }
    return true;
  });

  const renderStars = (score: number) => {
    const stars = Math.round(score);
    return '★'.repeat(stars) + '☆'.repeat(5 - stars);
  };

  if (loading) {
    return <div className="text-center py-8 text-gov-text-secondary">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Маркетплейс</h1>
          <p className="text-sm text-gov-text-secondary">Проверенная рыбная продукция Каспия</p>
        </div>
        <Link href="/marketplace/analytics" className="btn-secondary text-sm">
          📊 Мои покупки
        </Link>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="label-text">Вид рыбы</label>
            <select value={filterSpecies} onChange={(e) => setFilterSpecies(e.target.value)} className="input-field">
              <option value="">Все виды</option>
              {FISH_SPECIES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-text">Мин. вес (кг)</label>
            <input
              type="number"
              value={filterWeight}
              onChange={(e) => setFilterWeight(e.target.value)}
              className="input-field"
              placeholder="От"
            />
          </div>
          <div className="flex items-end">
            <button onClick={() => { setFilterSpecies(''); setFilterWeight(''); }} className="btn-secondary w-full">
              Сбросить
            </button>
          </div>
        </div>
      </div>

      {/* Purchase success */}
      {purchaseSuccess && (
        <div className="card !bg-green-50 !border-green-200">
          <div className="flex items-center gap-2">
            <span className="text-gov-success text-lg">✓</span>
            <p className="text-sm text-gov-success font-medium">Покупка оформлена успешно!</p>
          </div>
          <button onClick={() => setPurchaseSuccess(null)} className="text-xs text-gov-text-secondary mt-1 underline">
            Закрыть
          </button>
        </div>
      )}

      {/* Batches Grid */}
      {filteredBatches.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-gov-text-secondary">Нет доступных партий</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBatches.map((batch) => (
            <div key={batch.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">{batch.species}</h3>
                  <p className="text-sm text-gov-text-secondary">{batch.weightKg} кг</p>
                </div>
                <span className="badge badge-success">Проверено</span>
              </div>

              {/* Trust score */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-yellow-500 text-sm">
                  {renderStars(batch.owner.trustScore)}
                </span>
                <span className="text-xs text-gov-text-secondary">{batch.owner.name}</span>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-1 mb-3">
                <span className="badge badge-success text-xs">✓ Проверенный улов</span>
                {batch.certNumber && (
                  <span className="badge badge-info text-xs">ЭЦП</span>
                )}
              </div>

              <div className="text-sm text-gov-text-secondary mb-3">
                <p>📅 {new Date(batch.caughtAt).toLocaleDateString('ru-RU')}</p>
                <p>📍 {batch.lat.toFixed(2)}°, {batch.lng.toFixed(2)}°</p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gov-border">
                <p className="text-lg font-bold text-primary">
                  {(batch.price || batch.weightKg * 2500).toLocaleString('ru-RU')} ₸
                </p>
                <div className="flex gap-2">
                  <Link
                    href={`/trace/batch/${batch.batchCode}`}
                    className="btn-secondary text-xs !px-3 !py-1.5"
                  >
                    Паспорт
                  </Link>
                  <button
                    onClick={() => handlePurchase(batch.id)}
                    disabled={purchasing === batch.id}
                    className="btn-primary text-xs !px-3 !py-1.5"
                  >
                    {purchasing === batch.id ? '...' : 'Купить'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
