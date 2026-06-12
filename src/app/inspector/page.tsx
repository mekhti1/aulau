'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useCallback } from 'react';
import { INCIDENT_STATUS_LABELS, THREAT_LEVEL_LABELS } from '@/lib/constants';

const CaspianMap = dynamic(() => import('@/components/CaspianMap'), { ssr: false });

interface Hydrophone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusKm: number;
  status: string;
  incidents: Incident[];
}

interface Incident {
  id: string;
  incidentCode: string;
  label: string;
  confidence: number;
  threatLevel: string;
  status: string;
  timestamp: string;
  lat: number;
  lng: number;
  hydrophone?: { name: string };
}

interface Detection {
  label: string;
  labelRu: string;
  confidence: number;
  threatLevel: string;
}

export default function InspectorDashboard() {
  const [hydrophones, setHydrophones] = useState<Hydrophone[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [activeTab, setActiveTab] = useState<'incidents' | 'detect' | 'scan'>('incidents');
  const [detecting, setDetecting] = useState(false);
  const [detectionResult, setDetectionResult] = useState<Detection | null>(null);
  const [selectedHydrophone, setSelectedHydrophone] = useState<string>('');
  const [selectedAudio, setSelectedAudio] = useState('fast_boat.wav');

  const fetchData = useCallback(async () => {
    try {
      const [hRes, iRes] = await Promise.all([
        fetch('/api/hydrophones'),
        fetch('/api/incidents'),
      ]);
      const hData = await hRes.json();
      const iData = await iRes.json();
      setHydrophones(hData.hydrophones || []);
      setIncidents(iData.incidents || []);
      if (hData.hydrophones?.length > 0 && !selectedHydrophone) {
        setSelectedHydrophone(hData.hydrophones[0].id);
      }
    } catch (e) {
      console.error('Fetch error:', e);
    }
  }, [selectedHydrophone]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDetect = async () => {
    setDetecting(true);
    setDetectionResult(null);

    const formData = new FormData();
    formData.append('filename', selectedAudio);
    formData.append('hydrophoneId', selectedHydrophone);
    formData.append('createIncident', 'true');

    try {
      const res = await fetch('/api/detect', { method: 'POST', body: formData });
      const data = await res.json();
      setDetectionResult(data.detection);

      // Refresh incidents
      await fetchData();
    } catch (e) {
      console.error('Detection error:', e);
    }
    setDetecting(false);
  };

  const handleIncidentAction = async (id: string, status: string) => {
    await fetch(`/api/incidents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    fetchData();
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-56px)]">
      {/* Map */}
      <div className="flex-1 relative min-h-[300px] lg:min-h-0">
        <CaspianMap hydrophones={hydrophones} incidents={incidents} />
      </div>

      {/* Side Panel */}
      <div className="w-full lg:w-[420px] bg-white border-l border-gov-border overflow-y-auto flex flex-col">
        {/* Tabs */}
        <div className="flex border-b border-gov-border sticky top-0 bg-white z-10">
          <button
            onClick={() => setActiveTab('incidents')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'incidents'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gov-text-secondary hover:text-gray-900'
            }`}
          >
            Инциденты ({incidents.filter((i) => i.status === 'OPEN').length})
          </button>
          <button
            onClick={() => setActiveTab('detect')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'detect'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gov-text-secondary hover:text-gray-900'
            }`}
          >
            Обнаружение
          </button>
          <button
            onClick={() => setActiveTab('scan')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'scan'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gov-text-secondary hover:text-gray-900'
            }`}
          >
            QR Сканер
          </button>
        </div>

        <div className="p-4 flex-1">
          {activeTab === 'incidents' && (
            <IncidentPanel
              incidents={incidents}
              onAction={handleIncidentAction}
            />
          )}
          {activeTab === 'detect' && (
            <DetectionPanel
              hydrophones={hydrophones}
              selectedHydrophone={selectedHydrophone}
              setSelectedHydrophone={setSelectedHydrophone}
              selectedAudio={selectedAudio}
              setSelectedAudio={setSelectedAudio}
              detecting={detecting}
              detectionResult={detectionResult}
              onDetect={handleDetect}
            />
          )}
          {activeTab === 'scan' && <QRScanPanel />}
        </div>
      </div>
    </div>
  );
}

function IncidentPanel({
  incidents,
  onAction,
}: {
  incidents: Incident[];
  onAction: (id: string, status: string) => void;
}) {
  if (incidents.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gov-text-secondary">Нет инцидентов</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {incidents.map((incident) => (
        <div key={incident.id} className="border border-gov-border rounded-lg p-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${
                  incident.status === 'OPEN' ? 'bg-gov-danger' :
                  incident.status === 'CONFIRMED' ? 'bg-gov-warning' : 'bg-gov-success'
                }`} />
                <span className="text-sm font-semibold text-gray-900">{incident.incidentCode}</span>
              </div>
              <p className="text-sm text-gray-900 mt-1">{incident.label}</p>
              <p className="text-xs text-gov-text-secondary">
                Уверенность: {Math.round(incident.confidence)}%
              </p>
              <p className="text-xs text-gov-text-secondary">
                Угроза: {THREAT_LEVEL_LABELS[incident.threatLevel] || incident.threatLevel}
              </p>
              {incident.hydrophone && (
                <p className="text-xs text-gov-text-secondary">
                  📡 {incident.hydrophone.name}
                </p>
              )}
              <p className="text-xs text-gov-text-secondary">
                {new Date(incident.timestamp).toLocaleString('ru-RU')}
              </p>
            </div>
            <span className={`badge ${
              incident.status === 'OPEN' ? 'badge-danger' :
              incident.status === 'CONFIRMED' ? 'badge-warning' : 'badge-success'
            }`}>
              {INCIDENT_STATUS_LABELS[incident.status]}
            </span>
          </div>

          {incident.status === 'OPEN' && (
            <div className="flex gap-2 mt-3 pt-3 border-t border-gov-border">
              <button
                onClick={() => onAction(incident.id, 'CONFIRMED')}
                className="btn-primary text-xs flex-1 !py-1.5"
              >
                Подтвердить
              </button>
              <button
                onClick={() => onAction(incident.id, 'CLOSED')}
                className="btn-secondary text-xs flex-1 !py-1.5"
              >
                Закрыть
              </button>
            </div>
          )}
          {incident.status === 'CONFIRMED' && (
            <div className="mt-3 pt-3 border-t border-gov-border">
              <button
                onClick={() => onAction(incident.id, 'CLOSED')}
                className="btn-success text-xs w-full !py-1.5"
              >
                Завершить проверку
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function DetectionPanel({
  hydrophones,
  selectedHydrophone,
  setSelectedHydrophone,
  selectedAudio,
  setSelectedAudio,
  detecting,
  detectionResult,
  onDetect,
}: {
  hydrophones: Hydrophone[];
  selectedHydrophone: string;
  setSelectedHydrophone: (v: string) => void;
  selectedAudio: string;
  setSelectedAudio: (v: string) => void;
  detecting: boolean;
  detectionResult: Detection | null;
  onDetect: () => void;
}) {
  const DEMO_AUDIO = [
    { file: 'fast_boat.wav', label: 'Скоростной катер (демо)' },
    { file: 'normal_boat.wav', label: 'Обычное судно (демо)' },
    { file: 'ambient_water.wav', label: 'Фоновый шум воды (демо)' },
  ];

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900">AI Обнаружение судов</h3>

      <div>
        <label className="label-text">Гидрофон</label>
        <select
          value={selectedHydrophone}
          onChange={(e) => setSelectedHydrophone(e.target.value)}
          className="input-field"
        >
          {hydrophones.map((h) => (
            <option key={h.id} value={h.id}>{h.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label-text">Аудио запись</label>
        <select
          value={selectedAudio}
          onChange={(e) => setSelectedAudio(e.target.value)}
          className="input-field"
        >
          {DEMO_AUDIO.map((a) => (
            <option key={a.file} value={a.file}>{a.label}</option>
          ))}
        </select>
      </div>

      <button
        onClick={onDetect}
        disabled={detecting}
        className="btn-primary w-full"
      >
        {detecting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            Анализ...
          </span>
        ) : (
          '🎯 Запустить обнаружение'
        )}
      </button>

      {detectionResult && (
        <div className={`rounded-lg p-4 border ${
          detectionResult.threatLevel === 'HIGH' ? 'bg-red-50 border-red-200' :
          detectionResult.threatLevel === 'MEDIUM' ? 'bg-yellow-50 border-yellow-200' :
          'bg-green-50 border-green-200'
        }`}>
          <h4 className="font-semibold text-gray-900 mb-2">Результат анализа</h4>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="text-gov-text-secondary">Обнаружено:</span>{' '}
              <span className="font-medium">{detectionResult.labelRu}</span>
            </p>
            <p className="text-sm">
              <span className="text-gov-text-secondary">Уверенность:</span>{' '}
              <span className="font-medium">{Math.round(detectionResult.confidence)}%</span>
            </p>
            <p className="text-sm">
              <span className="text-gov-text-secondary">Уровень угрозы:</span>{' '}
              <span className={`font-semibold ${
                detectionResult.threatLevel === 'HIGH' ? 'text-gov-danger' :
                detectionResult.threatLevel === 'MEDIUM' ? 'text-yellow-700' :
                'text-gov-success'
              }`}>
                {THREAT_LEVEL_LABELS[detectionResult.threatLevel]}
              </span>
            </p>
          </div>
          {detectionResult.threatLevel !== 'LOW' && (
            <p className="text-xs text-gov-text-secondary mt-2">
              ⚠️ Инцидент автоматически создан
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function QRScanPanel() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{ valid: boolean; data?: Record<string, unknown>; type?: string; error?: string } | null>(null);
  const [manualCode, setManualCode] = useState('');

  const startScan = async () => {
    setScanning(true);
    setResult(null);

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('qr-reader');

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 250 },
        async (text) => {
          await scanner.stop();
          setScanning(false);
          verifyQR(text);
        },
        () => { /* ignore scanning failures */ }
      );
    } catch (err) {
      console.error('Camera error:', err);
      setScanning(false);
    }
  };

  const verifyQR = async (payload: string) => {
    try {
      const res = await fetch(`/api/qr/verify?payload=${encodeURIComponent(payload)}`);
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ valid: false, error: 'Ошибка проверки' });
    }
  };

  const handleManualVerify = () => {
    if (manualCode.trim()) {
      verifyQR(manualCode.trim());
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900">QR Сканер</h3>

      <div id="qr-reader" className={`${scanning ? '' : 'hidden'} rounded-lg overflow-hidden`} />

      {!scanning && (
        <button onClick={startScan} className="btn-primary w-full">
          📷 Открыть камеру
        </button>
      )}

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gov-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-xs text-gov-text-secondary">или введите код</span>
        </div>
      </div>

      <div className="flex gap-2">
        <input
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value)}
          className="input-field flex-1"
          placeholder="NET:NET-XXXX:HASH"
        />
        <button onClick={handleManualVerify} className="btn-secondary">
          Проверить
        </button>
      </div>

      {result && (
        <div className={`rounded-lg p-4 border ${
          result.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        }`}>
          {result.valid ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-gov-success text-lg">✓</span>
                <h4 className="font-semibold text-gov-success">QR-код действителен</h4>
              </div>
              <p className="text-sm text-gov-text-secondary">
                Тип: {result.type === 'NET' ? 'Сеть' : 'Партия'}
              </p>
              {result.data && (
                <pre className="text-xs mt-2 bg-white rounded p-2 overflow-auto max-h-40">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-gov-danger text-lg">✗</span>
              <h4 className="font-semibold text-gov-danger">Недействительный QR-код</h4>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
