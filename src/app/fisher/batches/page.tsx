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
      <h1 className="text-xl font-bold text-gray-900">Мои партии</h1>

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
                  className="btn-secondary text-xs !px-3 !py-1.5"
                >
                  QR
                </button>
              </div>

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

              {showQR === batch.id && batch.signature && (
                <div className="mt-3 pt-3 border-t border-gov-border text-center">
                  <QRDisplay value={batch.signature} />
                  <p className="text-xs text-gov-text-secondary mt-2 break-all">
                    {batch.signature}
                  </p>
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
