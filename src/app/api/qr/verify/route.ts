import { NextRequest, NextResponse } from 'next/server';
import { verifyQRPayload } from '@/lib/qr';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const payload = searchParams.get('payload');

  if (!payload) {
    return NextResponse.json({ error: 'Отсутствует QR-код' }, { status: 400 });
  }

  const result = verifyQRPayload(payload);

  if (!result.valid) {
    return NextResponse.json({
      valid: false,
      error: 'Недействительный QR-код',
    });
  }

  let data = null;

  if (result.type === 'NET') {
    data = await db.net.findUnique({ where: { netCode: result.code } });
  } else if (result.type === 'BATCH') {
    data = await db.batch.findUnique({
      where: { batchCode: result.code },
      include: { transactions: true },
    });
  }

  return NextResponse.json({
    valid: true,
    type: result.type,
    code: result.code,
    data,
  });
}
