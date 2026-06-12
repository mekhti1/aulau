'use client';

import { useState, useEffect } from 'react';
import { FISHING_ZONES } from '@/lib/constants';

interface Net {
  id: string;
  netCode: string;
  zone: string;
  expiresAt: string;
  signature: string | null;
  createdAt: string;
}

export default function FisherNets() {
  const [nets, setNets] = useState<Net[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [zone, setZone] = useState(FISHING_ZONES[0]);
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showQR, setShowQR] = useState<string | null>(null);

  useEffect(() => {
    fetchNets();
  }, []);

  const fetchNets = async () => {
    const res = await fetch('/api/nets');
    const data = await res.json();
    setNets(data.nets || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const res = await fetch('/api/nets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zone, expiresAt }),
    });

    if (res.ok) {
      setShowForm(false);
      setZone(FISHING_ZONES[0]);
      setExpiresAt('');
      fetchNets();
    }
    setSubmitting(false);
  };

  const isExpired = (date: string) => new Date(date) < new Date();

  if (loading) {
    return <div className="text-center py-8 text-gov-text-secondary">Загрузка...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Мои сети</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">
          + Добавить сеть
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-3">
          <h2 className="font-semibold text-gray-900">Регистрация сети</h2>
          <div>
            <label className="label-text">Зона лова</label>
            <select value={zone} onChange={(e) => setZone(e.target.value)} className="input-field">
              {FISHING_ZONES.map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-text">Срок действия</label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="input-field"
              required
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Сохранение...' : 'Зарегистрировать'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
              Отмена
            </button>
          </div>
        </form>
      )}

      {nets.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-gov-text-secondary">Нет зарегистрированных сетей</p>
        </div>
      ) : (
        <div className="space-y-3">
          {nets.map((net) => (
            <div key={net.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">{net.netCode}</p>
                    <span className={`badge ${isExpired(net.expiresAt) ? 'badge-danger' : 'badge-success'}`}>
                      {isExpired(net.expiresAt) ? 'Истекла' : 'Активна'}
                    </span>
                  </div>
                  <p className="text-sm text-gov-text-secondary mt-1">{net.zone}</p>
                  <p className="text-xs text-gov-text-secondary mt-0.5">
                    Действительна до: {new Date(net.expiresAt).toLocaleDateString('ru-RU')}
                  </p>
                </div>
                <button
                  onClick={() => setShowQR(showQR === net.id ? null : net.id)}
                  className="btn-secondary text-xs !px-3 !py-1.5"
                >
                  QR
                </button>
              </div>

              {showQR === net.id && net.signature && (
                <div className="mt-3 pt-3 border-t border-gov-border text-center">
                  <QRDisplay value={net.signature} />
                  <p className="text-xs text-gov-text-secondary mt-2 break-all">
                    {net.signature}
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
