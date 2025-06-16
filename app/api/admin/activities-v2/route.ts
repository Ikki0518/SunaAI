import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { getUserActivities, getLoginHistory } from '@/app/lib/supabase';
import { loginHistoryService } from '@/app/lib/loginHistoryService';

export async function GET(request: NextRequest) {
  try {
    // URLパラメータでバイパスモードをチェック
    const url = new URL(request.url);
    const bypassMode = url.searchParams.get('bypass') === 'true';
    
    console.log('🔧 [ADMIN ACTIVITIES-V2 API] Request received');
    console.log('🔧 [ADMIN ACTIVITIES-V2 API] Bypass mode:', bypassMode);
    
    // 認証チェック
    const session = await getServerSession(authOptions);
    
    // 管理者メールアドレス判定を柔軟に
    const adminEmails = ['ikki_y0518@icloud.com', 'ikkiyamamoto0518@gmail.com'];
    const userEmail = session?.user?.email?.toLowerCase().trim();
    const isAdmin = userEmail && adminEmails.some(email => email === userEmail);
    
    // バイパスモードでない場合のみ認証チェック
    if (!bypassMode && (!session || !isAdmin)) {
      console.log('🔧 [ADMIN ACTIVITIES-V2 API] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    } else if (bypassMode) {
      console.log('🔧 [ADMIN ACTIVITIES-V2 API] Bypassing authentication');
    }

    console.log('🔧 [ADMIN ACTIVITIES-V2 API] Authorization passed, fetching data...');

    let allActivities: any[] = [];
    let stats = {
      totalActivities: 0,
      totalLogins: 0,
      totalLogouts: 0,
      totalFailedLogins: 0,
      uniqueUsers: 0
    };

    // バイパスモードまたはSupabase接続エラー時はローカルファイルから取得
    if (bypassMode) {
      try {
        const loginHistory = loginHistoryService.getAllHistory();
        console.log(`🐛 [DEBUG] Local login history: ${loginHistory.length} records`);
        
        // データを新しい順にソート
        const sortedHistory = loginHistory.sort((a, b) => {
          const dateA = new Date(a.timestamp);
          const dateB = new Date(b.timestamp);
          return dateB.getTime() - dateA.getTime();
        });

        // 活動履歴形式に変換（ダッシュボードが期待する形式）
        const localActivities = sortedHistory.map(record => ({
          id: `local-${record.userId}-${record.timestamp}`,
          userId: record.userId,
          name: record.name || 'Unknown User',
          email: record.email || 'No email',
          provider: 'local',
          action: record.action === 'signin' ? 'ログイン' : 
                  record.action === 'signup' ? '新規登録' : record.action,
          timestamp: record.timestamp,
          userAgent: '',
          imageUrl: ''
        }));

        allActivities = localActivities;
        
        // 統計情報を計算
        const logins = localActivities.filter(a => a.action === 'ログイン');
        const signups = localActivities.filter(a => a.action === '新規登録');
        const uniqueUserIds = new Set(localActivities.map(a => a.userId));

        stats = {
          totalActivities: localActivities.length,
          totalLogins: logins.length,
          totalLogouts: 0, // ローカルデータにはログアウト記録なし
          totalFailedLogins: 0, // ローカルデータには失敗記録なし
          uniqueUsers: uniqueUserIds.size
        };
        
        console.log(`🐛 [DEBUG] Local activities converted: ${localActivities.length} records`);
        console.log(`🐛 [DEBUG] Local stats:`, stats);
        
        return NextResponse.json({
          activities: allActivities.slice(0, 100), // 最新100件のみ返す
          stats,
          dataSource: 'local'
        });
      } catch (error) {
        console.error('ローカル活動履歴の取得に失敗:', error);
        return NextResponse.json({ 
          error: 'Failed to fetch local activities',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
      }
    }

    // Supabaseからユーザーアクティビティを取得
    try {
      const activities = await getUserActivities(100);
      
      // ログイン履歴も取得
      const loginHistory = await getLoginHistory(50);
      
      // アクティビティとログイン履歴を結合
      allActivities = [
        ...activities.map((activity: any) => ({
          id: activity.id,
          userId: activity.user_id,
          name: activity.user_email?.split('@')[0] || 'Unknown User', // メールアドレスから名前を推定
          email: activity.user_email || 'No email',
          provider: 'supabase',
          action: activity.action,
          timestamp: activity.created_at,
          userAgent: activity.user_agent || '',
          imageUrl: ''
        })),
        ...loginHistory.map((login: any) => ({
          id: login.id,
          userId: login.user_id,
          name: login.user_email?.split('@')[0] || 'Unknown User', // メールアドレスから名前を推定
          email: login.user_email || 'No email',
          provider: 'supabase',
          action: login.action === 'signin' ? 'ログイン' : login.action === 'signout' ? 'ログアウト' : 'ログイン失敗',
          timestamp: login.created_at,
          userAgent: login.user_agent || '',
          imageUrl: ''
        }))
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // 統計情報を計算
      stats = {
        totalActivities: activities.length,
        totalLogins: loginHistory.filter((l: any) => l.action === 'signin').length,
        totalLogouts: loginHistory.filter((l: any) => l.action === 'signout').length,
        totalFailedLogins: loginHistory.filter((l: any) => l.action === 'failed').length,
        uniqueUsers: new Set([...activities.map((a: any) => a.user_id), ...loginHistory.map((l: any) => l.user_id)]).size
      };

      console.log(`🐛 [DEBUG] Supabase activities: ${allActivities.length} records`);
      console.log(`🐛 [DEBUG] Supabase stats:`, stats);

      return NextResponse.json({
        activities: allActivities.slice(0, 100), // 最新100件のみ返す
        stats,
        dataSource: 'supabase'
      });
    } catch (error) {
      console.error('Supabaseからユーザーアクティビティの取得エラー:', error);
      
      // Supabaseでエラーが発生した場合、ローカルファイルにフォールバック
      try {
        const loginHistory = loginHistoryService.getAllHistory();
        console.log(`🐛 [DEBUG] Fallback to local login history: ${loginHistory.length} records`);
        
        // データを新しい順にソート
        const sortedHistory = loginHistory.sort((a, b) => {
          const dateA = new Date(a.timestamp);
          const dateB = new Date(b.timestamp);
          return dateB.getTime() - dateA.getTime();
        });

        // 活動履歴形式に変換（ダッシュボードが期待する形式）
        const localActivities = sortedHistory.map(record => ({
          id: `local-${record.userId}-${record.timestamp}`,
          userId: record.userId,
          name: record.name || 'Unknown User',
          email: record.email || 'No email',
          provider: 'local',
          action: record.action === 'signin' ? 'ログイン' : 
                  record.action === 'signup' ? '新規登録' : record.action,
          timestamp: record.timestamp,
          userAgent: '',
          imageUrl: ''
        }));

        allActivities = localActivities;
        
        // 統計情報を計算
        const logins = localActivities.filter(a => a.action === 'ログイン');
        const signups = localActivities.filter(a => a.action === '新規登録');
        const uniqueUserIds = new Set(localActivities.map(a => a.userId));

        stats = {
          totalActivities: localActivities.length,
          totalLogins: logins.length,
          totalLogouts: 0,
          totalFailedLogins: 0,
          uniqueUsers: uniqueUserIds.size
        };
        
        console.log(`🐛 [DEBUG] Fallback activities converted: ${localActivities.length} records`);
        
        return NextResponse.json({
          activities: allActivities.slice(0, 100),
          stats,
          dataSource: 'local-fallback'
        });
      } catch (fallbackError) {
        console.error('ローカルフォールバックも失敗:', fallbackError);
        return NextResponse.json({ 
          error: 'Failed to fetch activities from all sources',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
      }
    }

  } catch (error) {
    console.error('🔧 [ADMIN ACTIVITIES-V2 API] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}