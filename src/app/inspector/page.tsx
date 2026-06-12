'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useCallback, useRef } from 'react';
import { INCIDENT_STATUS_LABELS, THREAT_LEVEL_LABELS, BATCH_STATUS_LABELS } from '@/lib/constants';

const CaspianMap = dynamic(() => import('@/components/CaspianMap'), { ssr: false });


// Haversine formula for distance
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

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

interface Batch {
  id: string;
  batchCode: string;
  species: string;
  weightKg: number;
  status: string;
  caughtAt: string;
  listed: boolean;
  sold: boolean;
  owner?: { name: string; username: string; trustScore: number };
}

interface ResponseTeam {
  id: string;
  name: string;
  lat: number;
  lng: number;
  available: boolean;
}

interface Operation {
  id: string;
  operationCode: string;
  incidentId: string;
  teamId: string;
  assignedUnit: string;
  estimatedArrival: number;
  distanceKm: number;
  status: string;
  createdAt: string;
  incident: Incident;
}

const OPERATION_STATUSES = [
  'CREATED',
  'EN_ROUTE',
  'ON_SITE',
  'CONFIRMED',
  'CLOSED'
];

const OPERATION_STATUS_LABELS: Record<string, string> = {
  CREATED: 'Создана',
  EN_ROUTE: 'В пути',
  ON_SITE: 'На месте',
  CONFIRMED: 'Подтверждено',
  CLOSED: 'Закрыта'
};

