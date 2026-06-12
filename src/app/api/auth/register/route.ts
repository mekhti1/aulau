import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { name, username, password, role, certNumber } = await request.json();

    if (!name || !username || !password || !role) {
      return NextResponse.json(
        { error: 'Все поля обязательны' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Пароль должен содержать минимум 6 символов' },
        { status: 400 }
      );
    }

    if (!['FISHER', 'BUYER'].includes(role)) {
      return NextResponse.json(
        { error: 'Допустимые роли: FISHER, BUYER' },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existing = await db.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json(
        { error: 'Пользователь с таким логином уже существует' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `usr-${role.toLowerCase()}-${Date.now().toString(36)}`;

    const user = await db.user.create({
      data: {
        id: userId,
        name,
        username,
        passwordHash,
        role,
        quotaLimitKg: role === 'FISHER' ? 500 : 0,
        quotaUsedKg: 0,
        trustScore: 3.0,
        certNumber: certNumber || null,
      },
    });

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error: unknown) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Ошибка регистрации' },
      { status: 500 }
    );
  }
}
