import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // 管理者認証チェック
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || session.user.email !== 'ikkiyamamoto0518@gmail.com') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 環境変数の存在チェック
    const sheetsId = process.env.GOOGLE_SHEETS_ID;
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;

    const isConfigured = !!(sheetsId && serviceAccountEmail && privateKey);
    
    // 設定状況の詳細
    const configStatus = {
      sheetsId: !!sheetsId,
      serviceAccountEmail: !!serviceAccountEmail,
      privateKey: !!privateKey,
    };

    // 接続テスト（設定されている場合のみ）
    let connectionTest = null;
    if (isConfigured) {
      try {
        const { googleSheetsService } = await import('@/app/lib/googleSheets');
        // 簡単な接続テスト（実際にはAPIを呼ばない）
        connectionTest = {
          status: 'ready',
          message: 'Google Sheets連携が設定されています'
        };
      } catch (error) {
        connectionTest = {
          status: 'error',
          message: 'Google Sheets連携でエラーが発生しています'
        };
      }
    }

    return NextResponse.json({
      isConfigured,
      configStatus,
      connectionTest,
      setupGuide: '/GOOGLE_SHEETS_SETUP.md'
    });

  } catch (error) {
    console.error('Google Sheets状態チェックエラー:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}