import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { getSupabaseUsers } from '@/app/lib/supabase';

// 管理者権限チェック
async function isAdmin(session: any): Promise<boolean> {
  if (!session?.user?.email) return false;
  const adminEmails = ['ikki_y0518@icloud.com', 'ikkiyamamoto0518@gmail.com'];
  return adminEmails.includes(session.user.email);
}

export async function GET(request: NextRequest) {
  try {
    // URLパラメータでバイパスモードをチェック
    const url = new URL(request.url);
    const bypassMode = url.searchParams.get('bypass') === 'true';

    const session = await getServerSession(authOptions);

    // バイパスモードでない場合のみ認証チェック
    if (!bypassMode) {
      if (!session || !(await isAdmin(session))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Supabaseからユーザーデータを取得
    const supabaseUsers = await getSupabaseUsers();

    // パスワードを除外して返す
    const safeUsers = supabaseUsers.map((user: any) => ({
      id: user.id,
      email: user.email,
      phone: user.phone || 'N/A',
      name: user.name,
      createdAt: user.created_at,
      registrationDate: user.created_at ? new Date(user.created_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }) : ''
    }));

    // 重複メールアドレスをチェック
    const emailCounts = safeUsers.reduce((acc: Record<string, number>, user: any) => {
      acc[user.email] = (acc[user.email] || 0) + 1;
      return acc;
    }, {});

    const duplicates = Object.entries(emailCounts)
      .filter(([email, count]) => (count as number) > 1)
      .map(([email, count]) => ({ email, count: count as number }));

    return NextResponse.json({
      users: safeUsers,
      totalUsers: safeUsers.length,
      uniqueEmails: Object.keys(emailCounts).length,
      duplicates: duplicates,
      summary: {
        totalRecords: safeUsers.length,
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

// DELETEはNot implemented
export async function DELETE(request: NextRequest) {
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
}