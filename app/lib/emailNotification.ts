import nodemailer from 'nodemailer';

// メール設定の型定義
interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

// 新規登録通知メールの送信
export async function sendNewUserNotification(
  userEmail: string,
  userName: string,
  registrationDate: string
): Promise<boolean> {
  try {
    // 環境変数からメール設定を取得
    const emailConfig: EmailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    };

    // 管理者メールアドレス
    const adminEmails = [
      'ikki_y0518@icloud.com',
      'ikkiyamamoto0518@gmail.com'
    ];

    // メール設定が不完全な場合はログのみ出力
    if (!emailConfig.auth.user || !emailConfig.auth.pass) {
      console.log('📧 [EMAIL] SMTP設定が不完全です - コンソールログのみ出力');
      console.log('🆕 [新規登録通知]', {
        userEmail,
        userName,
        registrationDate,
        adminEmails
      });
      return false;
    }

    // Nodemailerトランスポーターを作成
    const transporter = nodemailer.createTransport(emailConfig);

    // メール内容を作成
    const subject = `🆕 Suna新規登録通知 - ${userName}`;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .info-box { background: white; padding: 15px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #667eea; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          .emoji { font-size: 24px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1><span class="emoji">🌟</span> Suna新規登録通知</h1>
          </div>
          <div class="content">
            <p>新しいユーザーがSunaに登録しました！</p>
            
            <div class="info-box">
              <h3>📋 登録情報</h3>
              <p><strong>👤 ユーザー名:</strong> ${userName}</p>
              <p><strong>📧 メールアドレス:</strong> ${userEmail}</p>
              <p><strong>📅 登録日時:</strong> ${registrationDate}</p>
            </div>

            <div class="info-box">
              <h3>🔗 管理ツール</h3>
              <p>詳細な情報は管理ダッシュボードで確認できます：</p>
              <p><a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/admin/dashboard" style="color: #667eea;">管理ダッシュボードを開く</a></p>
            </div>

            <div class="info-box">
              <h3>📊 現在の統計</h3>
              <p>この通知は自動送信されています。Google Sheets連携が設定されている場合、詳細な活動ログも記録されます。</p>
            </div>
          </div>
          <div class="footer">
            <p>このメールはSunaシステムから自動送信されています。</p>
            <p>送信日時: ${new Date().toLocaleString('ja-JP')}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
🆕 Suna新規登録通知

新しいユーザーがSunaに登録しました！

📋 登録情報:
👤 ユーザー名: ${userName}
📧 メールアドレス: ${userEmail}
📅 登録日時: ${registrationDate}

🔗 管理ツール:
管理ダッシュボード: ${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/admin/dashboard

このメールはSunaシステムから自動送信されています。
送信日時: ${new Date().toLocaleString('ja-JP')}
    `;

    // 各管理者にメールを送信
    const emailPromises = adminEmails.map(async (adminEmail) => {
      try {
        await transporter.sendMail({
          from: `"Suna System" <${emailConfig.auth.user}>`,
          to: adminEmail,
          subject,
          text: textContent,
          html: htmlContent,
        });
        console.log(`📧 [EMAIL] 新規登録通知を送信しました: ${adminEmail}`);
        return true;
      } catch (error) {
        console.error(`📧 [EMAIL] 送信失敗 (${adminEmail}):`, error);
        return false;
      }
    });

    const results = await Promise.all(emailPromises);
    const successCount = results.filter(Boolean).length;
    
    console.log(`📧 [EMAIL] 通知送信完了: ${successCount}/${adminEmails.length}件成功`);
    return successCount > 0;

  } catch (error) {
    console.error('📧 [EMAIL] メール送信エラー:', error);
    return false;
  }
}

// Slack通知（オプション）
export async function sendSlackNotification(
  userEmail: string,
  userName: string,
  registrationDate: string
): Promise<boolean> {
  try {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    
    if (!webhookUrl) {
      console.log('📱 [SLACK] Webhook URL未設定 - Slack通知をスキップ');
      return false;
    }

    const message = {
      text: "🆕 Suna新規登録通知",
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "🆕 新規ユーザー登録"
          }
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*👤 ユーザー名:*\n${userName}`
            },
            {
              type: "mrkdwn",
              text: `*📧 メールアドレス:*\n${userEmail}`
            },
            {
              type: "mrkdwn",
              text: `*📅 登録日時:*\n${registrationDate}`
            },
            {
              type: "mrkdwn",
              text: `*🔗 管理ツール:*\n<${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/admin/dashboard|ダッシュボードを開く>`
            }
          ]
        }
      ]
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (response.ok) {
      console.log('📱 [SLACK] 新規登録通知を送信しました');
      return true;
    } else {
      console.error('📱 [SLACK] 送信失敗:', response.status, response.statusText);
      return false;
    }

  } catch (error) {
    console.error('📱 [SLACK] Slack通知エラー:', error);
    return false;
  }
}

// 統合通知関数
export async function notifyNewUserRegistration(
  userEmail: string,
  userName: string,
  userId: string
): Promise<void> {
  const registrationDate = new Date().toLocaleString('ja-JP');
  
  console.log('🔔 [NOTIFICATION] 新規登録通知を開始:', {
    userEmail,
    userName,
    userId,
    registrationDate
  });

  // 並行してメール・Slack通知を送信
  const [emailSent, slackSent] = await Promise.all([
    sendNewUserNotification(userEmail, userName, registrationDate),
    sendSlackNotification(userEmail, userName, registrationDate)
  ]);

  console.log('🔔 [NOTIFICATION] 通知送信完了:', {
    email: emailSent ? '✅ 成功' : '❌ 失敗',
    slack: slackSent ? '✅ 成功' : '❌ 失敗'
  });
}