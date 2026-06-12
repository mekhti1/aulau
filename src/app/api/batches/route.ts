import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { generateQRPayload } from '@/lib/qr';

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  const where: Record<string, unknown> = {};

  if (user.role === 'FISHER') {
    where.ownerId = user.id;
  }

  if (user.role === 'BUYER') {
    where.status = 'VERIFIED';
    where.listed = true;
    where.sold = false;
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const listed = searchParams.get('listed');
  const sold = searchParams.get('sold');

  if (status) where.status = status;
  if (listed !== null && listed !== undefined && listed !== '') where.listed = listed === 'true';
  if (sold !== null && sold !== undefined && sold !== '') where.sold = sold === 'true';

  const batches = await db.batch.findMany({ where });

  return NextResponse.json({ batches });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== 'FISHER') {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }

  const { species, weightKg, lat, lng, netId, signedBy, certNumber } = await request.json();
  const batchCode = `BATCH-${Date.now().toString(36).toUpperCase()}`;
  const signature = generateQRPayload('BATCH', batchCode);

  // Check quota
  const fisher = await db.user.findUnique({ where: { id: user.id } });
  if (!fisher) return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });

  if (fisher.quotaUsedKg + weightKg > fisher.quotaLimitKg) {
    return NextResponse.json(
      { error: `Превышение квоты. Доступно: ${fisher.quotaLimitKg - fisher.quotaUsedKg} кг` },
      { status: 400 }
    );
  }

  const batch = await db.batch.create({
    data: {
      batchCode,
      ownerId: user.id,
      species,
      weightKg,
      caughtAt: new Date().toISOString(),
      lat,
      lng,
      signature,
      netId: netId || null,
      signedBy: signedBy || user.name,
      signedAt: new Date().toISOString(),
      certNumber: certNumber || `KZ-EDS-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
    },
  });

  // Deduct quota
  await db.user.update({
    where: { id: user.id },
    data: { quotaUsedKg: fisher.quotaUsedKg + weightKg },
  });

  return NextResponse.json({ batch, qrPayload: signature });
}
