import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { getStats as getSupabaseStats } from '@/app/lib/supabase';
import { loginHistoryService } from '@/app/lib/loginHistoryService';
import { userServiceServer } from '@/app/lib/userServiceServer';

export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.email !== 'ikki_y0518@icloud.com') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Supabaseから統計を取得
    const supabaseStats = await getSupabaseStats();
    
    // ローカルファイルから統計を取得（フォールバック）
    const localStats = loginHistoryService.getStats();
    
    // ユーザー数を取得
    let totalUsers = supabaseStats.totalUsers;
    if (!totalUsers) {
      try {
        const users = await userServiceServer.getAllUsers();
        const uniqueEmails = new Set(users.map(user => user.email));
        totalUsers = uniqueEmails.size;
      } catch (error) {
        console.error('ユーザー数の取得に失敗:', error);
        totalUsers = 0;
      }
    }

    // 統計データを結合
    const stats = {
      totalUsers: totalUsers || localStats.totalRecords || 0,
      totalLogins: supabaseStats.totalLogins || localStats.totalLogins || 0,
      todayLogins: supabaseStats.todayLogins || localStats.todayLogins || 0,
      todaySignups: localStats.todaySignups || 0,
      activeUsers: supabaseStats.activeUsers || localStats.activeUsers || 0,
      // 追加の統計情報
      failedLogins: 0,
      averageSessionDuration: '計測中',
      peakHours: '分析中',
      deviceBreakdown: {
        desktop: 0,
        mobile: 0,
        tablet: 0
      },
      browserBreakdown: {
        chrome: 0,
        safari: 0,
        firefox: 0,
        other: 0
      },
      // データソース情報
      dataSource: {
        primary: 'supabase',
        fallback: 'local-files',
        supabaseConnected: supabaseStats.totalUsers > 0 || supabaseStats.totalLogins > 0
      }
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('統計情報の取得エラー:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}