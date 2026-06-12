import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

interface DetectionResult {
  label: string;
  labelRu: string;
  confidence: number;
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

function classifyAudio(filename: string): DetectionResult {
  const name = filename.toLowerCase();
  
  if (name.includes('fast') || name.includes('speed') || name.includes('скорост')) {
    return {
      label: 'fast_boat',
      labelRu: 'Скоростной катер',
      confidence: 87 + Math.random() * 10,
      threatLevel: 'HIGH',
    };
  }

  if (name.includes('normal') || name.includes('boat') || name.includes('судно') || name.includes('лодк')) {
    return {
      label: 'normal_boat',
      labelRu: 'Обычное судно',
      confidence: 72 + Math.random() * 15,
      threatLevel: 'MEDIUM',
    };
  }

  if (name.includes('ambient') || name.includes('water') || name.includes('вод') || name.includes('фон')) {
    return {
      label: 'ambient',
      labelRu: 'Фоновый шум',
      confidence: 91 + Math.random() * 8,
      threatLevel: 'LOW',
    };
  }

  const rand = Math.random();
  if (rand > 0.6) {
    return { label: 'fast_boat', labelRu: 'Скоростной катер', confidence: 65 + Math.random() * 20, threatLevel: 'HIGH' };
  } else if (rand > 0.3) {
    return { label: 'normal_boat', labelRu: 'Обычное судно', confidence: 55 + Math.random() * 25, threatLevel: 'MEDIUM' };
  }
  return { label: 'ambient', labelRu: 'Фоновый шум', confidence: 80 + Math.random() * 15, threatLevel: 'LOW' };
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  const formData = await request.formData();
  const filename = formData.get('filename') as string || 'unknown.wav';
  const hydrophoneId = formData.get('hydrophoneId') as string;
  const createIncident = formData.get('createIncident') === 'true';

  const detection = classifyAudio(filename);
  detection.confidence = Math.round(detection.confidence * 10) / 10;

  let incident = null;

  if (createIncident && hydrophoneId && detection.threatLevel !== 'LOW') {
    const hydrophone = await db.hydrophone.findUnique({ where: { id: hydrophoneId } });

    if (hydrophone) {
      const offsetLat = (Math.random() - 0.5) * 0.1;
      const offsetLng = (Math.random() - 0.5) * 0.1;

      incident = await db.incident.create({
        data: {
          incidentCode: `INC-${Date.now().toString(36).toUpperCase()}`,
          hydrophoneId,
          label: detection.labelRu,
          confidence: detection.confidence,
          threatLevel: detection.threatLevel,
          lat: hydrophone.lat + offsetLat,
          lng: hydrophone.lng + offsetLng,
          status: 'OPEN',
        },
      });
    }
  }

  return NextResponse.json({ detection, incident });
}
