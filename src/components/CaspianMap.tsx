'use client';

import { MapContainer, TileLayer, CircleMarker, Circle, Popup, Polyline, useMap } from 'react-leaflet';
import { useEffect, useState } from 'react';
import 'leaflet/dist/leaflet.css';

interface Hydrophone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusKm: number;
  status: string;
  incidents: Array<{
    id: string;
    incidentCode: string;
    timestamp: string;
  }>;
}

interface Incident {
  id: string;
  incidentCode: string;
  label: string;
  confidence: number;
  threatLevel: string;
  status: string;
  lat: number;
  lng: number;
  timestamp?: string;
}

interface CaspianMapProps {
  hydrophones: Hydrophone[];
  incidents: Incident[];
  activeAlert?: Incident | null;
  teams?: any[];
  operations?: any[];
}

function MapBounds() {
  const map = useMap();
  useEffect(() => {
    // Center on Northern Caspian / Mangystau area
    map.setView([43.7, 51.1], 8);
  }, [map]);
  return null;
}

// Dynamic interception zone that expands over time
function DynamicInterceptionZone({ incident }: { incident: Incident }) {
  const [radiusKm, setRadiusKm] = useState(3);

  useEffect(() => {
    if (!incident.timestamp) {
      setRadiusKm(5);
      return;
    }

    const updateRadius = () => {
      const elapsedMinutes = (Date.now() - new Date(incident.timestamp!).getTime()) / 60000;
      // Assume max speed 90km/h → 1.5km per minute, minimum 3km, max 25km
      const dynamicRadius = Math.min(25, Math.max(3, elapsedMinutes * 1.5));
      setRadiusKm(dynamicRadius);
    };

    updateRadius();
    const interval = setInterval(updateRadius, 10000); // Update every 10s
    return () => clearInterval(interval);
  }, [incident.timestamp]);

  return (
    <>
      {/* Outer expanding zone */}
      <Circle
        center={[incident.lat, incident.lng]}
        radius={radiusKm * 1000}
        pathOptions={{
          color: '#EF4444',
          fillColor: '#EF4444',
          fillOpacity: 0.08,
          weight: 2,
          dashArray: '10, 10'
        }}
      />
      {/* Inner core zone */}
      <Circle
        center={[incident.lat, incident.lng]}
        radius={3000}
        pathOptions={{
          color: '#DC2626',
          fillColor: '#DC2626',
          fillOpacity: 0.15,
          weight: 2,
        }}
      />
      {/* Center marker */}
      <CircleMarker
        center={[incident.lat, incident.lng]}
        radius={12}
        className="animate-pulse"
        pathOptions={{
          color: '#DC2626',
          fillColor: '#EF4444',
          fillOpacity: 0.8,
          weight: 3,
        }}
      >
        <Popup>
          <div className="text-sm min-w-[200px]">
            <div className="font-bold text-red-600 mb-1">🚨 Зона перехвата</div>
            <p className="text-gray-600">Предполагаемая зона перехвата</p>
            <p className="text-xs text-gray-500 mt-1">Радиус: {radiusKm.toFixed(1)} км</p>
            <p className="text-xs text-gray-500">Инцидент: {incident.incidentCode}</p>
          </div>
        </Popup>
      </CircleMarker>
    </>
  );
}

