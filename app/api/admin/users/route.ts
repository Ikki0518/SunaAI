import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { getSupabaseUsers } from '@/app/lib/supabase';

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
    const users = await getSupabaseUsers();
    
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
  try {
    // 管理者認証チェック
    const session = await getServerSession(authOptions);
    if (!session?.user?.email ||
        (session.user.email !== 'ikkiyamamoto0518@gmail.com' &&
         session.user.email !== 'ikki_y0518@icloud.com')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');

    if (action === 'reset') {
      // 全ユーザーデータをリセット（管理者以外）
      const result = await userServiceServer.resetAllUsers();
      
      return NextResponse.json({
        message: 'ユーザーデータをリセットしました',
        deletedCount: result.deletedCount,
        remainingUsers: result.remainingUsers
      });
    }

    if (action === 'deleteUser' && userId) {
      // 個別ユーザー削除
      const user = await userServiceServer.getUserById(userId);
      if (!user) {
        return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
      }

      // 管理者の削除を防ぐ
      if (user.email === 'ikkiyamamoto0518@gmail.com' || user.email === 'ikki_y0518@icloud.com') {
        return NextResponse.json({ error: '管理者ユーザーは削除できません' }, { status: 403 });
      }

      const result = await userServiceServer.deleteUser(userId);
      
      return NextResponse.json({
        message: 'ユーザーを削除しました',
        deletedUser: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('ユーザー削除エラー:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}