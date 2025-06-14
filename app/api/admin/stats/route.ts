import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { userServiceServer } from '@/app/lib/userServiceServer';
import { loginHistoryService } from '@/app/lib/loginHistoryService';

// 管理者権限チェック
async function isAdmin(session: any): Promise<boolean> {
  if (!session?.user?.email) return false;
  
  const adminEmails = ['ikki_y0518@icloud.com', 'ikkiyamamoto0518@gmail.com'];
  return adminEmails.includes(session.user.email);
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !(await isAdmin(session))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Google Sheets設定
    const GOOGLE_SHEETS_ID = process.env.GOOGLE_SHEETS_ID;
    const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    let totalUsers = 0;
    let totalLogins = 0;
    let totalRecords = 0;
    let todayLogins = 0;
    let todaySignups = 0;
    let errors: string[] = [];

    // ローカルユーザー数を取得（重複除去）
    try {
      const users = await userServiceServer.getAllUsers();
      const uniqueEmails = new Set(users.map(user => user.email));
      totalUsers = uniqueEmails.size;
      console.log(`🐛 [DEBUG] Total users: ${users.length} records, ${totalUsers} unique emails`);
    } catch (error) {
      console.error('ローカルユーザー数の取得に失敗:', error);
      errors.push(`ユーザー数取得エラー: ${error}`);
    }

    // ローカルログイン履歴から統計を取得
    try {
      const loginStats = loginHistoryService.getStats();
      totalLogins = loginStats.totalLogins;
      todayLogins = loginStats.todayLogins;
      todaySignups = loginStats.todaySignups;
      totalRecords = loginStats.totalRecords;
      console.log(`🐛 [DEBUG] Login stats: totalLogins=${totalLogins}, todayLogins=${todayLogins}, todaySignups=${todaySignups}`);
    } catch (error) {
      console.error('ローカルログイン統計の取得に失敗:', error);
      errors.push(`ログイン統計取得エラー: ${error}`);
    }

    // Google Sheetsから統計情報を取得
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
          totalRecords = rows.length;
          
          // ログイン数をカウント
          totalLogins = rows.filter(row => 
            row.get('アクション') === 'ログイン' || row.get('アクション') === 'signin'
          ).length;

          // 今日の日付
          const today = new Date().toISOString().split('T')[0];
          
          // 今日のログイン数
          todayLogins = rows.filter(row => {
            const timestamp = row.get('日時');
            if (!timestamp) return false;
            const rowDate = new Date(timestamp).toISOString().split('T')[0];
            const action = row.get('アクション');
            return rowDate === today && (action === 'ログイン' || action === 'signin');
          }).length;

          // 今日の新規登録数
          todaySignups = rows.filter(row => {
            const timestamp = row.get('日時');
            if (!timestamp) return false;
            const rowDate = new Date(timestamp).toISOString().split('T')[0];
            const action = row.get('アクション');
            return rowDate === today && (action === '新規登録' || action === 'signup');
          }).length;

          // ユニークユーザー数を再計算（Google Sheetsのデータから）
          const uniqueUserIds = new Set(rows.map(row => row.get('ユーザーID')).filter(Boolean));
          if (uniqueUserIds.size > totalUsers) {
            totalUsers = uniqueUserIds.size;
          }
        }
      } catch (error) {
        console.error('Google Sheetsからの統計取得に失敗:', error);
      }
    }

    // アクティブユーザー数（過去7日間にログインしたユーザー）
    let activeUsers = 0;
    try {
      const loginStats = loginHistoryService.getStats();
      activeUsers = loginStats.activeUsers;
      console.log(`🐛 [DEBUG] Active users: ${activeUsers}`);
    } catch (error) {
      console.error('アクティブユーザー数の取得に失敗:', error);
    }

    // Google Sheetsからの追加統計（利用可能な場合のみ）
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
          
          // Google Sheetsのデータがある場合は、より多い値を使用
          const sheetsLogins = rows.filter(row =>
            row.get('アクション') === 'ログイン' || row.get('アクション') === 'signin'
          ).length;
          
          if (sheetsLogins > totalLogins) {
            totalLogins = sheetsLogins;
          }

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

          if (sheetsTodayLogins > todayLogins) {
            todayLogins = sheetsTodayLogins;
          }

          // 今日の新規登録数
          const sheetsTodaySignups = rows.filter(row => {
            const timestamp = row.get('日時');
            if (!timestamp) return false;
            const rowDate = new Date(timestamp).toISOString().split('T')[0];
            const action = row.get('アクション');
            return rowDate === today && (action === '新規登録' || action === 'signup');
          }).length;

          if (sheetsTodaySignups > todaySignups) {
            todaySignups = sheetsTodaySignups;
          }
        }
      } catch (error) {
        console.error('Google Sheetsからの追加統計取得に失敗:', error);
      }
    }

    return NextResponse.json({
      totalUsers,
      totalLogins,
      totalRecords,
      todayLogins,
      todaySignups,
      activeUsers,
      mode: GOOGLE_SHEETS_ID ? 'google-sheets' : 'local-only',
      debug: {
        environment: process.env.NODE_ENV,
        hasGoogleSheets: !!GOOGLE_SHEETS_ID,
        errors: errors.length > 0 ? errors : undefined,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('統計情報の取得エラー:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}