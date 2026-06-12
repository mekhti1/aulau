import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user || user.role !== 'INSPECTOR') {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }

  const { id } = await params;
  const { status } = await request.json();

  if (!['OPEN', 'CONFIRMED', 'CLOSED'].includes(status)) {
    return NextResponse.json({ error: 'Недопустимый статус' }, { status: 400 });
  }

  const incident = await db.incident.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json({ incident });
}
