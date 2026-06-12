import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  const user = await getAuthUser();
  if (!user || user.role !== 'INSPECTOR') {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }

  const teams = await db.response_team.findMany({ where: { available: true } });
  return NextResponse.json({ teams });
}
