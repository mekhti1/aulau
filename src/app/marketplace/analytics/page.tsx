'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

const PieChart = dynamic(() => import('recharts').then(m => m.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then(m => m.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then(m => m.Cell), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false });

const COLORS = ['#1E5A96', '#2F7ABF', '#2E7D32', '#F9A825', '#C62828', '#7B1FA2'];

interface Purchase {
  id: string;
  receiptNumber: number;
  price: number;
  createdAt: string;
  batch: {
    batchCode: string;
    species: string;
    weightKg: number;
    caughtAt: string;
    lat: number;
    lng: number;
    status: string;
    fisher: string;
    certNumber: string | null;
  };
  buyerName: string;
  publicQR: string;
  inspectorQR: string;
  publicSig: string;
}

export default function BuyerAnalytics() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [receiptModal, setReceiptModal] = useState<Purchase | null>(null);
  const [qrFullscreen, setQrFullscreen] = useState<Purchase | null>(null);

  useEffect(() => {
    fetch('/api/buyer/purchases')
      .then(r => r.json())
      .then(data => setPurchases(data.purchases || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-8 text-gov-text-secondary">Загрузка...</div>;
  }

  const totalKg = purchases.reduce((s, t) => s + (t.batch?.weightKg || 0), 0);
  const totalSpent = purchases.reduce((s, t) => s + t.price, 0);

  // Species distribution
  const speciesMap: Record<string, number> = {};
  purchases.forEach(t => {
    if (t.batch) {
      speciesMap[t.batch.species] = (speciesMap[t.batch.species] || 0) + t.batch.weightKg;
    }
  });
  const pieData = Object.entries(speciesMap).map(([name, value]) => ({ name, value: Math.round(value * 10) / 10 }));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Мои покупки</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="text-sm text-gov-text-secondary">Всего куплено</p>
          <p className="text-2xl font-bold text-gray-900">{Math.round(totalKg * 10) / 10} кг</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-gov-text-secondary">Потрачено</p>
          <p className="text-2xl font-bold text-primary">{totalSpent.toLocaleString('ru-RU')} ₸</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-gov-text-secondary">Транзакций</p>
          <p className="text-2xl font-bold text-gray-900">{purchases.length}</p>
        </div>
      </div>

      {/* Species chart */}
      {pieData.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold text-gov-text-secondary uppercase tracking-wider mb-3">
            По видам рыбы
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value} кг`}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Purchase History with QR */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gov-text-secondary uppercase tracking-wider mb-4">
          История покупок
        </h2>
        {purchases.length === 0 ? (
          <p className="text-sm text-gov-text-secondary text-center py-4">Нет покупок</p>
        ) : (
          <div className="space-y-4">
            {purchases.map(purchase => (
              <PurchaseCard
                key={purchase.id}
                purchase={purchase}
                onOpenReceipt={() => setReceiptModal(purchase)}
                onShowQR={() => setQrFullscreen(purchase)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      {receiptModal && (
        <ReceiptModal
          purchase={receiptModal}
          onClose={() => setReceiptModal(null)}
        />
      )}

      {/* QR Fullscreen Modal */}
      {qrFullscreen && (
        <QRFullscreenModal
          purchase={qrFullscreen}
          onClose={() => setQrFullscreen(null)}
        />
      )}
    </div>
  );
}

/* ====== Purchase Card ====== */
function PurchaseCard({
  purchase,
  onOpenReceipt,
  onShowQR,
}: {
  purchase: Purchase;
  onOpenReceipt: () => void;
  onShowQR: () => void;
}) {
  return (
    <div className="border border-gov-border rounded-xl p-4 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge badge-info text-xs">Чек №{purchase.receiptNumber}</span>
            <span className="badge badge-success text-xs">Проверено</span>
          </div>
          <h3 className="font-semibold text-gray-900">{purchase.batch.species}</h3>
          <p className="text-sm text-gov-text-secondary">
            {purchase.batch.weightKg} кг · {purchase.batch.fisher}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-primary">{purchase.price.toLocaleString('ru-RU')} ₸</p>
          <p className="text-xs text-gov-text-secondary">
            {new Date(purchase.createdAt).toLocaleDateString('ru-RU')}
          </p>
        </div>
      </div>

      <div className="text-xs text-gov-text-secondary mb-3">
        <span className="font-mono bg-gray-50 px-1.5 py-0.5 rounded">{purchase.batch.batchCode}</span>
      </div>

      <div className="flex gap-2 pt-3 border-t border-gov-border">
        <button
          onClick={onOpenReceipt}
          className="btn-secondary text-xs flex-1 !py-2"
        >
          🧾 Открыть чек
        </button>
        <button
          onClick={onShowQR}
          className="btn-primary text-xs flex-1 !py-2"
        >
          📱 Показать QR клиенту
        </button>
      </div>
    </div>
  );
}

/* ====== Receipt Modal ====== */
function ReceiptModal({
  purchase,
  onClose,
}: {
  purchase: Purchase;
  onClose: () => void;
}) {
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const inspectorQRRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const renderQR = async () => {
      const QRCode = (await import('qrcode')).default;

      // Public QR
      if (qrCanvasRef.current) {
        const publicUrl = `${window.location.origin}/trace/public/${purchase.batch.batchCode}?sig=${purchase.publicSig}`;
        await QRCode.toCanvas(qrCanvasRef.current, publicUrl, {
          width: 160,
          margin: 1,
          color: { dark: '#1E5A96', light: '#FFFFFF' },
        });
      }

      // Inspector QR
      if (inspectorQRRef.current) {
        await QRCode.toCanvas(inspectorQRRef.current, purchase.inspectorQR, {
          width: 120,
          margin: 1,
          color: { dark: '#C62828', light: '#FFFFFF' },
        });
      }
    };

    renderQR();
  }, [purchase]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Receipt Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6 rounded-t-2xl text-white text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-2xl">🐟</span>
            <span className="text-xl font-bold">AULAU</span>
          </div>
          <p className="text-xs opacity-80">Цифровой чек покупки</p>
        </div>

        <div className="p-6 space-y-4">
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">Чек №{purchase.receiptNumber}</p>
            <p className="text-sm text-gov-text-secondary">
              {new Date(purchase.createdAt).toLocaleString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>

          <div className="border-t border-b border-dashed border-gray-200 py-4 space-y-2.5">
            <ReceiptRow label="Покупатель" value={purchase.buyerName} />
            <ReceiptRow label="Рыбак" value={purchase.batch.fisher} />
            <ReceiptRow label="Вид рыбы" value={purchase.batch.species} />
            <ReceiptRow label="Вес" value={`${purchase.batch.weightKg} кг`} />
            <ReceiptRow label="Партия" value={purchase.batch.batchCode} mono />
            {purchase.batch.certNumber && (
              <ReceiptRow label="ЭЦП" value={purchase.batch.certNumber} mono />
            )}
          </div>

          <div className="text-center py-2">
            <p className="text-sm text-gov-text-secondary">Итого</p>
            <p className="text-3xl font-black text-primary">{purchase.price.toLocaleString('ru-RU')} ₸</p>
          </div>

          {/* QR Codes */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Публичный QR</p>
              <div className="bg-gray-50 rounded-lg p-2 inline-block">
                <canvas ref={qrCanvasRef} />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Для клиентов</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Инспекторский QR</p>
              <div className="bg-gray-50 rounded-lg p-2 inline-block">
                <canvas ref={inspectorQRRef} />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Для проверки</p>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
            <p className="text-xs text-green-700 font-medium">✅ Проверено системой AULAU</p>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100">
          <button onClick={onClose} className="btn-secondary w-full">
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}

function ReceiptRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-sm text-gov-text-secondary">{label}</span>
      <span className={`text-sm font-medium text-gray-900 ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  );
}

/* ====== QR Fullscreen Modal ====== */
function QRFullscreenModal({
  purchase,
  onClose,
}: {
  purchase: Purchase;
  onClose: () => void;
}) {
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const renderQR = async () => {
      const QRCode = (await import('qrcode')).default;
      if (qrCanvasRef.current) {
        const publicUrl = `${window.location.origin}/trace/public/${purchase.batch.batchCode}?sig=${purchase.publicSig}`;
        await QRCode.toCanvas(qrCanvasRef.current, publicUrl, {
          width: 280,
          margin: 2,
          color: { dark: '#1E5A96', light: '#FFFFFF' },
        });
      }
    };
    renderQR();
  }, [purchase]);

  return (
    <div
      className="fixed inset-0 bg-gradient-to-br from-blue-900 to-cyan-900 z-50 flex flex-col items-center justify-center p-6"
      onClick={onClose}
    >
      <div className="text-center" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="text-3xl">🐟</span>
          <span className="text-2xl font-bold text-white">AULAU</span>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-2xl mb-6">
          <canvas ref={qrCanvasRef} className="mx-auto" />
          <div className="mt-4">
            <p className="text-lg font-bold text-gray-900">{purchase.batch.species}</p>
            <p className="text-sm text-gov-text-secondary">{purchase.batch.weightKg} кг · {purchase.batch.fisher}</p>
          </div>
        </div>

        <p className="text-white text-lg font-medium max-w-xs mx-auto leading-snug mb-4">
          Отсканируйте QR-код, чтобы узнать происхождение этой рыбы.
        </p>

        <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-2 inline-flex items-center gap-2 mb-8">
          <span className="text-green-400">✅</span>
          <span className="text-white text-sm">Проверено системой AULAU</span>
        </div>

        <div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors text-sm underline"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
