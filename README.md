# Suna - AIチャットアプリケーション

Dify AIと統合されたモダンなチャットアプリケーション。Googleログインと自動ユーザー追跡機能を備えています。

## 機能

- 🤖 Dify AI APIとの統合
- 🔐 NextAuth.js によるGoogleログイン認証
- 💾 チャット履歴の自動保存
- 📊 Googleスプレッドシートへのユーザー活動記録
- 🎨 Apple風のモダンなUI
- 📱 レスポンシブデザイン

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
# または
yarn install
```

### 2. 環境変数の設定

`.env.example`をコピーして`.env.local`を作成し、以下の値を設定：

```bash
# NextAuth設定
NEXTAUTH_URL=http://localhost:3000  # 本番環境では実際のドメインに変更
NEXTAUTH_SECRET=your_secret_here

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Dify API
DIFY_API_URL=https://api.dify.ai/v1
DIFY_API_KEY=your_dify_api_key

# Google Sheets記録用（オプション）
GOOGLE_SHEETS_ID=your_sheets_id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key\n-----END PRIVATE KEY-----"
```

### 3. 開発サーバーの起動

```bash
npm run dev
# または
yarn dev
```

[http://localhost:3000](http://localhost:3000) でアプリにアクセスできます。

## 本番環境でのデプロイ

### Google OAuth設定

1. [Google Cloud Console](https://console.cloud.google.com) にアクセス
2. 「認証情報」→「OAuth 2.0 クライアント ID」を選択
3. 承認済みリダイレクト URI に本番ドメインを追加：
   ```
   https://your-domain.com/api/auth/callback/google
   ```

### 環境変数の更新

本番環境では以下の環境変数を適切に設定：
- `NEXTAUTH_URL`: 実際のドメイン（例：`https://your-domain.com`）
- `GOOGLE_CLIENT_SECRET`: 実際のGoogle OAuth クライアントシークレット
- その他の API キーも本番用の値に更新

### Vercelでのデプロイ

1. Vercelアカウントにログイン
2. GitHubリポジトリを接続
3. 環境変数を設定
4. デプロイ実行

詳細は [Next.js デプロイメントドキュメント](https://nextjs.org/docs/app/building-your-application/deploying) を参照。

## 技術スタック

- **フレームワーク**: Next.js 14 (App Router)
- **認証**: NextAuth.js
- **UI**: Tailwind CSS
- **TypeScript**: 完全サポート
- **API統合**: Dify AI, Google Sheets API
