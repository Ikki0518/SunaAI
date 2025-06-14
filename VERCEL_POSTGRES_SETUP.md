# Vercel Postgres セットアップガイド

このガイドでは、Sunaアプリケーションで使用するVercel Postgresデータベースのセットアップ方法を説明します。

## 1. Vercel Postgresの有効化

1. [Vercelダッシュボード](https://vercel.com/dashboard)にログイン
2. プロジェクトを選択
3. 「Storage」タブをクリック
4. 「Create Database」をクリック
5. 「Postgres」を選択
6. データベース名を入力（例：`suna-db`）
7. リージョンを選択（東京の場合は`nrt1`）
8. 「Create」をクリック

## 2. 環境変数の自動設定

Vercel Postgresを作成すると、以下の環境変数が自動的にプロジェクトに追加されます：

- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NO_SSL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_USER`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

## 3. データベースの初期化

### 本番環境での初期化

1. Vercelダッシュボードの「Storage」タブから作成したデータベースを選択
2. 「Query」タブをクリック
3. 以下のSQLを実行：

```sql
-- ユーザーテーブル
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ログイン履歴テーブル
CREATE TABLE IF NOT EXISTS login_history (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  action VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  date DATE DEFAULT CURRENT_DATE,
  user_agent TEXT,
  ip_address VARCHAR(45),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_date ON login_history(date);
CREATE INDEX IF NOT EXISTS idx_login_history_action ON login_history(action);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

### ローカル開発環境での初期化

1. `.env.local`ファイルにVercelから取得した環境変数をコピー
2. 以下のコマンドを実行：

```bash
npx tsx database/init-db.ts
```

## 4. 既存データの移行

既存のJSONファイルからデータを移行する場合：

1. 移行スクリプトを作成（`database/migrate-data.ts`）
2. 以下のコマンドで実行：

```bash
npx tsx database/migrate-data.ts
```

## 5. 動作確認

1. アプリケーションを再デプロイ
2. 管理者ダッシュボード（`/admin`）にアクセス
3. ユーザー統計が正しく表示されることを確認

## トラブルシューティング

### 接続エラーが発生する場合

1. 環境変数が正しく設定されているか確認
2. Vercelダッシュボードで「Environment Variables」を確認
3. ローカル開発の場合は`.env.local`を確認

### データが表示されない場合

1. データベースが初期化されているか確認
2. `users`テーブルと`login_history`テーブルが存在するか確認
3. デバッグ情報を確認（管理者ダッシュボードに表示）

## 注意事項

- Vercel Postgresは自動的にSSL接続を使用します
- 無料プランでは以下の制限があります：
  - ストレージ: 256MB
  - 計算時間: 60時間/月
  - 同時接続数: 5
- 本番環境では適切なバックアップ戦略を検討してください