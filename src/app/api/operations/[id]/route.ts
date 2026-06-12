import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user || user.role !== 'INSPECTOR') {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }

  const { status } = await request.json();
  const { id } = await params;

  if (!status) {
    return NextResponse.json({ error: 'Статус обязателен' }, { status: 400 });
  }

  const operation = await db.operation.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json({ operation });
}
