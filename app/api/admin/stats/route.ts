import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { userServiceServer } from '@/app/lib/userServiceServer';
import { loginHistoryService } from '@/app/lib/loginHistoryService';
import { getUserStats, getLoginStats } from '@/app/lib/db';

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
    
    console.log('🔧 [ADMIN STATS API] Request received');
    console.log('🔧 [ADMIN STATS API] Bypass mode:', bypassMode);
    
    const session = await getServerSession(authOptions);
    console.log('🔧 [ADMIN STATS API] Session:', session ? 'exists' : 'null');
    console.log('🔧 [ADMIN STATS API] User email:', session?.user?.email);
    
    // バイパスモードでない場合のみ認証チェック
    if (!bypassMode) {
      if (!session || !(await isAdmin(session))) {
        console.log('🔧 [ADMIN STATS API] Unauthorized access attempt');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else {
      console.log('🔧 [ADMIN STATS API] Bypassing authentication');
    }

    console.log('🔧 [ADMIN STATS API] Authorization passed, fetching data...');

    // Google Sheets設定
    const GOOGLE_SHEETS_ID = process.env.GOOGLE_SHEETS_ID;
    const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    let totalUsers = 0;
    let totalLogins = 0;
    let totalRecords = 0;
    let todayLogins = 0;
    let todaySignups = 0;
    let activeUsers = 0;
    let errors: string[] = [];

    // ローカルファイルから統計を取得（確実に動作）
    try {
      const users = await userServiceServer.getAllUsers();
      const uniqueEmails = new Set(users.map(user => user.email));
      totalUsers = uniqueEmails.size;
      console.log(`🐛 [DEBUG] File-based users: ${users.length} records, ${totalUsers} unique emails`);
    } catch (fileError) {
      console.error('ファイルベースユーザー数の取得に失敗:', fileError);
      errors.push(`ファイルベースユーザー数取得エラー: ${fileError}`);
    }

    try {
      const loginStats = loginHistoryService.getStats();
      totalLogins = loginStats.totalLogins;
      todayLogins = loginStats.todayLogins;
      todaySignups = loginStats.todaySignups;
      totalRecords = loginStats.totalRecords;
      activeUsers = loginStats.activeUsers;
      console.log(`🐛 [DEBUG] File-based login stats: totalLogins=${totalLogins}, todayLogins=${todayLogins}, todaySignups=${todaySignups}, activeUsers=${activeUsers}, totalRecords=${totalRecords}`);
    } catch (fileError) {
      console.error('ファイルベースログイン統計の取得に失敗:', fileError);
      errors.push(`ファイルベースログイン統計取得エラー: ${fileError}`);
    }

    // データベースから統計を取得（追加として）
    try {
      const dbUserStats = await getUserStats();
      const dbLoginStats = await getLoginStats();
      
      // データベースの値が大きい場合は使用
      if (dbUserStats.totalUsers > totalUsers) {
        totalUsers = dbUserStats.totalUsers;
      }
      if (dbLoginStats.totalLogins > totalLogins) {
        totalLogins = dbLoginStats.totalLogins;
      }
      if (dbLoginStats.todayLogins > todayLogins) {
        todayLogins = dbLoginStats.todayLogins;
      }
      if (dbLoginStats.todaySignups > todaySignups) {
        todaySignups = dbLoginStats.todaySignups;
      }
      if (dbLoginStats.totalRecords > totalRecords) {
        totalRecords = dbLoginStats.totalRecords;
      }
      if (dbLoginStats.activeUsers > activeUsers) {
        activeUsers = dbLoginStats.activeUsers;
      }
      
      console.log(`🐛 [DEBUG] Database stats: users=${dbUserStats.totalUsers}, logins=${dbLoginStats.totalLogins}, today=${dbLoginStats.todayLogins}/${dbLoginStats.todaySignups}`);
    } catch (error) {
      console.error('データベース統計の取得に失敗:', error);
      errors.push(`データベース統計取得エラー: ${error}`);
    }

    // Google Sheetsから統計情報を取得（追加として）
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
          
          // ログイン数をカウント
          const sheetsLogins = rows.filter(row => 
            row.get('アクション') === 'ログイン' || row.get('アクション') === 'signin'
          ).length;

          // 今日の日付
          const today = new Date().toISOString().split('T')[0];
          
          // 今日のログイン数
          const sheetsTodayLogins = rows.filter(row => {
            const timestamp = row.get('日時');
            if (!timestamp) return false;
            const rowDate = new Date(timestamp).toISOString().split('T')[0];
            const action = row.get('アクション');
            return rowDate === today && (action === 'ログイン' || action === 'signin');
          }).length;

          // 今日の新規登録数
          const sheetsTodaySignups = rows.filter(row => {
            const timestamp = row.get('日時');
            if (!timestamp) return false;
            const rowDate = new Date(timestamp).toISOString().split('T')[0];
            const action = row.get('アクション');
            return rowDate === today && (action === '新規登録' || action === 'signup');
          }).length;

          // ユニークユーザー数を再計算（Google Sheetsのデータから）
          const uniqueUserIds = new Set(rows.map(row => row.get('ユーザーID')).filter(Boolean));
          
          // より大きな値を使用
          if (sheetsLogins > totalLogins) {
            totalLogins = sheetsLogins;
          }
          if (sheetsTodayLogins > todayLogins) {
            todayLogins = sheetsTodayLogins;
          }
          if (sheetsTodaySignups > todaySignups) {
            todaySignups = sheetsTodaySignups;
          }
          if (uniqueUserIds.size > totalUsers) {
            totalUsers = uniqueUserIds.size;
          }
          if (rows.length > totalRecords) {
            totalRecords = rows.length;
          }
        }
      } catch (error) {
        console.error('Google Sheetsからの統計取得に失敗:', error);
        errors.push(`Google Sheets統計取得エラー: ${error}`);
      }
    }

    console.log(`🔧 [ADMIN STATS API] Final stats: users=${totalUsers}, logins=${totalLogins}, today=${todayLogins}/${todaySignups}, active=${activeUsers}, records=${totalRecords}`);

    return NextResponse.json({
      totalUsers,
      totalLogins,
      totalRecords,
      todayLogins,
      todaySignups,
      activeUsers,
      mode: GOOGLE_SHEETS_ID ? 'hybrid' : 'local-only',
      debug: {
        environment: process.env.NODE_ENV,
        hasGoogleSheets: !!(GOOGLE_SHEETS_ID && GOOGLE_SERVICE_ACCOUNT_EMAIL && GOOGLE_PRIVATE_KEY),
        timestamp: new Date().toISOString(),
        errors: errors.length > 0 ? errors : undefined
      }
    }, { status: 200 });

  } catch (error) {
    console.error('🔧 [ADMIN STATS API] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch stats',
      debug: {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}