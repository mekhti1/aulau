import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  const transactions = await db.transaction.findMany({ where: { buyerId: user.id } });

  return NextResponse.json({ transactions });
}
