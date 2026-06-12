import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  const authUser = await getAuthUser();
  if (!authUser) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  const user = await db.user.findUnique({ where: { id: authUser.id } });

  return NextResponse.json({ user });
}
