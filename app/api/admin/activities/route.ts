import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { getRecentActivities } from '@/app/lib/db';
import { loginHistoryService } from '@/app/lib/loginHistoryService';

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
    
    console.log('🔧 [ADMIN ACTIVITIES API] Request received');
    console.log('🔧 [ADMIN ACTIVITIES API] Bypass mode:', bypassMode);
    
    const session = await getServerSession(authOptions);
    console.log('🔧 [ADMIN ACTIVITIES API] Session:', session ? 'exists' : 'null');
    console.log('🔧 [ADMIN ACTIVITIES API] User email:', session?.user?.email);
    
    // バイパスモードでない場合のみ認証チェック
    if (!bypassMode) {
      if (!session || !(await isAdmin(session))) {
        console.log('🔧 [ADMIN ACTIVITIES API] Unauthorized access attempt');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else {
      console.log('🔧 [ADMIN ACTIVITIES API] Bypassing authentication');
    }

    console.log('🔧 [ADMIN ACTIVITIES API] Authorization passed, fetching data...');

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let activities: any[] = [];
    let total = 0;

    // ローカルファイルから活動履歴を取得
    try {
      const loginHistory = loginHistoryService.getAllHistory();
      console.log(`🐛 [DEBUG] Local login history: ${loginHistory.length} records`);
      
      // データを新しい順にソート
      const sortedHistory = loginHistory.sort((a, b) => {
        const dateA = new Date(a.timestamp);
        const dateB = new Date(b.timestamp);
        return dateB.getTime() - dateA.getTime();
      });

      // 活動履歴形式に変換
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

      activities = localActivities;
      total = localActivities.length;
      
      console.log(`🐛 [DEBUG] Converted ${localActivities.length} local activities`);
    } catch (error) {
      console.error('ローカル活動履歴の取得に失敗:', error);
    }

    // Google Sheetsから追加の活動履歴を取得
    const GOOGLE_SHEETS_ID = process.env.GOOGLE_SHEETS_ID;
    const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (GOOGLE_SHEETS_ID && GOOGLE_SERVICE_ACCOUNT_EMAIL && GOOGLE_PRIVATE_KEY) {
      try {
        const serviceAccountAuth = new JWT({
          email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
          key: GOOGLE_PRIVATE_KEY,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const doc = new GoogleSpreadsheet(GOOGLE_SHEETS_ID, serviceAccountAuth);
        await doc.loadInfo();

        const sheet = doc.sheetsByTitle['UserTracking'];
        if (sheet) {
          const rows = await sheet.getRows();
          
          console.log(`🐛 [DEBUG] Google Sheets activities: ${rows.length} records`);
          
          // Google Sheetsの活動履歴を追加
          const sheetsActivities = rows.map(row => ({
            id: row.get('ID') || `sheets-${Date.now()}-${Math.random()}`,
            userId: row.get('ユーザーID') || '',
            name: row.get('名前') || 'Unknown User',
            email: row.get('メールアドレス') || 'No email',
            provider: row.get('プロバイダー') || 'google',
            action: row.get('アクション') || 'Unknown',
            timestamp: row.get('日時') || '',
            userAgent: row.get('User Agent') || '',
            imageUrl: row.get('画像URL') || ''
          }));

          // 重複除去（同じタイムスタンプとユーザーIDの組み合わせ）
          const combinedActivities = [...activities];
          sheetsActivities.forEach(sheetsActivity => {
            const isDuplicate = activities.some(localActivity => 
              localActivity.userId === sheetsActivity.userId &&
              Math.abs(new Date(localActivity.timestamp).getTime() - new Date(sheetsActivity.timestamp).getTime()) < 5000 // 5秒以内は重複とみなす
            );
            if (!isDuplicate) {
              combinedActivities.push(sheetsActivity);
            }
          });

          activities = combinedActivities;
          total = combinedActivities.length;
          
          console.log(`🐛 [DEBUG] Combined activities: ${combinedActivities.length} records`);
        }
      } catch (error) {
        console.error('Google Sheets活動履歴の取得に失敗:', error);
      }
    }

    // データを新しい順にソート
    const sortedActivities = activities.sort((a, b) => {
      const dateA = new Date(a.timestamp || 0);
      const dateB = new Date(b.timestamp || 0);
      return dateB.getTime() - dateA.getTime();
    });

    // ページネーション適用
    const paginatedActivities = sortedActivities.slice(offset, offset + limit);

    console.log(`🔧 [ADMIN ACTIVITIES API] Returning ${paginatedActivities.length} activities out of ${total} total`);

    return NextResponse.json({
      activities: paginatedActivities,
      total,
      limit,
      offset
    });

  } catch (error) {
    console.error('🔧 [ADMIN ACTIVITIES API] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch activities',
      debug: {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}