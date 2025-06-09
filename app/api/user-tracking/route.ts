import { NextRequest, NextResponse } from 'next/server';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

interface UserTrackingData {
  userId: string;
  name: string;
  email: string;
  image?: string;
  provider: string;
  action: 'signup' | 'signin';
  timestamp: string;
  userAgent?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: UserTrackingData = await request.json();

    // Google Sheets の設定
    const GOOGLE_SHEETS_ID = process.env.GOOGLE_SHEETS_ID;
    const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!GOOGLE_SHEETS_ID || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
      console.log('Google Sheets credentials missing');
      return NextResponse.json({ error: 'Configuration missing' }, { status: 500 });
    }

    // Google Sheets API 認証
    const serviceAccountAuth = new JWT({
      email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: GOOGLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    // スプレッドシートに接続
    const doc = new GoogleSpreadsheet(GOOGLE_SHEETS_ID, serviceAccountAuth);
    await doc.loadInfo();

    // "UserTracking" シートを取得または作成
    let sheet = doc.sheetsByTitle['UserTracking'];
    if (!sheet) {
      sheet = await doc.addSheet({
        title: 'UserTracking',
        headerValues: [
          'ID',
          'ユーザーID',
          '名前',
          'メールアドレス',
          'プロバイダー',
          'アクション',
          '日時',
          'User Agent',
          '画像URL'
        ]
      });
    }

    // データを追加
    await sheet.addRow({
      'ID': Date.now().toString(),
      'ユーザーID': body.userId,
      '名前': body.name,
      'メールアドレス': body.email,
      'プロバイダー': body.provider,
      'アクション': body.action === 'signup' ? '新規登録' : 'ログイン',
      '日時': body.timestamp,
      'User Agent': body.userAgent || '',
      '画像URL': body.image || ''
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('User tracking error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ユーザー統計情報を取得
export async function GET() {
  try {
    const GOOGLE_SHEETS_ID = process.env.GOOGLE_SHEETS_ID;
    const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!GOOGLE_SHEETS_ID || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
      return NextResponse.json({ error: 'Configuration missing' }, { status: 500 });
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
      return NextResponse.json({ totalUsers: 0, totalLogins: 0 });
    }

    const rows = await sheet.getRows();
    const totalUsers = new Set(rows.map(row => row.get('ユーザーID'))).size;
    const totalLogins = rows.filter(row => row.get('アクション') === 'ログイン').length;

    return NextResponse.json({ totalUsers, totalLogins, totalRecords: rows.length });

  } catch (error) {
    console.error('Get stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 