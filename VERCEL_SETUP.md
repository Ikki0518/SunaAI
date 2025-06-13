# Vercel環境変数設定ガイド

## 本番環境で管理者機能を有効にするための設定

### 必要な環境変数

Vercelダッシュボードで以下の環境変数を設定してください：

#### 1. 管理者認証情報
```
ADMIN_EMAIL=ikki_y0518@icloud.com
ADMIN_PASSWORD=admin123
ADMIN_NAME=いっき
```

#### 2. フロントエンド用管理者メール（公開用）
```
NEXT_PUBLIC_ADMIN_EMAIL=ikki_y0518@icloud.com
```

#### 3. NextAuth設定
```
NEXTAUTH_URL=https://suna-ai-nine.vercel.app
NEXTAUTH_SECRET=your-secret-key-here
```

### 設定手順

1. **Vercelダッシュボードにアクセス**
   - https://vercel.com/dashboard にログイン
   - プロジェクト「suna-ai-nine」を選択

2. **環境変数の設定**
   - 「Settings」タブをクリック
   - 「Environment Variables」セクションを選択
   - 上記の環境変数を一つずつ追加

3. **デプロイメントの再実行**
   - 「Deployments」タブに移動
   - 最新のデプロイメントの「...」メニューから「Redeploy」を選択

### 環境変数の説明

- **ADMIN_EMAIL**: 管理者のメールアドレス
- **ADMIN_PASSWORD**: 管理者のパスワード（平文）
- **ADMIN_NAME**: 管理者の表示名
- **NEXT_PUBLIC_ADMIN_EMAIL**: クライアントサイドで使用する管理者メール
- **NEXTAUTH_URL**: 本番環境のURL
- **NEXTAUTH_SECRET**: NextAuthのシークレットキー

### セキュリティ注意事項

1. **NEXTAUTH_SECRET**は十分に長く複雑な文字列を使用してください
2. **ADMIN_PASSWORD**は強力なパスワードに変更することを推奨します
3. 環境変数は本番環境でのみ設定し、開発環境では`.env.local`を使用してください

### トラブルシューティング

#### 管理者ボタンが表示されない場合
1. 環境変数が正しく設定されているか確認
2. デプロイメントが完了しているか確認
3. ブラウザのキャッシュをクリア

#### ログインできない場合
1. `ADMIN_EMAIL`と`ADMIN_PASSWORD`が正しく設定されているか確認
2. `NEXTAUTH_URL`が正しい本番URLに設定されているか確認
3. `NEXTAUTH_SECRET`が設定されているか確認

### 確認方法

設定完了後、以下の手順で動作確認：

1. https://suna-ai-nine.vercel.app にアクセス
2. 設定したメールアドレスとパスワードでログイン
3. ヘッダーに紫色の「管理者」ボタンが表示されることを確認
4. 管理者ボタンから統計ダッシュボードにアクセスできることを確認