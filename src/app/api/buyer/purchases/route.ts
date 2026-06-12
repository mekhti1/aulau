import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { generateQRPayload, generateSignature } from '@/lib/qr';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  const transactions = await db.transaction.findMany({ where: { buyerId: user.id } });

  // Enrich transactions with full batch data including owner info
  const enrichedPurchases = await Promise.all(
    transactions.map(async (t: { id: string; batchId: string; price: number; createdAt: string; batch?: { species: string; weightKg: number; batchCode: string } }, index: number) => {
      const batch = await db.batch.findUnique({
        where: { id: t.batchId },
        include: { transactions: true },
      });

      const publicQR = batch ? generateQRPayload('PUBLIC', batch.batchCode) : null;
      const inspectorQR = batch ? generateQRPayload('INSPECTOR', batch.batchCode) : null;
      const publicSig = batch ? generateSignature('PUBLIC', batch.batchCode) : null;

      return {
        id: t.id,
        receiptNumber: 1000 + index + 1,
        price: t.price,
        createdAt: t.createdAt,
        batch: batch ? {
          batchCode: batch.batchCode,
          species: batch.species,
          weightKg: batch.weightKg,
          caughtAt: batch.caughtAt,
          lat: batch.lat,
          lng: batch.lng,
          status: batch.status,
          fisher: batch.owner?.name || 'Неизвестно',
          certNumber: batch.certNumber,
        } : t.batch,
        buyerName: user.name,
        publicQR,
        inspectorQR,
        publicSig,
      };
    })
  );

  return NextResponse.json({ purchases: enrichedPurchases });
}
