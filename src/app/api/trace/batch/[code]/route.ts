import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyQRPayload } from '@/lib/qr';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const batch = await db.batch.findUnique({
    where: { batchCode: code },
    include: { transactions: true },
  });

  if (!batch) {
    return NextResponse.json({ error: 'Партия не найдена' }, { status: 404 });
  }

  const qrPayload = batch.signature || '';
  const verification = verifyQRPayload(qrPayload);

  const transactions = batch.transactions || [];

  return NextResponse.json({
    batch,
    verified: verification.valid,
    timeline: [
      { step: 'Улов зарегистрирован', date: batch.caughtAt, done: true },
      { step: 'Партия создана', date: batch.createdAt, done: true },
      { step: 'ЭЦП подписано', date: batch.signedAt, done: !!batch.signedAt },
      { step: 'Проверка инспектором', date: null, done: batch.status === 'VERIFIED' },
      { step: 'Размещено на маркетплейсе', date: null, done: batch.listed },
      { step: 'Покупка подтверждена', date: transactions[0]?.createdAt || null, done: batch.sold },
    ],
  });
}
