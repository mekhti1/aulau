'use client';

import { useState, useEffect } from 'react';
import { FISH_SPECIES, FISHING_ZONES } from '@/lib/constants';

export default function FisherCatch() {
  const [species, setSpecies] = useState(FISH_SPECIES[0]);
  const [weightKg, setWeightKg] = useState('');
  const [lat, setLat] = useState(44.5);
  const [lng, setLng] = useState(50.5);
  const [submitting, setSubmitting] = useState(false);
  const [showEDS, setShowEDS] = useState(false);
  const [edsSigned, setEdsSigned] = useState(false);
  const [success, setSuccess] = useState<{ batchCode: string; qrPayload: string } | null>(null);
  const [error, setError] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [nets, setNets] = useState<Array<{ id: string; netCode: string; zone: string }>>([]);
  const [selectedNet, setSelectedNet] = useState('');

  useEffect(() => {
    // Try to get current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(Math.round(pos.coords.latitude * 10000) / 10000);
          setLng(Math.round(pos.coords.longitude * 10000) / 10000);
        },
        () => { /* Use default coordinates */ }
      );
    }
    
    // Fetch nets
    fetch('/api/nets')
      .then((r) => r.json())
      .then((data) => setNets(data.nets || []))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!edsSigned) {
      setShowEDS(true);
      return;
    }

    setSubmitting(true);

    try {
      const certNumber = `KZ-EDS-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
      
      const res = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          species,
          weightKg: parseFloat(weightKg),
          lat,
          lng,
          netId: selectedNet || undefined,
          certNumber,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Ошибка регистрации');
        setSubmitting(false);
        return;
      }

      // Generate QR
      const QRCode = await import('qrcode');
      const url = await QRCode.toDataURL(data.qrPayload, {
        width: 250,
        margin: 2,
        color: { dark: '#1E5A96', light: '#FFFFFF' },
      });
      setQrUrl(url);

      setSuccess({ batchCode: data.batch.batchCode, qrPayload: data.qrPayload });
    } catch {
      setError('Ошибка соединения');
    }
    setSubmitting(false);
  };

  const handleEDSSign = () => {
    setEdsSigned(true);
    setShowEDS(false);
  };

  if (success) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Улов зарегистрирован</h1>
        <div className="card text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gov-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Партия создана</h2>
          <p className="text-sm text-gov-text-secondary mb-4">{success.batchCode}</p>
          
          {qrUrl && <img src={qrUrl} alt="QR Code" className="mx-auto mb-3" />}
          
          <p className="text-xs text-gov-text-secondary mb-1">Документ подписан ЭЦП ✓</p>
          <p className="text-xs text-gov-text-secondary break-all">{success.qrPayload}</p>
          
          <button
            onClick={() => {
              setSuccess(null);
              setEdsSigned(false);
              setWeightKg('');
              setQrUrl('');
            }}
            className="btn-primary mt-4"
          >
            Зарегистрировать ещё
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Регистрация улова</h1>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="label-text">Вид рыбы</label>
          <select value={species} onChange={(e) => setSpecies(e.target.value)} className="input-field">
            {FISH_SPECIES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label-text">Вес (кг)</label>
          <input
            type="number"
            step="0.1"
            min="0.1"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
            className="input-field"
            placeholder="Введите вес в килограммах"
            required
          />
        </div>

        {nets.length > 0 && (
          <div>
            <label className="label-text">Сеть (необязательно)</label>
            <select value={selectedNet} onChange={(e) => setSelectedNet(e.target.value)} className="input-field">
              <option value="">Без привязки к сети</option>
              {nets.map((net) => (
                <option key={net.id} value={net.id}>{net.netCode} — {net.zone}</option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-text">Широта</label>
            <input
              type="number"
              step="0.0001"
              value={lat}
              onChange={(e) => setLat(parseFloat(e.target.value))}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="label-text">Долгота</label>
            <input
              type="number"
              step="0.0001"
              value={lng}
              onChange={(e) => setLng(parseFloat(e.target.value))}
              className="input-field"
              required
            />
          </div>
        </div>

        <p className="text-xs text-gov-text-secondary">
          📍 Координаты определены автоматически
        </p>

        {edsSigned && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
            <span className="text-gov-success">✓</span>
            <span className="text-sm text-gov-success font-medium">Документ подписан ЭЦП</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-gov-danger text-sm px-3 py-2 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Отправка...' : edsSigned ? 'Зарегистрировать улов' : 'Подписать ЭЦП и зарегистрировать'}
        </button>
      </form>

      {/* EDS Modal */}
      {showEDS && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                Подписать ЭЦП
              </h2>
              <p className="text-sm text-gov-text-secondary mb-4">
                Электронная цифровая подпись
              </p>

              <div className="bg-gov-bg rounded-lg p-3 text-left text-sm mb-4">
                <p className="text-gov-text-secondary">Владелец сертификата:</p>
                <p className="font-medium text-gray-900">Рыбак — ИП</p>
                <p className="text-gov-text-secondary mt-2">Номер сертификата:</p>
                <p className="font-mono text-xs text-gray-900">
                  KZ-EDS-{Math.random().toString(36).slice(2, 10).toUpperCase()}
                </p>
              </div>

              <div className="flex gap-2">
                <button onClick={handleEDSSign} className="btn-primary flex-1">
                  Подписать
                </button>
                <button onClick={() => setShowEDS(false)} className="btn-secondary flex-1">
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
