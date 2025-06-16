import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { getSupabaseUsers } from '@/app/lib/supabase';
import { userServiceServer } from '@/app/lib/userServiceServer';
// 型定義がなければanyで一時対応
// import type { User } from '@/app/types/user';

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
    
    console.log('🔧 [ADMIN USERS API] Request received');
    console.log('🔧 [ADMIN USERS API] Bypass mode:', bypassMode);
    
    const session = await getServerSession(authOptions);
    console.log('🔧 [ADMIN USERS API] Session:', session ? 'exists' : 'null');
    console.log('🔧 [ADMIN USERS API] User email:', session?.user?.email);
    
    // バイパスモードでない場合のみ認証チェック
    if (!bypassMode) {
      if (!session || !(await isAdmin(session))) {
        console.log('🔧 [ADMIN USERS API] Unauthorized access attempt');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else {
      console.log('🔧 [ADMIN USERS API] Bypassing authentication');
    }

    console.log('🔧 [ADMIN USERS API] Authorization passed, fetching data...');

    let users: any[] = [];
    let errors: string[] = [];

    // ローカルファイルからユーザーデータを取得
    try {
      const localUsers = await userServiceServer.getAllUsers();
      console.log(`🐛 [DEBUG] Local users: ${localUsers.length} records`);
      
      users = localUsers.map(user => ({
        id: user.id,
        email: user.email,
        phone: user.phone || 'N/A',
        name: user.name,
        createdAt: user.createdAt,
        registrationDate: new Date(user.createdAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
        source: 'local'
      }));
      
      console.log(`🐛 [DEBUG] Converted ${users.length} local users`);
    } catch (error) {
      console.error('ローカルユーザーデータの取得に失敗:', error);
      errors.push(`ローカルユーザーデータ取得エラー: ${error}`);
    }

    // Supabaseからも追加でユーザーデータを取得
    try {
      const supabaseUsers: any[] = await getSupabaseUsers();
      console.log(`🐛 [DEBUG] Supabase users: ${supabaseUsers.length} records`);
      
      // 重複除去（同じメールアドレス）
      const combinedUsers = [...users];
      supabaseUsers.forEach(supabaseUser => {
        const isDuplicate = users.some(localUser => 
          localUser.email === supabaseUser.email
        );
        if (!isDuplicate) {
          combinedUsers.push({
            id: supabaseUser.id,
            email: supabaseUser.email,
            phone: supabaseUser.phone || 'N/A',
            name: supabaseUser.name,
            createdAt: supabaseUser.createdAt,
            registrationDate: new Date(supabaseUser.createdAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
            source: 'supabase'
          });
        }
      });

      users = combinedUsers;
      console.log(`🐛 [DEBUG] Combined users: ${users.length} records`);
    } catch (error) {
      console.error('Supabaseユーザーデータの取得に失敗:', error);
      errors.push(`Supabaseユーザーデータ取得エラー: ${error}`);
    }

    // パスワードを除外して返す（既に除外済みだが確認のため）
    const safeUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      createdAt: user.createdAt,
      registrationDate: user.registrationDate,
      source: user.source || 'unknown'
    }));

    // 重複メールアドレスをチェック
    const emailCounts = users.reduce((acc: Record<string, number>, user) => {
      acc[user.email] = (acc[user.email] || 0) + 1;
      return acc;
    }, {});

    const duplicates = Object.entries(emailCounts)
      .filter(([email, count]) => count > 1)
      .map(([email, count]) => ({ email, count }));

    console.log(`🔧 [ADMIN USERS API] Returning ${safeUsers.length} users`);

    return NextResponse.json({
      users: safeUsers,
      totalUsers: users.length,
      uniqueEmails: Object.keys(emailCounts).length,
      duplicates: duplicates,
      summary: {
        totalRecords: users.length,
        uniqueUsers: Object.keys(emailCounts).length,
        duplicateEmails: duplicates.length
      },
      debug: {
        errors: errors.length > 0 ? errors : undefined,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('🔧 [ADMIN USERS API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch users',
        debug: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  // Supabase連携未実装: 一時的にエラーを返す
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
}