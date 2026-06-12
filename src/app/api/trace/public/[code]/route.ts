import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyQRPayload } from '@/lib/qr';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  // Try to verify as PUBLIC QR
  const url = new URL(request.url);
  const sig = url.searchParams.get('sig');
  
  let verified = false;
  if (sig) {
    const payload = `PUBLIC:${code}:${sig}`;
    const result = verifyQRPayload(payload);
    verified = result.valid;
  }

  const batch = await db.batch.findUnique({
    where: { batchCode: code },
    include: { transactions: true },
  });

  if (!batch) {
    return NextResponse.json({ error: 'Партия не найдена', verified: false }, { status: 404 });
  }

  // For public view, return limited information
  const transactions = batch.transactions || [];
  const buyerName = transactions.length > 0 ? transactions[0].buyer?.name : null;

  return NextResponse.json({
    batch: {
      batchCode: batch.batchCode,
      species: batch.species,
      weightKg: batch.weightKg,
      caughtAt: batch.caughtAt,
      lat: batch.lat,
      lng: batch.lng,
      status: batch.status,
      fisher: batch.owner?.name || 'Неизвестно',
      buyerName,
    },
    verified,
  });
}
