# 📧 新規登録通知設定ガイド

このガイドでは、Sunaアプリケーションで新規登録者の通知を受け取るための設定方法を説明します。

## 🎯 機能概要

新規ユーザーが登録すると、以下の通知が自動送信されます：

- ✅ **メール通知**: 管理者のメールアドレスに詳細な通知
- ✅ **Slack通知**: Slackチャンネルにリアルタイム通知
- ✅ **Google Sheets記録**: スプレッドシートに自動記録
- ✅ **コンソールログ**: サーバーログに記録

## 📧 メール通知の設定

### 1. Gmail使用時の設定

#### ステップ1: 2段階認証の有効化
1. [Googleアカウント設定](https://myaccount.google.com/) にアクセス
2. 「セキュリティ」タブを選択
3. 「2段階認証プロセス」を有効化

#### ステップ2: アプリパスワードの生成
1. Googleアカウント設定の「セキュリティ」で「アプリパスワード」を選択
2. アプリを「メール」、デバイスを「その他（カスタム名）」で選択
3. 「Suna Notification」などの名前を入力
4. 生成された16文字のパスワードをコピー

#### ステップ3: 環境変数の設定
```bash
# .env.local に追加
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=generated-app-password
```

### 2. その他のメールプロバイダー

#### Outlook/Hotmail
```bash
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

#### Yahoo Mail
```bash
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yahoo.com
SMTP_PASS=your-app-password
```

#### カスタムSMTPサーバー
```bash
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-username
SMTP_PASS=your-password
```

## 📱 Slack通知の設定

### ステップ1: Slack Appの作成
1. [Slack API](https://api.slack.com/apps) にアクセス
2. 「Create New App」→「From scratch」を選択
3. アプリ名を「Suna Notifications」、ワークスペースを選択

### ステップ2: Incoming Webhookの有効化
1. 作成したアプリの設定画面で「Incoming Webhooks」を選択
2. 「Activate Incoming Webhooks」をオンに設定
3. 「Add New Webhook to Workspace」をクリック
4. 通知を送信するチャンネルを選択
5. 生成されたWebhook URLをコピー

### ステップ3: 環境変数の設定
```bash
# .env.local に追加
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

## 📊 Google Sheets連携の設定

新規登録者の情報をGoogle Sheetsに自動記録するには、[GOOGLE_SHEETS_SETUP.md](GOOGLE_SHEETS_SETUP.md) を参照してください。

## 🔧 設定の確認

### 1. 環境変数の確認
```bash
# .env.local の例
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000

# メール通知
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Slack通知（オプション）
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# Google Sheets（オプション）
GOOGLE_SHEETS_ID=your-spreadsheet-id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 2. アプリケーションの再起動
```bash
npm run dev
```

### 3. テスト登録
1. ブラウザで `http://localhost:3000` にアクセス
2. 新規アカウントを作成
3. 通知が送信されることを確認

## 📋 通知内容

### メール通知の内容
- **件名**: 🆕 Suna新規登録通知 - [ユーザー名]
- **内容**:
  - ユーザー名
  - メールアドレス
  - 登録日時
  - 管理ダッシュボードへのリンク

### Slack通知の内容
- **タイトル**: 🆕 新規ユーザー登録
- **フィールド**:
  - ユーザー名
  - メールアドレス
  - 登録日時
  - 管理ツールへのリンク

## 🛠️ トラブルシューティング

### メール送信が失敗する場合

#### 1. 認証エラー
```
Error: Invalid login: 535-5.7.8 Username and Password not accepted
```
**解決方法**: アプリパスワードが正しく設定されているか確認

#### 2. 接続エラー
```
Error: connect ECONNREFUSED
```
**解決方法**: SMTP設定（ホスト、ポート）を確認

#### 3. セキュリティエラー
```
Error: self signed certificate in certificate chain
```
**解決方法**: `SMTP_SECURE=false` に設定

### Slack通知が失敗する場合

#### 1. Webhook URLエラー
```
Error: 404 Not Found
```
**解決方法**: Webhook URLが正しく設定されているか確認

#### 2. 権限エラー
```
Error: channel_not_found
```
**解決方法**: Slackアプリがチャンネルに追加されているか確認

## 📈 ログの確認

### 成功時のログ
```
📧 [EMAIL] 新規登録通知を送信しました: admin@example.com
📱 [SLACK] 新規登録通知を送信しました
🔔 [NOTIFICATION] 通知送信完了: email: ✅ 成功, slack: ✅ 成功
```

### 失敗時のログ
```
📧 [EMAIL] SMTP設定が不完全です - コンソールログのみ出力
🆕 [新規登録通知] { userEmail: 'user@example.com', userName: 'Test User', ... }
```

## 🔒 セキュリティ考慮事項

### 1. 認証情報の保護
- `.env.local` ファイルをGitにコミットしない
- アプリパスワードを定期的に更新
- 不要になったWebhookを削除

### 2. 通知内容の制限
- 個人情報の最小限の送信
- 機密情報の除外
- ログの適切な管理

### 3. アクセス制御
- 管理者メールアドレスの適切な管理
- Slackチャンネルの権限設定
- 通知の送信先制限

## 📞 サポート

設定に関する質問や問題がある場合は、以下を確認してください：

1. **ログの確認**: コンソールログでエラーメッセージを確認
2. **環境変数**: 設定値が正しいか確認
3. **ネットワーク**: ファイアウォールやプロキシの設定確認
4. **プロバイダー設定**: メール・Slackプロバイダーの設定確認

---

**最終更新**: 2025年6月12日  
**バージョン**: 1.0.0