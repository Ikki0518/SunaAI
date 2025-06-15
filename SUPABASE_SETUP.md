# Supabase セットアップガイド

このガイドでは、Dify Safe ChatアプリケーションでSupabaseを使用してデータ管理を行うための設定方法を説明します。

## 1. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com)にアクセスしてアカウントを作成
2. 新しいプロジェクトを作成
3. プロジェクトのダッシュボードから以下の情報を取得：
   - Project URL
   - Anon Key
   - Service Role Key（Settings > API から取得）

## 2. データベーステーブルの作成

Supabaseのダッシュボードで、以下のSQLを実行してテーブルを作成します：

```sql
-- ユーザーテーブル（既存の場合はスキップ）
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ユーザーアクティビティテーブル
CREATE TABLE IF NOT EXISTS user_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- セキュリティイベントテーブル
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  email TEXT,
  user_id TEXT,
  details TEXT NOT NULL,
  ip_address TEXT,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ログイン履歴テーブル
CREATE TABLE IF NOT EXISTS login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  action TEXT CHECK (action IN ('signin', 'signout', 'failed')),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスの作成（パフォーマンス向上のため）
CREATE INDEX idx_user_activities_created_at ON user_activities(created_at DESC);
CREATE INDEX idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX idx_security_events_created_at ON security_events(created_at DESC);
CREATE INDEX idx_security_events_severity ON security_events(severity);
CREATE INDEX idx_login_history_created_at ON login_history(created_at DESC);
CREATE INDEX idx_login_history_user_id ON login_history(user_id);
CREATE INDEX idx_login_history_action ON login_history(action);
```

## 3. 環境変数の設定

`.env.local`ファイルに以下の環境変数を追加します：

```env
# Supabase設定
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 4. Row Level Security (RLS) の設定

セキュリティを強化するため、各テーブルにRLSポリシーを設定します：

```sql
-- RLSを有効化
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;

-- サービスロールキーを使用した場合のみ全アクセスを許可
CREATE POLICY "Service role full access" ON user_activities
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON security_events
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON login_history
  FOR ALL USING (auth.role() = 'service_role');
```

## 5. 動作確認

1. アプリケーションを再起動
   ```bash
   npm run dev
   ```

2. 管理者ダッシュボード（`/admin/dashboard`）にアクセス

3. 以下の機能が正常に動作することを確認：
   - 統計情報の表示
   - ユーザーアクティビティの記録と表示
   - セキュリティイベントの記録と表示
   - ログイン履歴の記録

## 6. データの移行（オプション）

既存のローカルファイルからSupabaseにデータを移行する場合：

```javascript
// migration-script.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// セキュリティイベントの移行
async function migrateSecurityEvents() {
  const data = JSON.parse(fs.readFileSync('./data/security-events.json', 'utf8'));
  
  for (const event of data) {
    await supabase.from('security_events').insert({
      type: event.type,
      email: event.email,
      details: event.details,
      ip_address: event.ipAddress,
      severity: event.severity,
      created_at: event.timestamp
    });
  }
}

// 実行
migrateSecurityEvents().then(() => console.log('Migration completed'));
```

## 7. トラブルシューティング

### 接続エラーが発生する場合
- Supabase URLとキーが正しく設定されているか確認
- プロジェクトがアクティブな状態か確認

### データが表示されない場合
- RLSポリシーが正しく設定されているか確認
- Service Role Keyを使用しているか確認

### パフォーマンスが遅い場合
- インデックスが作成されているか確認
- クエリの最適化を検討

## 8. セキュリティのベストプラクティス

1. **環境変数の管理**
   - Service Role Keyは絶対にクライアントサイドで使用しない
   - 本番環境では環境変数を安全に管理

2. **RLSの活用**
   - 必要最小限のアクセス権限を設定
   - 定期的にポリシーを見直し

3. **監査ログ**
   - すべての重要な操作をログに記録
   - 定期的にログを確認

## サポート

問題が発生した場合は、以下を確認してください：
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord Community](https://discord.supabase.com)