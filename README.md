# Suna - AI チャットアプリケーション

安全で高機能なAIチャットアプリケーションです。メールアドレス認証、管理者ダッシュボード、セキュリティ機能を備えています。

## 🚀 機能

### ユーザー機能
- **メールアドレス認証**: 安全なログイン・新規登録
- **AIチャット**: Dify APIを使用した高品質な対話
- **プロフィール管理**: ユーザー情報の編集
- **レスポンシブデザイン**: モバイル・デスクトップ対応

### 管理者機能
- **ユーザー統計ダッシュボード**: 総ユーザー数、総ログイン数、今日のログイン数、今日の新規登録数の表示
- **高度な管理ツール**: リアルタイム監視、セキュリティイベント管理
- **ユーザー管理**: 個別ユーザー削除、詳細情報表示
- **セキュリティ監視**: 失敗ログイン試行の追跡
- **ローカル統計システム**: Google Sheetsに依存しない安定した統計データ取得

### セキュリティ機能
- **アカウントロック**: 複数回の失敗ログイン試行を自動ブロック
- **パスワード強度チェック**: 安全なパスワードの強制
- **セキュリティヘッダー**: XSS、CSRF攻撃の防止
- **管理者権限制御**: 特定のメールアドレスのみ管理者アクセス可能

## 🛠️ 技術スタック

- **フレームワーク**: Next.js 15 (App Router)
- **認証**: NextAuth.js
- **スタイリング**: Tailwind CSS
- **データベース**: JSON ファイル (軽量実装)
- **デプロイ**: Vercel
- **言語**: TypeScript

## 📦 デプロイ手順

### 1. Vercelでのデプロイ

1. **GitHubリポジトリの準備**
   ```bash
   git add .
   git commit -m "統計機能改善とVercelデプロイ準備完了"
   git push origin main
   ```
   
   リポジトリ: `https://github.com/Ikki0518/SunaAI`

2. **Vercelでプロジェクトをインポート**
   - [Vercel Dashboard](https://vercel.com/dashboard) にアクセス
   - "New Project" をクリック
   - GitHubリポジトリ `Ikki0518/SunaAI` を選択
   - プロジェクト名: `suna-ai` (推奨)

3. **環境変数の設定**
   Vercelの環境変数設定で以下を追加：

   ```env
   # 必須設定
   NEXTAUTH_URL=https://your-domain.vercel.app
   NEXTAUTH_SECRET=fMSncwyljnw9mbm9Iz3LOpiHhqcPNpxRx/mvSe0wopY=
   DIFY_API_URL=https://api.dify.ai/v1
   DIFY_API_KEY=your_dify_api_key_here

   # オプション設定
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_SHEETS_ID=your_google_sheets_id
   GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account@project.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key_here\n-----END PRIVATE KEY-----"
   ```

4. **デプロイ実行**
   - "Deploy" ボタンをクリック
   - 自動ビルド・デプロイが開始されます

### 2. 管理者アカウントの設定

デプロイ後、管理者アクセスを設定：

1. **管理者メールアドレスの変更**
   `app/admin/page.tsx` の19-20行目を編集：
   ```typescript
   const isAdmin = session?.user?.email === 'your-admin@email.com' ||
                   session?.user?.email === 'your-second-admin@email.com';
   ```

2. **初回ログイン**
   - アプリにアクセスして新規登録
   - 管理者メールアドレスでアカウント作成
   - `/admin` にアクセスして管理機能を確認

## 🔧 ローカル開発

```bash
# 依存関係のインストール
npm install

# 環境変数の設定
cp env.example .env.local
# .env.local を編集して必要な値を設定

# 開発サーバーの起動
npm run dev
```

## 📊 管理者ダッシュボード

### アクセス方法
1. 管理者アカウントでログイン
2. `/admin` - 基本統計ダッシュボード
3. `/admin/dashboard` - 高度な管理ツール

### 利用可能な機能
- **ユーザー統計**: 総ユーザー数、総ログイン数、今日のログイン数、今日の新規登録数
- **ユーザー管理**: 個別削除、詳細情報表示
- **セキュリティ監視**: 失敗ログイン試行の追跡
- **リアルタイム監視**: アクティブユーザー数
- **ローカル統計**: ログイン履歴の永続化とリアルタイム更新

## 🔒 セキュリティ設定

### パスワードポリシー
- 最小6文字
- 英数字の組み合わせ推奨

### アカウントロック
- 5回の失敗ログイン試行で15分間ロック
- 管理者ダッシュボードで監視可能

### 管理者権限
- 特定のメールアドレスのみアクセス可能
- コード内で直接指定（データベース不要）

## 📝 ライセンス

MIT License

## 🤝 サポート

問題や質問がある場合は、GitHubのIssuesでお知らせください。
