import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { getRecentActivities } from '@/app/lib/db';

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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Google Sheets設定
    const GOOGLE_SHEETS_ID = process.env.GOOGLE_SHEETS_ID;
    const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!GOOGLE_SHEETS_ID || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
      return NextResponse.json({
        activities: [],
        total: 0,
        message: 'Google Sheets tracking disabled'
      });
    }

    const serviceAccountAuth = new JWT({
      email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: GOOGLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(GOOGLE_SHEETS_ID, serviceAccountAuth);
    await doc.loadInfo();

    const sheet = doc.sheetsByTitle['UserTracking'];
    if (!sheet) {
      return NextResponse.json({
        activities: [],
        total: 0,
        message: 'UserTracking sheet not found'
      });
    }

    const rows = await sheet.getRows();
    
    // データを新しい順にソート
    const sortedRows = rows.sort((a, b) => {
      const dateA = new Date(a.get('日時') || 0);
      const dateB = new Date(b.get('日時') || 0);
      return dateB.getTime() - dateA.getTime();
    });

    // ページネーション適用
    const paginatedRows = sortedRows.slice(offset, offset + limit);

    const activities = paginatedRows.map(row => ({
      id: row.get('ID') || `${Date.now()}-${Math.random()}`,
      userId: row.get('ユーザーID') || '',
      name: row.get('名前') || '',
      email: row.get('メールアドレス') || '',
      provider: row.get('プロバイダー') || '',
      action: row.get('アクション') || '',
      timestamp: row.get('日時') || '',
      userAgent: row.get('User Agent') || '',
      imageUrl: row.get('画像URL') || ''
    }));

    return NextResponse.json({
      activities,
      total: rows.length,
      limit,
      offset
    });

  } catch (error) {
    console.error('ユーザー活動の取得エラー:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}