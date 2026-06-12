import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user || user.role !== 'INSPECTOR') {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }

  const { id } = await params;

  // Verify the batch
  const batch = await db.batch.update({
    where: { id },
    data: { status: 'VERIFIED' },
  });

  // Auto-list on marketplace after verification
  if (batch) {
    await db.batch.update({
      where: { id },
      data: {
        listed: true,
        price: Math.round((batch.weightKg || 0) * 2500),
      },
    });
  }

  return NextResponse.json({
    batch: { ...batch, listed: true },
    message: 'Партия проверена и выставлена на маркетплейс',
  });
}