export default function CaspianMap({ hydrophones, incidents, activeAlert, teams = [], operations = [] }: CaspianMapProps) {
  return (
    <MapContainer
      center={[43.7, 51.1]}
      zoom={8}
      className="w-full h-full"
      zoomControl={true}
    >
      <MapBounds />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Hydrophone coverage circles */}
      {hydrophones.map((h) => (
        <Circle
          key={`circle-${h.id}`}
          center={[h.lat, h.lng]}
          radius={h.radiusKm * 1000}
          pathOptions={{
            color: '#2F7ABF',
            fillColor: '#2F7ABF',
            fillOpacity: 0.08,
            weight: 1,
            dashArray: '5, 5',
          }}
        />
      ))}

      {/* Hydrophone markers */}
      {hydrophones.map((h) => (
        <CircleMarker
          key={`hydro-${h.id}`}
          center={[h.lat, h.lng]}
          radius={8}
          pathOptions={{
            color: '#1E5A96',
            fillColor: '#2F7ABF',
            fillOpacity: 0.9,
            weight: 2,
          }}
        >
          <Popup>
            <div className="text-sm min-w-[200px]">
              <h3 className="font-bold text-gray-900 mb-1">📡 {h.name}</h3>
              <p className="text-gov-text-secondary">
                Координаты: {h.lat.toFixed(2)}, {h.lng.toFixed(2)}
              </p>
              <p className="text-gov-text-secondary">
                Радиус покрытия: {h.radiusKm} км
              </p>
              <p className="text-gov-text-secondary">
                Статус: <span className="text-gov-success font-medium">●  Активен</span>
              </p>
              <p className="text-gov-text-secondary">
                Обнаружений: {h.incidents?.length || 0}
              </p>
            </div>
          </Popup>
        </CircleMarker>
      ))}

      {/* Response Teams */}
      {teams.map(t => (
        <CircleMarker
          key={`team-${t.id}`}
          center={[t.lat, t.lng]}
          radius={8}
          pathOptions={{
            color: '#1E40AF',
            fillColor: '#3B82F6',
            fillOpacity: 1,
            weight: 2,
          }}
        >
          <Popup>
            <div className="text-sm">
              <h3 className="font-bold text-blue-800">🚤 {t.name}</h3>
              <p className="text-gov-text-secondary">Статус: {t.available ? 'Доступен' : 'Занят'}</p>
            </div>
          </Popup>
        </CircleMarker>
      ))}

      {/* Active Alert Interception Zone — Dynamic */}
      {activeAlert && (
        <DynamicInterceptionZone incident={activeAlert} />
      )}

      {/* Operation movement arrows — team to incident */}
      {operations.filter((op: any) => op.status !== 'CLOSED' && op.incident).map((op: any) => {
        const team = teams.find((t: any) => t.id === op.teamId);
        if (!team || !op.incident) return null;

        return (
          <Polyline
            key={`op-line-${op.id}`}
            positions={[
              [team.lat, team.lng],
              [op.incident.lat, op.incident.lng],
            ]}
            pathOptions={{
              color: '#EF4444',
              weight: 3,
              dashArray: '8, 8',
              opacity: 0.7,
            }}
          />
        );
      })}

      {/* Incident markers */}
      {incidents.filter(inc => !activeAlert || inc.id !== activeAlert.id).map((inc) => (
        <CircleMarker
          key={`inc-${inc.id}`}
          center={[inc.lat, inc.lng]}
          radius={inc.status === 'OPEN' ? 10 : 6}
          pathOptions={{
            color: inc.status === 'OPEN' ? '#C62828' : inc.status === 'CONFIRMED' ? '#F9A825' : '#2E7D32',
            fillColor: inc.status === 'OPEN' ? '#C62828' : inc.status === 'CONFIRMED' ? '#F9A825' : '#2E7D32',
            fillOpacity: 0.7,
            weight: 2,
          }}
        >
          <Popup>
            <div className="text-sm min-w-[180px]">
              <h3 className="font-bold text-gov-danger mb-1">⚠️ {inc.incidentCode}</h3>
              <p className="font-medium">{inc.label}</p>
              <p className="text-gov-text-secondary">
                Уверенность: {Math.round(inc.confidence)}%
              </p>
              <p className="text-gov-text-secondary">
                Угроза: {inc.threatLevel === 'HIGH' ? '🔴 Высокий' : inc.threatLevel === 'MEDIUM' ? '🟠 Средний' : '🟢 Низкий'}
              </p>
              <p className="text-gov-text-secondary">
                Статус: {inc.status === 'OPEN' ? 'Открыт' : inc.status === 'CONFIRMED' ? 'Подтверждён' : 'Закрыт'}
              </p>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
