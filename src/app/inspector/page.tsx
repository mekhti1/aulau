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

  // Determine Alert Mode
  // If the most recent OPEN incident is HIGH threat or >=85% confidence
  const activeAlerts = incidents.filter(i => 
    i.status === 'OPEN' && (i.threatLevel === 'HIGH' || i.confidence >= 85)
  ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  const activeAlert = activeAlerts.length > 0 ? activeAlerts[0] : null;

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
          />
        </div>
      </div>

      {/* Side Panel */}
      <div className="w-full lg:w-[460px] bg-white border-l border-gov-border flex flex-col h-full overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gov-border bg-white z-10 overflow-x-auto custom-scrollbar">
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
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
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
        </div>
      </div>
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
    <div className="bg-red-600 text-white p-4 shadow-lg border-b-4 border-red-800 animate-in fade-in slide-in-from-top-2 duration-500 z-20">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 bg-white/20 p-3 rounded-xl animate-pulse">
          <span className="text-3xl block">🚨</span>
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold uppercase tracking-wide mb-2 flex items-center gap-2">
            ВНИМАНИЕ! РЕЖИМ ТРЕВОГИ
            <span className="bg-white/20 px-2 py-0.5 rounded text-xs">Автоматическое обнаружение</span>
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-red-200 text-xs uppercase font-medium">Инцидент</p>
              <p className="font-mono font-semibold">{incident.incidentCode}</p>
            </div>
            <div>
              <p className="text-red-200 text-xs uppercase font-medium">Источник</p>
              <p className="font-semibold">{incident.hydrophone?.name || 'Н/Д'}</p>
            </div>
            <div>
              <p className="text-red-200 text-xs uppercase font-medium">Обнаружение</p>
              <p className="font-semibold">{incident.label}</p>
            </div>
            <div>
              <p className="text-red-200 text-xs uppercase font-medium">Достоверность</p>
              <p className="font-semibold text-xl">{Math.round(incident.confidence)}%</p>
            </div>
          </div>

          <div className="bg-black/20 rounded-lg p-3 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm font-medium mb-1 flex items-center gap-2">
                <span>💡</span> Оперативная рекомендация:
              </p>
              <p className="text-sm text-red-100">
                Высокая вероятность браконьерства. Рекомендуется направить ближайшую мобильную группу для проведения проверки.
              </p>
              {nearestTeam ? (
                <div className="mt-2 flex gap-4 text-sm bg-white/10 inline-flex px-3 py-1.5 rounded-lg border border-white/20">
                  <span><span className="text-red-200">Группа:</span> {nearestTeam.name}</span>
                  <span><span className="text-red-200">Расстояние:</span> {minDistance.toFixed(1)} км</span>
                  <span className="font-bold text-yellow-300"><span className="text-red-200 font-normal">Время прибытия:</span> ~{etaMinutes} мин</span>
                </div>
              ) : (
                <p className="text-sm mt-2 text-yellow-300">Нет доступных групп реагирования.</p>
              )}
            </div>
            
            <button
              onClick={handleCreateOperation}
              disabled={!nearestTeam || creating}
              className="bg-white text-red-600 hover:bg-gray-100 font-bold py-3 px-6 rounded-lg shadow-md transition-transform hover:scale-105 whitespace-nowrap"
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

/* ====== Batches Panel ====== */
function BatchesPanel({ batches, onVerify }: { batches: Batch[]; onVerify: (id: string) => void; }) {
  const pending = batches.filter((b) => b.status === 'PENDING');
  return (
    <div className="space-y-4">
      {pending.map((batch) => (
        <div key={batch.id} className="border border-yellow-200 bg-yellow-50 rounded-lg p-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-gray-900 text-sm">{batch.batchCode}</p>
              <p className="text-xs text-gov-text-secondary mt-0.5">
                {batch.species} · {batch.weightKg} кг
              </p>
            </div>
            <span className="badge badge-warning">{BATCH_STATUS_LABELS[batch.status]}</span>
          </div>
          <div className="flex gap-2 mt-3 pt-3 border-t border-yellow-200">
            <button
              onClick={() => onVerify(batch.id)}
              className="btn-primary text-xs flex-1 !py-1.5"
            >
              ✓ Одобрить
            </button>
          </div>
        </div>
      ))}
      {pending.length === 0 && (
        <div className="text-center py-6 text-gov-success font-medium">Нет партий на рассмотрении</div>
      )}
    </div>
  );
}

/* ====== Incident Panel ====== */
function IncidentPanel({ incidents, onAction }: { incidents: Incident[]; onAction: (id: string, status: string) => void; }) {
  if (incidents.length === 0) return <div className="text-center py-8 text-gov-text-secondary">Нет инцидентов</div>;
  return (
    <div className="space-y-3">
      {incidents.map((incident) => (
        <div key={incident.id} className="border border-gov-border rounded-lg p-3">
          <div className="flex justify-between">
            <div>
              <span className="text-sm font-semibold text-gray-900">{incident.incidentCode}</span>
              <p className="text-sm text-gray-900 mt-1">{incident.label}</p>
              <p className="text-xs text-gov-text-secondary">Угроза: {THREAT_LEVEL_LABELS[incident.threatLevel]}</p>
            </div>
            <span className={`badge ${incident.status === 'OPEN' ? 'badge-danger' : 'badge-success'}`}>
              {INCIDENT_STATUS_LABELS[incident.status]}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ====== Detection Panel ====== */
function DetectionPanel({
  hydrophones, selectedHydrophone, setSelectedHydrophone,
  selectedAudio, setSelectedAudio, uploadedFile, setUploadedFile,
  detecting, detectionResult, onDetect
}: any) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const DEMO_AUDIO = [
    { file: 'fast_boat.wav', label: 'Скоростной катер (демо)' },
    { file: 'normal_boat.wav', label: 'Обычное судно (демо)' },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setUploadedFile(e.target.files[0]);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="label-text">Гидрофон</label>
        <select value={selectedHydrophone} onChange={(e) => setSelectedHydrophone(e.target.value)} className="input-field">
          {hydrophones.map((h: any) => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label-text">Демо аудио</label>
        <select value={selectedAudio} onChange={(e) => { setSelectedAudio(e.target.value); setUploadedFile(null); }} className="input-field">
          {DEMO_AUDIO.map((a) => <option key={a.file} value={a.file}>{a.label}</option>)}
        </select>
      </div>
      <button onClick={onDetect} disabled={detecting} className="btn-primary w-full">
        {detecting ? 'Анализ...' : '🎯 Запустить обнаружение'}
      </button>
      {detectionResult && (
        <div className="p-4 border rounded-lg bg-red-50 border-red-200">
          <p className="font-semibold text-gov-danger mb-2">Обнаружено: {detectionResult.labelRu}</p>
          <p className="text-sm">Уверенность: {Math.round(detectionResult.confidence)}%</p>
        </div>
      )}
    </div>
  );
}
