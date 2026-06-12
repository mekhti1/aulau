import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  const incidents = await db.incident.findMany();

  return NextResponse.json({ incidents });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  const { hydrophoneId, label, confidence, threatLevel, lat, lng } = await request.json();

  const incidentCode = `INC-${Date.now().toString(36).toUpperCase()}`;

  const incident = await db.incident.create({
    data: {
      incidentCode,
      hydrophoneId,
      label,
      confidence,
      threatLevel,
      lat,
      lng,
      status: 'OPEN',
    },
  });

  return NextResponse.json({ incident });
}
