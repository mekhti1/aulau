'use client';

import { useState, useEffect } from 'react';
import { BATCH_STATUS_LABELS } from '@/lib/constants';

interface Batch {
  id: string;
  batchCode: string;
  species: string;
  weightKg: number;
  status: string;
  caughtAt: string;
  listed: boolean;
  sold: boolean;
  signature: string | null;
  signedBy: string | null;
  certNumber: string | null;
}

export default function FisherBatches() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showQR, setShowQR] = useState<string | null>(null);

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    const res = await fetch('/api/batches');
    const data = await res.json();
    setBatches(data.batches || []);
    setLoading(false);
  };

  const handleList = async (id: string) => {
    setActionLoading(id);
    const res = await fetch(`/api/batches/${id}/list`, { method: 'PATCH' });
    if (res.ok) {
      fetchBatches();
    }
    setActionLoading(null);
  };

  if (loading) {
    return <div className="text-center py-8 text-gov-text-secondary">Загрузка...</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Мои партии ({batches.length})</h1>

      {batches.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-gov-text-secondary">Нет партий</p>
        </div>
      ) : (
        <div className="space-y-3">
          {batches.map((batch) => (
            <div key={batch.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900">{batch.batchCode}</p>
                    <span className={`badge ${
                      batch.status === 'VERIFIED' ? 'badge-success' :
                      batch.status === 'FLAGGED' ? 'badge-danger' : 'badge-warning'
                    }`}>
                      {BATCH_STATUS_LABELS[batch.status]}
                    </span>
                    {batch.listed && <span className="badge badge-info">На маркетплейсе</span>}
                    {batch.sold && <span className="badge badge-success">Продано</span>}
                  </div>
                  <p className="text-sm text-gov-text-secondary mt-1">
                    {batch.species} · {batch.weightKg} кг
                  </p>
                  <p className="text-xs text-gov-text-secondary mt-0.5">
                    {new Date(batch.caughtAt).toLocaleString('ru-RU')}
                  </p>
                  {batch.signedBy && (
                    <p className="text-xs text-gov-success mt-0.5">✓ ЭЦП: {batch.certNumber}</p>
                  )}
                </div>
                <button
                  onClick={() => setShowQR(showQR === batch.id ? null : batch.id)}
                  className={`text-xs !px-3 !py-1.5 ${
                    showQR === batch.id ? 'btn-primary' : 'btn-secondary'
                  }`}
                >
                  {showQR === batch.id ? '✕ Закрыть' : '📱 QR код'}
                </button>
              </div>

              {/* Status message */}
              {batch.status === 'PENDING' && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-yellow-600">
                  <span className="animate-pulse w-1.5 h-1.5 bg-yellow-500 rounded-full" />
                  Ожидает проверки инспектором
                </div>
              )}

              {/* Actions */}
              {batch.status === 'VERIFIED' && !batch.listed && (
                <div className="mt-3 pt-3 border-t border-gov-border">
                  <button
                    onClick={() => handleList(batch.id)}
                    disabled={actionLoading === batch.id}
                    className="btn-primary w-full text-sm"
                  >
                    {actionLoading === batch.id ? 'Размещение...' : '🛒 Разместить на маркетплейсе'}
                  </button>
                </div>
              )}

              {/* QR Code Display */}
              {showQR === batch.id && batch.signature && (
                <div className="mt-3 pt-3 border-t border-gov-border">
                  <div className="bg-white border border-gov-border rounded-xl p-4 text-center">
                    <QRDisplay value={batch.signature} />
                    <div className="mt-3 space-y-1">
                      <p className="text-sm font-semibold text-gray-900">{batch.batchCode}</p>
                      <p className="text-xs text-gov-text-secondary">{batch.species} · {batch.weightKg} кг</p>
                      <p className="text-xs text-gov-text-secondary">
                        {new Date(batch.caughtAt).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gov-border">
                      <p className="text-[10px] text-gov-text-secondary break-all font-mono">
                        {batch.signature}
                      </p>
                    </div>
                    <a
                      href={`/trace/batch/${batch.batchCode}`}
                      className="btn-secondary text-xs mt-3 inline-block"
                    >
                      📋 Цифровой паспорт
                    </a>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QRDisplay({ value }: { value: string }) {
  const [qrUrl, setQrUrl] = useState<string>('');

  useEffect(() => {
    import('qrcode').then((QRCode) => {
      QRCode.toDataURL(value, {
        width: 200,
        margin: 2,
        color: { dark: '#1E5A96', light: '#FFFFFF' },
      }).then(setQrUrl);
    });
  }, [value]);

  if (!qrUrl) return <div className="py-4 text-gov-text-secondary text-sm">Генерация QR...</div>;

  return <img src={qrUrl} alt="QR Code" className="mx-auto" />;
}
