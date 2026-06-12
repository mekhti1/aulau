'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

interface PublicBatchData {
  batch: {
    batchCode: string;
    species: string;
    weightKg: number;
    caughtAt: string;
    lat: number;
    lng: number;
    status: string;
    fisher: string;
    buyerName: string | null;
  };
  verified: boolean;
}

export default function PublicTracePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const code = params.code as string;
  const sig = searchParams.get('sig');
  const [data, setData] = useState<PublicBatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const url = sig
      ? `/api/trace/public/${code}?sig=${encodeURIComponent(sig)}`
      : `/api/trace/public/${code}`;

    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then(setData)
      .catch(() => setError('not_found'))
      .finally(() => setLoading(false));
  }, [code, sig]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-red-100 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-xl p-8 text-center border-2 border-red-200">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h1 className="text-xl font-bold text-red-700 mb-2">Недействительный QR-код</h1>
          <p className="text-sm text-gray-600 mb-4">
            Возможно, продукция не зарегистрирована в системе AULAU.
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-xs text-red-600 font-medium">
              Если вы считаете, что произошла ошибка, обратитесь в службу поддержки.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-center gap-2 text-gray-400">
              <span className="text-lg">🐟</span>
              <span className="text-xs font-medium">AULAU — Мониторинг рыбных ресурсов</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const batch = data.batch;
  const isVerified = data.verified && batch.status === 'VERIFIED';

  const getZoneName = (lat: number, lng: number) => {
    if (lat > 46) return 'Северный Каспий';
    if (lat > 44) return 'Центральный Каспий';
    return 'Южный Каспий';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50">
      {/* Header */}
      <div className="bg-white border-b border-blue-100 shadow-sm">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">🐟</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900">AULAU</h1>
              <p className="text-[10px] text-gray-400 leading-none">Цифровой паспорт продукции</p>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-full">
            <span className="text-[10px]">🇰🇿</span>
            <span className="text-[10px] text-blue-700 font-medium">Мангистау</span>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4 pb-8">
        {/* Verification Status */}
        <div className={`rounded-2xl p-5 shadow-lg border-2 ${
          isVerified
            ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200'
            : 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isVerified ? 'bg-emerald-100' : 'bg-amber-100'
            }`}>
              <span className="text-2xl">{isVerified ? '✅' : '⏳'}</span>
            </div>
            <div>
              <p className={`font-bold text-lg ${isVerified ? 'text-emerald-700' : 'text-amber-700'}`}>
                {isVerified ? 'QR подтвержден системой AULAU' : 'Статус: На проверке'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {isVerified
                  ? 'Продукция прошла государственную проверку'
                  : 'Данные ожидают подтверждения инспектором'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Fish Info Card */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-4">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <p className="text-xs uppercase tracking-wider opacity-80">Вид рыбы</p>
                <p className="text-2xl font-bold mt-0.5">{batch.species}</p>
              </div>
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <span className="text-3xl">🐟</span>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-0">
            <InfoRow icon="👨‍🌾" label="Рыбак" value={batch.fisher} />
            <InfoRow
              icon="📅"
              label="Дата вылова"
              value={new Date(batch.caughtAt).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            />
            <InfoRow icon="📍" label="Район вылова" value={getZoneName(batch.lat, batch.lng)} />
            <InfoRow icon="⚖️" label="Вес" value={`${batch.weightKg} кг`} />
            {batch.buyerName && (
              <InfoRow icon="🛒" label="Покупатель" value={batch.buyerName} />
            )}
            <InfoRow
              icon="📦"
              label="Партия"
              value={batch.batchCode}
              mono
            />
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Гарантии качества
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <TrustBadge icon="🛡️" text="Государственный контроль" />
            <TrustBadge icon="🔐" text="ЭЦП подписано" />
            <TrustBadge icon="📡" text="AI мониторинг" />
            <TrustBadge icon="🌊" text="Каспийский регион" />
          </div>
        </div>

        {/* Thank You Message */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5">🌊</span>
            <div>
              <p className="font-semibold text-sm leading-snug">
                Спасибо, что выбираете легальную продукцию и помогаете сохранять Каспий.
              </p>
              <p className="text-xs mt-2 opacity-80">
                Каждая покупка проверенной рыбы — вклад в защиту экосистемы Каспийского моря и поддержку легальных рыбаков.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-2 pb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center">
              <span className="text-white text-xs">🐟</span>
            </div>
            <span className="text-sm font-bold text-gray-700">AULAU</span>
          </div>
          <p className="text-[10px] text-gray-400">
            Интеллектуальная система мониторинга рыбных ресурсов Каспия
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            Мангистауская область, Республика Казахстан
          </p>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value, mono }: { icon: string; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <span className={`text-sm font-semibold text-gray-900 ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function TrustBadge({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2.5">
      <span className="text-base">{icon}</span>
      <span className="text-xs font-medium text-gray-600 leading-tight">{text}</span>
    </div>
  );
}
