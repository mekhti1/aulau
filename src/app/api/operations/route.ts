import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  const user = await getAuthUser();
  if (!user || user.role !== 'INSPECTOR') {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }

  const operations = await db.operation.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ operations });
}

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user || user.role !== 'INSPECTOR') {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }

  const { incidentId, teamId, assignedUnit, estimatedArrival, distanceKm } = await request.json();

  if (!incidentId || !teamId || !assignedUnit) {
    return NextResponse.json({ error: 'Не все данные заполнены' }, { status: 400 });
  }

  const operationCode = `OP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

  const operation = await db.operation.create({
    data: {
      operationCode,
      incidentId,
      teamId,
      assignedUnit,
      estimatedArrival,
      distanceKm,
      status: 'CREATED',
    },
  });

  return NextResponse.json({ operation });
}
