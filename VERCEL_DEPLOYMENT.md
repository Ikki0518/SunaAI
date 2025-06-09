# Vercel デプロイメント設定手順

## 環境変数の設定

Vercelダッシュボードで以下の環境変数を設定してください：

### 必須の環境変数

```bash
# NextAuth設定
NEXTAUTH_URL=https://suna-ai-nine.vercel.app
NEXTAUTH_SECRET=W531qB+DK+bViikPRYoS3zd5zVjdrVZ5I977pkV7pLs=

# Dify API設定（必須）
DIFY_API_KEY=your_actual_dify_api_key
DIFY_API_BASE_URL=https://api.dify.ai/v1
```

### 任意の環境変数（機能を有効にする場合に設定）

```bash
# Google OAuth（Googleログインを有効にする場合）
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Google Sheets（ユーザートラッキングを有効にする場合）
GOOGLE_SHEETS_ID=your_google_sheets_id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account_email
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key\n-----END PRIVATE KEY-----\n"
```

## Vercelでの設定手順

1. Vercelダッシュボードにアクセス
2. プロジェクト「suna-ai-nine」を選択
3. 「Settings」タブに移動
4. 「Environment Variables」を選択
5. 上記の環境変数を一つずつ追加

## 重要な注意事項

- **NEXTAUTH_SECRET**: 必須です。上記の値をそのまま使用してください
- **NEXTAUTH_URL**: 本番環境のURLに変更してください
- **DIFY_API_KEY**: 実際のDify APIキーに置き換えてください
- **GOOGLE_PRIVATE_KEY**: 改行文字を含む場合は、ダブルクォートで囲んでください

## デプロイ後の確認

環境変数を設定した後：
1. Vercelで手動再デプロイを実行
2. または、GitHubリポジトリにpushしてトリガー
3. アプリケーションが正常に動作することを確認

## エラーが発生した場合

- Vercelの「Functions」タブでログを確認
- 環境変数が正しく設定されているか確認
- 必要に応じて値を更新して再デプロイ

## 現在のデプロイ状況

- URL: https://suna-ai-nine.vercel.app
- 設定済み: NEXTAUTH_SECRET, NEXTAUTH_URL, DIFY_API_KEY
- 未設定: Google OAuth, Google Sheets（任意） 