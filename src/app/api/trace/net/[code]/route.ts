import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyQRPayload } from '@/lib/qr';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const net = await db.net.findUnique({ where: { netCode: code } });

  if (!net) {
    return NextResponse.json({ error: 'Сеть не найдена' }, { status: 404 });
  }

  const qrPayload = net.signature || '';
  const verification = verifyQRPayload(qrPayload);

  return NextResponse.json({
    net,
    verified: verification.valid,
    expired: new Date(net.expiresAt) < new Date(),
  });
}
