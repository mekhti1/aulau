import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { generateQRPayload } from '@/lib/qr';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  const nets = await db.net.findMany({
    where: user.role === 'FISHER' ? { ownerId: user.id } : undefined,
  });

  return NextResponse.json({ nets });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== 'FISHER') {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }

  const { zone, expiresAt } = await request.json();
  const netCode = `NET-${Date.now().toString(36).toUpperCase()}`;
  const signature = generateQRPayload('NET', netCode);

  const net = await db.net.create({
    data: {
      netCode,
      ownerId: user.id,
      zone,
      expiresAt: new Date(expiresAt).toISOString(),
      signature,
    },
  });

  return NextResponse.json({ net, qrPayload: signature });
}
