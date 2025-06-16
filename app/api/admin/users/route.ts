import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { getSupabaseUsers } from '@/app/lib/supabase';
// 型定義がなければanyで一時対応
// import type { User } from '@/app/types/user';

export async function GET(request: NextRequest) {
  try {
    // 管理者認証チェック
    const session = await getServerSession(authOptions);
    if (!session?.user?.email ||
        (session.user.email !== 'ikkiyamamoto0518@gmail.com' &&
         session.user.email !== 'ikki_y0518@icloud.com')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Supabaseから全ユーザーを取得
    const users: any[] = await getSupabaseUsers();
    
    // パスワードを除外して返す
    const safeUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      phone: user.phone || 'N/A',
      name: user.name,
      createdAt: user.createdAt,
      registrationDate: new Date(user.createdAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
    }));

    // 重複メールアドレスをチェック
    const emailCounts = users.reduce((acc: Record<string, number>, user) => {
      acc[user.email] = (acc[user.email] || 0) + 1;
      return acc;
    }, {});

    const duplicates = Object.entries(emailCounts)
      .filter(([email, count]) => count > 1)
      .map(([email, count]) => ({ email, count }));

    return NextResponse.json({
      users: safeUsers,
      totalUsers: users.length,
      uniqueEmails: Object.keys(emailCounts).length,
      duplicates: duplicates,
      summary: {
        totalRecords: users.length,
        uniqueUsers: Object.keys(emailCounts).length,
        duplicateEmails: duplicates.length
      }
    });

  } catch (error) {
    console.error('ユーザー一覧取得エラー:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  // Supabase連携未実装: 一時的にエラーを返す
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
}