export default function InspectorDashboard() {
  const [hydrophones, setHydrophones] = useState<Hydrophone[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [teams, setTeams] = useState<ResponseTeam[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [activeTab, setActiveTab] = useState<'operations' | 'batches' | 'incidents' | 'detect' | 'scan'>('operations');
  const [detecting, setDetecting] = useState(false);
  const [detectionResult, setDetectionResult] = useState<Detection | null>(null);
  const [selectedHydrophone, setSelectedHydrophone] = useState<string>('');
  const [selectedAudio, setSelectedAudio] = useState('fast_boat.wav');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [hRes, iRes, bRes, tRes, oRes] = await Promise.all([
        fetch('/api/hydrophones'),
        fetch('/api/incidents'),
        fetch('/api/batches'),
        fetch('/api/teams'),
        fetch('/api/operations')
      ]);
      const hData = await hRes.json();
      const iData = await iRes.json();
      const bData = await bRes.json();
      const tData = await tRes.json();
      const oData = await oRes.json();
      setHydrophones(hData.hydrophones || []);
      setIncidents(iData.incidents || []);
      setBatches(bData.batches || []);
      setTeams(tData.teams || []);
      setOperations(oData.operations || []);
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
    if (uploadedFile) {
      formData.append('filename', uploadedFile.name);
      formData.append('file', uploadedFile);
    } else {
      formData.append('filename', selectedAudio);
    }
    formData.append('hydrophoneId', selectedHydrophone);
    formData.append('createIncident', 'true');

    try {
      const res = await fetch('/api/detect', { method: 'POST', body: formData });
      const data = await res.json();
      setDetectionResult(data.detection);
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

  const handleVerifyBatch = async (id: string) => {
    await fetch(`/api/batches/${id}/verify`, { method: 'PATCH' });
    fetchData();
  };

  const pendingBatches = batches.filter((b) => b.status === 'PENDING');
  const activeOpsCount = operations.filter(o => o.status !== 'CLOSED').length;

  // Determine Alert Mode
  const activeAlerts = incidents.filter(i => 
    i.status === 'OPEN' && (i.threatLevel === 'HIGH' || i.confidence >= 85)
  ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const activeAlert = activeAlerts.length > 0 ? activeAlerts[0] : null;

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-56px)]">
      {/* Map */}
      <div className="flex-1 relative min-h-[300px] lg:min-h-0 flex flex-col">
        {activeAlert && (
          <AlertBanner 
            incident={activeAlert} 
            teams={teams} 
            onOperationCreated={() => {
              setActiveTab('operations');
              fetchData();
            }} 
          />
        )}
        <div className="flex-1">
          <CaspianMap 
            hydrophones={hydrophones} 
            incidents={incidents} 
            activeAlert={activeAlert} 
            teams={teams}
            operations={operations}
          />
        </div>
      </div>

      {/* Side Panel */}
      <div className="w-full lg:w-[460px] bg-white border-l border-gov-border overflow-y-auto flex flex-col">
        {/* Tabs */}
        <div className="flex border-b border-gov-border sticky top-0 bg-white z-10 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveTab('operations')}
            className={`flex-1 py-3 px-3 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'operations'
                ? 'text-gov-danger border-b-2 border-gov-danger'
                : 'text-gov-text-secondary hover:text-gray-900'
            }`}
          >
            🚨 Операции ({activeOpsCount})
          </button>
          <button
            onClick={() => setActiveTab('batches')}
            className={`flex-1 py-3 px-3 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'batches'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gov-text-secondary hover:text-gray-900'
            }`}
          >
            Партии ({pendingBatches.length})
          </button>
          <button
            onClick={() => setActiveTab('incidents')}
            className={`flex-1 py-3 px-3 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'incidents'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gov-text-secondary hover:text-gray-900'
            }`}
          >
            Инциденты ({incidents.filter((i) => i.status === 'OPEN').length})
          </button>
          <button
            onClick={() => setActiveTab('detect')}
            className={`flex-1 py-3 px-3 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'detect'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gov-text-secondary hover:text-gray-900'
            }`}
          >
            AI
          </button>
          <button
            onClick={() => setActiveTab('scan')}
            className={`flex-1 py-3 px-3 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'scan'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gov-text-secondary hover:text-gray-900'
            }`}
          >
            QR
          </button>
        </div>

        <div className="p-4 flex-1">
          {activeTab === 'operations' && (
            <OperationsPanel
              operations={operations}
              onStatusChange={fetchData}
            />
          )}
          {activeTab === 'batches' && (
            <BatchesPanel
              batches={batches}
              onVerify={handleVerifyBatch}
            />
          )}
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
              uploadedFile={uploadedFile}
              setUploadedFile={setUploadedFile}
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

/* ====== Batches Panel ====== */
function BatchesPanel({
  batches,
  onVerify,
}: {
  batches: Batch[];
  onVerify: (id: string) => void;
}) {
  const [verifying, setVerifying] = useState<string | null>(null);
  const [verified, setVerified] = useState<Set<string>>(new Set());

  const handleVerify = async (id: string) => {
    setVerifying(id);
    await onVerify(id);
    setVerified((prev) => new Set(prev).add(id));
    setVerifying(null);
  };

  const pending = batches.filter((b) => b.status === 'PENDING');
  const verifiedBatches = batches.filter((b) => b.status === 'VERIFIED');

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900">Проверка партий</h3>

      {pending.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-gov-text-secondary uppercase tracking-wider font-medium">
            Ожидают проверки ({pending.length})
          </p>
          {pending.map((batch) => (
            <div key={batch.id} className="border border-yellow-200 bg-yellow-50 rounded-lg p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{batch.batchCode}</p>
                  <p className="text-xs text-gov-text-secondary mt-0.5">
                    {batch.species} · {batch.weightKg} кг
                  </p>
                  {batch.owner && (
                    <p className="text-xs text-gov-text-secondary">
                      Рыбак: {batch.owner.name}
                    </p>
                  )}
                  <p className="text-xs text-gov-text-secondary">
                    {new Date(batch.caughtAt).toLocaleString('ru-RU')}
                  </p>
                </div>
                <span className="badge badge-warning">{BATCH_STATUS_LABELS[batch.status]}</span>
              </div>
              {verified.has(batch.id) ? (
                <div className="mt-3 pt-3 border-t border-yellow-200 text-center">
                  <span className="text-sm text-gov-success font-medium">✓ Одобрено и выставлено на маркетплейс</span>
                </div>
              ) : (
                <div className="flex gap-2 mt-3 pt-3 border-t border-yellow-200">
                  <button
                    onClick={() => handleVerify(batch.id)}
                    disabled={verifying === batch.id}
                    className="btn-primary text-xs flex-1 !py-1.5"
                  >
                    {verifying === batch.id ? 'Проверка...' : '✓ Одобрить'}
                  </button>
                  <button className="btn-secondary text-xs flex-1 !py-1.5">
                    ✗ Отклонить
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {pending.length === 0 && (
        <div className="text-center py-6 bg-green-50 rounded-lg border border-green-200">
          <span className="text-2xl block mb-1">✅</span>
          <p className="text-sm text-gov-success font-medium">Нет партий на рассмотрении</p>
        </div>
      )}

      {verifiedBatches.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-gov-text-secondary uppercase tracking-wider font-medium mt-4">
            Проверенные ({verifiedBatches.length})
          </p>
          {verifiedBatches.slice(0, 5).map((batch) => (
            <div key={batch.id} className="border border-green-200 bg-green-50 rounded-lg p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{batch.batchCode}</p>
                  <p className="text-xs text-gov-text-secondary">
                    {batch.species} · {batch.weightKg} кг
                  </p>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <span className="badge badge-success">Проверено</span>
                  {batch.listed && <span className="badge badge-info text-xs">На маркетплейсе</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ====== Incident Panel ====== */
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

/* ====== Detection Panel with Audio Upload ====== */
function DetectionPanel({
  hydrophones,
  selectedHydrophone,
  setSelectedHydrophone,
  selectedAudio,
  setSelectedAudio,
  uploadedFile,
  setUploadedFile,
  detecting,
  detectionResult,
  onDetect,
}: {
  hydrophones: Hydrophone[];
  selectedHydrophone: string;
  setSelectedHydrophone: (v: string) => void;
  selectedAudio: string;
  setSelectedAudio: (v: string) => void;
  uploadedFile: File | null;
  setUploadedFile: (f: File | null) => void;
  detecting: boolean;
  detectionResult: Detection | null;
  onDetect: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const DEMO_AUDIO = [
    { file: 'fast_boat.wav', label: 'Скоростной катер (демо)' },
    { file: 'normal_boat.wav', label: 'Обычное судно (демо)' },
    { file: 'ambient_water.wav', label: 'Фоновый шум воды (демо)' },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

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
        <label className="label-text">Демо аудиозапись</label>
        <select
          value={selectedAudio}
          onChange={(e) => { setSelectedAudio(e.target.value); setUploadedFile(null); }}
          className="input-field"
        >
          {DEMO_AUDIO.map((a) => (
            <option key={a.file} value={a.file}>{a.label}</option>
          ))}
        </select>
      </div>

      {/* Audio Upload */}
      <div>
        <label className="label-text">Или загрузите своё аудио</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.wav,.mp3,.ogg,.m4a"
          className="hidden"
          onChange={handleFileUpload}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className={`w-full border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
            uploadedFile
              ? 'border-green-300 bg-green-50'
              : 'border-gov-border hover:border-primary hover:bg-blue-50'
          }`}
        >
          {uploadedFile ? (
            <div>
              <span className="text-gov-success text-lg block mb-1">🎵</span>
              <p className="text-sm font-medium text-gray-900">{uploadedFile.name}</p>
              <p className="text-xs text-gov-text-secondary mt-0.5">
                {(uploadedFile.size / 1024).toFixed(1)} KB
              </p>
              <p className="text-xs text-primary mt-1 underline">Заменить файл</p>
            </div>
          ) : (
            <div>
              <span className="text-gray-400 text-lg block mb-1">📁</span>
              <p className="text-sm text-gov-text-secondary">
                Нажмите для загрузки .wav / .mp3
              </p>
            </div>
          )}
        </button>
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
          <h4 className="font-semibold text-gray-900 mb-3">Результат анализа</h4>

          {/* Confidence bar */}
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gov-text-secondary">Уверенность</span>
              <span className="font-medium">{Math.round(detectionResult.confidence)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  detectionResult.threatLevel === 'HIGH' ? 'bg-gov-danger' :
                  detectionResult.threatLevel === 'MEDIUM' ? 'bg-yellow-500' :
                  'bg-gov-success'
                }`}
                style={{ width: `${detectionResult.confidence}%` }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gov-text-secondary">Обнаружено</span>
              <span className="text-sm font-medium">{detectionResult.labelRu}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gov-text-secondary">Угроза</span>
              <span className={`text-sm font-semibold ${
                detectionResult.threatLevel === 'HIGH' ? 'text-gov-danger' :
                detectionResult.threatLevel === 'MEDIUM' ? 'text-yellow-700' :
                'text-gov-success'
              }`}>
                {THREAT_LEVEL_LABELS[detectionResult.threatLevel]}
              </span>
            </div>
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

/* ====== QR Scan Panel with Beautiful Results ====== */
function QRScanPanel() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{
    valid: boolean;
    data?: Record<string, unknown>;
    type?: string;
    error?: string;
  } | null>(null);
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderData = (data: any, type?: string) => {
    if (!data) return null;

    if (type === 'NET') {
      return (
        <div className="space-y-2 mt-3">
          <div className="flex justify-between py-1.5 border-b border-green-200">
            <span className="text-xs text-gov-text-secondary">Код сети</span>
            <span className="text-xs font-mono font-medium">{data.netCode}</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-green-200">
            <span className="text-xs text-gov-text-secondary">Зона</span>
            <span className="text-xs font-medium">{data.zone}</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-green-200">
            <span className="text-xs text-gov-text-secondary">Срок</span>
            <span className="text-xs font-medium">
              {data.expiresAt ? new Date(data.expiresAt).toLocaleDateString('ru-RU') : '—'}
            </span>
          </div>
          {data.owner && (
            <div className="flex justify-between py-1.5">
              <span className="text-xs text-gov-text-secondary">Владелец</span>
              <span className="text-xs font-medium">{data.owner.name}</span>
            </div>
          )}
        </div>
      );
    }

    if (type === 'BATCH') {
      return (
        <div className="space-y-2 mt-3">
          <div className="flex justify-between py-1.5 border-b border-green-200">
            <span className="text-xs text-gov-text-secondary">Код партии</span>
            <span className="text-xs font-mono font-medium">{data.batchCode}</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-green-200">
            <span className="text-xs text-gov-text-secondary">Вид рыбы</span>
            <span className="text-xs font-medium">{data.species}</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-green-200">
            <span className="text-xs text-gov-text-secondary">Вес</span>
            <span className="text-xs font-medium">{data.weightKg} кг</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-green-200">
            <span className="text-xs text-gov-text-secondary">Статус</span>
            <span className={`badge text-xs ${
              data.status === 'VERIFIED' ? 'badge-success' :
              data.status === 'FLAGGED' ? 'badge-danger' : 'badge-warning'
            }`}>
              {data.status === 'VERIFIED' ? 'Проверено' : data.status === 'FLAGGED' ? 'Подозрительно' : 'На рассмотрении'}
            </span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-green-200">
            <span className="text-xs text-gov-text-secondary">Дата вылова</span>
            <span className="text-xs font-medium">
              {data.caughtAt ? new Date(data.caughtAt).toLocaleDateString('ru-RU') : '—'}
            </span>
          </div>
          {data.owner && (
            <div className="flex justify-between py-1.5 border-b border-green-200">
              <span className="text-xs text-gov-text-secondary">Рыбак</span>
              <span className="text-xs font-medium">{data.owner.name}</span>
            </div>
          )}
          {data.certNumber && (
            <div className="flex justify-between py-1.5">
              <span className="text-xs text-gov-text-secondary">ЭЦП</span>
              <span className="text-xs font-mono text-primary">{data.certNumber}</span>
            </div>
          )}
          {data.sold && (
            <div className="bg-blue-50 rounded p-2 mt-1">
              <span className="text-xs text-primary font-medium">💰 Партия продана</span>
            </div>
          )}
        </div>
      );
    }

    return null;
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
              <div className="inline-block px-2 py-0.5 bg-white rounded text-xs font-medium text-primary border border-primary/20">
                {result.type === 'NET' ? '🎣 Сеть' : '📦 Партия'}
              </div>
              {renderData(result.data, result.type)}
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

/* ====== Alert Banner ====== */
function AlertBanner({ 
  incident, 
  teams,
  onOperationCreated
}: { 
  incident: Incident; 
  teams: ResponseTeam[];
  onOperationCreated: () => void;
}) {
  const [creating, setCreating] = useState(false);

  // Find nearest team
  let nearestTeam: ResponseTeam | null = null;
  let minDistance = Infinity;

  teams.forEach(t => {
    if (t.available) {
      const d = getDistance(incident.lat, incident.lng, t.lat, t.lng);
      if (d < minDistance) {
        minDistance = d;
        nearestTeam = t;
      }
    }
  });

  // Assume average speed of response boat is 60 km/h (1 km / min)
  const etaMinutes = Math.round(minDistance * 1.0); 

  const handleCreateOperation = async () => {
    if (!nearestTeam) return;
    setCreating(true);
    await fetch('/api/operations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        incidentId: incident.id,
        teamId: nearestTeam.id,
        assignedUnit: nearestTeam.name,
        estimatedArrival: etaMinutes,
        distanceKm: minDistance
      })
    });
    setCreating(false);
    onOperationCreated();
  };

  return (
    <div className="bg-red-600 text-white p-3 md:p-4 shadow-lg border-b-4 border-red-800 animate-in fade-in slide-in-from-top-2 duration-500 z-20">
      <div className="flex flex-col md:flex-row items-start gap-3 md:gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex-shrink-0 bg-white/20 p-2 md:p-3 rounded-xl animate-pulse">
            <span className="text-2xl md:text-3xl block">🚨</span>
          </div>
          <h2 className="text-base md:text-lg font-bold uppercase tracking-wide md:hidden flex-1">
            РЕЖИМ ТРЕВОГИ
          </h2>
        </div>
        
        <div className="flex-1 w-full">
          <h2 className="hidden md:flex text-lg font-bold uppercase tracking-wide mb-2 items-center gap-2">
            ВНИМАНИЕ! РЕЖИМ ТРЕВОГИ
            <span className="bg-white/20 px-2 py-0.5 rounded text-xs">Автоматическое обнаружение</span>
          </h2>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 mb-3">
            <div className="bg-black/10 p-2 rounded-lg">
              <p className="text-red-200 text-[10px] md:text-xs uppercase font-medium">Инцидент</p>
              <p className="font-mono font-semibold text-sm md:text-base">{incident.incidentCode}</p>
            </div>
            <div className="bg-black/10 p-2 rounded-lg">
              <p className="text-red-200 text-[10px] md:text-xs uppercase font-medium">Источник</p>
              <p className="font-semibold text-sm md:text-base truncate">{incident.hydrophone?.name || 'Н/Д'}</p>
            </div>
            <div className="bg-black/10 p-2 rounded-lg">
              <p className="text-red-200 text-[10px] md:text-xs uppercase font-medium">Обнаружение</p>
              <p className="font-semibold text-sm md:text-base truncate">{incident.label}</p>
            </div>
            <div className="bg-black/10 p-2 rounded-lg flex flex-col justify-center">
              <p className="text-red-200 text-[10px] md:text-xs uppercase font-medium">Достоверность</p>
              <p className="font-semibold text-base md:text-xl">{Math.round(incident.confidence)}%</p>
            </div>
          </div>

          <div className="bg-black/20 rounded-lg p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex-1">
              <div className="hidden md:block">
                <p className="text-sm font-medium mb-1 flex items-center gap-2">
                  <span>💡</span> Рекомендация:
                </p>
                <p className="text-xs text-red-100 mb-2">
                  Направить ближайшую группу для проверки.
                </p>
              </div>
              
              {nearestTeam ? (
                <div className="flex flex-wrap gap-2 text-xs bg-white/10 px-2 py-1.5 rounded border border-white/20">
                  <span className="whitespace-nowrap"><span className="text-red-200">Группа:</span> {nearestTeam.name}</span>
                  <span className="whitespace-nowrap"><span className="text-red-200">Расст:</span> {minDistance.toFixed(1)} км</span>
                  <span className="font-bold text-yellow-300 whitespace-nowrap"><span className="text-red-200 font-normal">Время:</span> ~{etaMinutes} мин</span>
                </div>
              ) : (
                <p className="text-xs text-yellow-300 py-1">Нет доступных групп.</p>
              )}
            </div>
            
            <button
              onClick={handleCreateOperation}
              disabled={!nearestTeam || creating}
              className="bg-white text-red-600 hover:bg-gray-100 font-bold py-2 md:py-3 px-4 md:px-6 rounded-lg shadow-md transition-transform hover:scale-105 whitespace-nowrap text-sm md:text-base w-full sm:w-auto"
            >
              {creating ? 'Создание...' : '⚡ Создать операцию'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ====== Operations Panel ====== */
function OperationsPanel({
  operations,
  onStatusChange,
}: {
  operations: Operation[];
  onStatusChange: () => void;
}) {
  const activeOps = operations.filter(o => o.status !== 'CLOSED');
  const closedOps = operations.filter(o => o.status === 'CLOSED');

  const handleNextStatus = async (op: Operation) => {
    const currentIndex = OPERATION_STATUSES.indexOf(op.status);
    if (currentIndex < OPERATION_STATUSES.length - 1) {
      const nextStatus = OPERATION_STATUSES[currentIndex + 1];
      await fetch(`/api/operations/${op.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      onStatusChange();
    }
  };

  if (operations.length === 0) {
    return (
      <div className="text-center py-12">
        <span className="text-4xl block mb-3 opacity-50">🛡️</span>
        <p className="text-gov-text-secondary font-medium">Нет активных операций</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {activeOps.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900 uppercase tracking-wider text-xs">Активные операции</h3>
          {activeOps.map(op => (
            <div key={op.id} className="border-2 border-red-200 bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="bg-red-50 p-3 border-b border-red-100 flex justify-between items-center">
                <div>
                  <span className="font-bold text-red-700">{op.operationCode}</span>
                  <span className="ml-2 text-xs text-red-500 font-mono">({op.incident.incidentCode})</span>
                </div>
                <span className="bg-red-600 text-white text-xs px-2 py-1 rounded font-medium animate-pulse">
                  {OPERATION_STATUS_LABELS[op.status]}
                </span>
              </div>
              
              <div className="p-4 space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gov-text-secondary">Подразделение:</span>
                  <span className="font-semibold">{op.assignedUnit}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gov-text-secondary">Расчетное время (ETA):</span>
                  <span className="font-bold text-orange-600">~{op.estimatedArrival} мин</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gov-text-secondary">Цель:</span>
                  <span className="font-medium text-gray-900">{op.incident.label}</span>
                </div>

                {/* Workflow Progress */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-2">Статус выполнения:</p>
                  <div className="flex justify-between items-center relative">
                    <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 -z-10 -translate-y-1/2 rounded"></div>
                    {OPERATION_STATUSES.map((status, index) => {
                      const isActive = op.status === status;
                      const isPast = OPERATION_STATUSES.indexOf(op.status) > index;
                      return (
                        <div key={status} className="flex flex-col items-center gap-1 bg-white px-1">
                          <div className={`w-4 h-4 rounded-full border-2 ${
                            isActive ? 'border-red-600 bg-red-600' :
                            isPast ? 'border-green-500 bg-green-500' : 'border-gray-300 bg-white'
                          }`} />
                          <span className={`text-[10px] hidden sm:block ${
                            isActive ? 'text-red-700 font-bold' :
                            isPast ? 'text-green-600 font-medium' : 'text-gray-400'
                          }`}>
                            {OPERATION_STATUS_LABELS[status]}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <button 
                  onClick={() => handleNextStatus(op)}
                  className="w-full bg-gray-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-gray-800 transition-colors"
                >
                  Следующий этап ➔
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {closedOps.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900 uppercase tracking-wider text-xs">Завершенные ({closedOps.length})</h3>
          {closedOps.map(op => (
            <div key={op.id} className="border border-gray-200 bg-gray-50 rounded-lg p-3">
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-gray-700 text-sm">{op.operationCode}</span>
                <span className="text-xs text-green-600 font-medium px-2 py-0.5 bg-green-100 rounded">
                  Закрыта
                </span>
              </div>
              <p className="text-xs text-gray-500">{op.assignedUnit} · {op.incident.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

