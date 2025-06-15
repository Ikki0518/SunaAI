import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { getUserActivities, getLoginHistory } from '@/app/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.email !== 'ikki_y0518@icloud.com') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Supabaseからユーザーアクティビティを取得
    const activities = await getUserActivities(100);
    
    // ログイン履歴も取得
    const loginHistory = await getLoginHistory(50);
    
    // アクティビティとログイン履歴を結合
    const allActivities = [
      ...activities.map(activity => ({
        id: activity.id,
        type: 'activity',
        userId: activity.user_id,
        userEmail: activity.user_email,
        action: activity.action,
        details: activity.details,
        ipAddress: activity.ip_address,
        userAgent: activity.user_agent,
        timestamp: activity.created_at,
        source: 'supabase'
      })),
      ...loginHistory.map(login => ({
        id: login.id,
        type: 'login',
        userId: login.user_id,
        userEmail: login.user_email,
        action: login.action,
        details: `${login.action === 'signin' ? 'ログイン' : login.action === 'signout' ? 'ログアウト' : 'ログイン失敗'}`,
        ipAddress: login.ip_address,
        userAgent: login.user_agent,
        timestamp: login.created_at,
        source: 'supabase'
      }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // 統計情報を計算
    const stats = {
      totalActivities: activities.length,
      totalLogins: loginHistory.filter(l => l.action === 'signin').length,
      totalLogouts: loginHistory.filter(l => l.action === 'signout').length,
      totalFailedLogins: loginHistory.filter(l => l.action === 'failed').length,
      uniqueUsers: new Set([...activities.map(a => a.user_id), ...loginHistory.map(l => l.user_id)]).size
    };

    return NextResponse.json({
      activities: allActivities.slice(0, 100), // 最新100件のみ返す
      stats,
      dataSource: 'supabase'
    });

  } catch (error) {
    console.error('ユーザーアクティビティの取得エラー:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}