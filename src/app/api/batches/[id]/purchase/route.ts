import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user || user.role !== 'BUYER') {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }

  const { id } = await params;
  const batch = await db.batch.findUnique({ where: { id } });
  
  if (!batch) {
    return NextResponse.json({ error: 'Партия не найдена' }, { status: 404 });
  }

  if (batch.sold) {
    return NextResponse.json({ error: 'Партия уже продана' }, { status: 400 });
  }

  if (!batch.listed || batch.status !== 'VERIFIED') {
    return NextResponse.json({ error: 'Партия не доступна для покупки' }, { status: 400 });
  }

  const price = batch.price || Math.round(batch.weightKg * 2500);

  const transaction = await db.transaction.create({
    data: {
      batchId: id,
      buyerId: user.id,
      price,
    },
  });

  await db.batch.update({
    where: { id },
    data: { sold: true },
  });

  return NextResponse.json({ transaction, batch: { ...batch, sold: true } });
}
