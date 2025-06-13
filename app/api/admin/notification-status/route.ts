import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';

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

    // 各通知機能の設定状況をチェック
    const notificationStatus = {
      email: {
        enabled: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        user: process.env.SMTP_USER || '',
        configured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
        details: {
          host: process.env.SMTP_HOST ? '✅ 設定済み' : '❌ 未設定',
          port: process.env.SMTP_PORT ? '✅ 設定済み' : '❌ 未設定',
          user: process.env.SMTP_USER ? '✅ 設定済み' : '❌ 未設定',
          pass: process.env.SMTP_PASS ? '✅ 設定済み' : '❌ 未設定',
        }
      },
      slack: {
        enabled: !!process.env.SLACK_WEBHOOK_URL,
        webhookUrl: process.env.SLACK_WEBHOOK_URL ? '設定済み' : '未設定',
        configured: !!process.env.SLACK_WEBHOOK_URL
      },
      googleSheets: {
        enabled: !!(process.env.GOOGLE_SHEETS_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY),
        sheetsId: process.env.GOOGLE_SHEETS_ID ? '設定済み' : '未設定',
        serviceAccount: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? '設定済み' : '未設定',
        privateKey: process.env.GOOGLE_PRIVATE_KEY ? '設定済み' : '未設定',
        configured: !!(process.env.GOOGLE_SHEETS_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY)
      },
      adminEmails: ['ikki_y0518@icloud.com', 'ikkiyamamoto0518@gmail.com'],
      summary: {
        totalConfigured: 0,
        totalAvailable: 3,
        recommendations: [] as Array<{
          type: string;
          priority: string;
          title: string;
          description: string;
          action: string;
        }>
      }
    };

    // 設定済み機能の数をカウント
    let configuredCount = 0;
    if (notificationStatus.email.configured) configuredCount++;
    if (notificationStatus.slack.configured) configuredCount++;
    if (notificationStatus.googleSheets.configured) configuredCount++;

    notificationStatus.summary.totalConfigured = configuredCount;

    // 推奨事項を生成
    const recommendations = [];
    
    if (!notificationStatus.email.configured) {
      recommendations.push({
        type: 'email',
        priority: 'high',
        title: 'メール通知の設定',
        description: 'SMTP設定を行うことで、新規登録者の通知をメールで受け取れます',
        action: 'EMAIL_NOTIFICATION_SETUP.mdを参照して設定してください'
      });
    }

    if (!notificationStatus.googleSheets.configured) {
      recommendations.push({
        type: 'sheets',
        priority: 'high',
        title: 'Google Sheets連携の設定',
        description: 'ユーザー活動の詳細ログを自動記録できます',
        action: 'GOOGLE_SHEETS_SETUP.mdを参照して設定してください'
      });
    }

    if (!notificationStatus.slack.configured) {
      recommendations.push({
        type: 'slack',
        priority: 'medium',
        title: 'Slack通知の設定',
        description: 'チームでリアルタイムに新規登録を共有できます',
        action: 'Slack Webhook URLを設定してください'
      });
    }

    if (configuredCount === 0) {
      recommendations.push({
        type: 'general',
        priority: 'critical',
        title: '通知機能が未設定です',
        description: '新規登録者の通知を受け取るために、少なくとも1つの通知方法を設定することを強く推奨します',
        action: 'メール通知またはGoogle Sheets連携の設定を行ってください'
      });
    }

    notificationStatus.summary.recommendations = recommendations;

    return NextResponse.json(notificationStatus);

  } catch (error) {
    console.error('通知設定状況の取得エラー:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}