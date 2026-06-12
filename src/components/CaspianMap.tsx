'use client';

import { MapContainer, TileLayer, CircleMarker, Circle, Popup, useMap } from 'react-leaflet';
import { useEffect } from 'react';
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
}

interface CaspianMapProps {
  hydrophones: Hydrophone[];
  incidents: Incident[];
}

function MapBounds() {
  const map = useMap();
  useEffect(() => {
    // Center on Northern Caspian / Mangystau area
    map.setView([45.5, 50.5], 6);
  }, [map]);
  return null;
}

export default function CaspianMap({ hydrophones, incidents }: CaspianMapProps) {
  return (
    <MapContainer
      center={[45.5, 50.5]}
      zoom={6}
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
                Обнаружений: {h.incidents.length}
              </p>
              {h.incidents.length > 0 && (
                <p className="text-gov-text-secondary text-xs">
                  Последнее: {new Date(h.incidents[0].timestamp).toLocaleString('ru-RU')}
                </p>
              )}
            </div>
          </Popup>
        </CircleMarker>
      ))}

      {/* Incident markers */}
      {incidents.map((inc) => (
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
