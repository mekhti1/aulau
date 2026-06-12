import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user || user.role !== 'FISHER') {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }

  const { id } = await params;
  const batch = await db.batch.findUnique({ where: { id } });
  
  if (!batch || batch.ownerId !== user.id) {
    return NextResponse.json({ error: 'Партия не найдена' }, { status: 404 });
  }

  if (batch.status !== 'VERIFIED') {
    return NextResponse.json({ error: 'Только проверенные партии можно выставить' }, { status: 400 });
  }

  const updated = await db.batch.update({
    where: { id },
    data: { listed: true, price: Math.round(batch.weightKg * 2500) },
  });

  return NextResponse.json({ batch: updated });
}
