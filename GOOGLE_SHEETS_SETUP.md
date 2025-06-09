# 📊 Google Sheetsユーザー記録システム セットアップガイド

このガイドでは、Sunaアプリケーションでユーザーの登録・ログイン情報をGoogle Sheetsに自動記録する機能の設定方法を説明します。

## 🎯 概要

この機能により以下が自動記録されます：
- ✅ 新規ユーザー登録
- ✅ ログイン履歴
- ✅ ユーザー詳細情報（名前、メール、プロバイダーなど）
- ✅ タイムスタンプ
- ✅ ユーザーエージェント情報

## 📋 必要なもの

1. Googleアカウント
2. Google Cloud Platform（GCP）プロジェクト
3. Google Sheets API の有効化
4. サービスアカウントの作成

---

## 🚀 セットアップ手順

### ステップ1: Google Cloud Platform プロジェクトの作成

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成、または既存のプロジェクトを選択
3. プロジェクト名を控えておく

### ステップ2: Google Sheets API の有効化

1. Google Cloud Console で「APIとサービス」→「ライブラリ」を選択
2. "Google Sheets API" を検索して選択
3. 「有効にする」をクリック

### ステップ3: サービスアカウントの作成

1. 「APIとサービス」→「認証情報」を選択
2. 「認証情報を作成」→「サービスアカウント」を選択
3. サービスアカウント名を入力（例：`suna-sheets-recorder`）
4. 「作成して続行」をクリック
5. ロールは「編集者」を選択（または「Google Sheetsの編集者」）
6. 「完了」をクリック

### ステップ4: サービスアカウントキーの作成

1. 作成したサービスアカウントをクリック
2. 「キー」タブを選択
3. 「鍵を追加」→「新しい鍵を作成」
4. 「JSON」を選択して「作成」
5. **JSONファイルがダウンロードされます（安全に保管してください）**

### ステップ5: Google Sheets の作成

1. [Google Sheets](https://sheets.google.com/) でスプレッドシートを新規作成
2. スプレッドシートのURLから**スプレッドシートID**を取得
   ```
   https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
   ```
3. スプレッドシートをサービスアカウントと**共有**
   - 右上の「共有」ボタンをクリック
   - JSONファイル内の `client_email` を貼り付け
   - 「編集者」権限を付与

### ステップ6: 環境変数の設定

`.env.local` ファイルに以下を追加：

```env
# Google Sheets 記録用
GOOGLE_SHEETS_ID=your_spreadsheet_id_here
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account@project_name.iam.gserviceaccount.com  
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key_here\n-----END PRIVATE KEY-----"
```

**各値の取得方法：**

- `GOOGLE_SHEETS_ID`: スプレッドシートのURLから取得
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`: JSONファイルの `client_email` の値
- `GOOGLE_PRIVATE_KEY`: JSONファイルの `private_key` の値

---

## 🔧 JSONファイルからの値の取得

ダウンロードしたJSONファイルは以下のような構造です：

```json
{
  "type": "service_account",
  "project_id": "your-project-123456",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n",
  "client_email": "suna-sheets-recorder@your-project-123456.iam.gserviceaccount.com",
  "client_id": "123456789012345678901",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token"
}
```

**環境変数への設定：**
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` = `client_email` の値
- `GOOGLE_PRIVATE_KEY` = `private_key` の値（改行文字 `\n` を含めて）

---

## 📊 記録されるデータの構造

スプレッドシートには以下の列が自動作成されます：

| 列名 | 内容 | 例 |
|------|------|-----|
| ID | 一意識別子 | 1703123456789 |
| ユーザーID | ユーザーの固有ID | user_abc123 |
| 名前 | ユーザー名 | 田中太郎 |
| メールアドレス | ユーザーのメール | tanaka@example.com |
| プロバイダー | 認証方法 | google / credentials |
| アクション | 操作種類 | 新規登録 / ログイン |
| 日時 | 実行日時 | 2024-01-01T12:00:00.000Z |
| User Agent | ブラウザ情報 | Mozilla/5.0... |
| 画像URL | プロフィール画像 | https://... |

---

## 🔍 動作確認

1. アプリケーションを起動： `npm run dev`
2. ログイン・新規登録を実行
3. Google Sheets を確認
4. 管理者ダッシュボードを確認： `http://localhost:3000/admin`

---

## ⚠️ セキュリティ注意事項

1. **JSONファイルは絶対に公開しない**
2. **環境変数ファイル（.env.local）をgitに含めない**
3. **サービスアカウントキーは定期的に更新**
4. **本番環境では最小権限の原則を適用**

---

## 🛠️ トラブルシューティング

### エラー: "Configuration missing"
- 環境変数が正しく設定されているか確認
- .env.local ファイルが存在するか確認

### エラー: "Permission denied"
- スプレッドシートがサービスアカウントと共有されているか確認
- サービスアカウントに「編集者」権限があるか確認

### エラー: "Invalid key format"
- `GOOGLE_PRIVATE_KEY` の改行文字（\n）が正しく設定されているか確認
- ダブルクォートで囲まれているか確認

### データが記録されない
- Google Sheets API が有効になっているか確認
- サービスアカウントが作成されているか確認
- スプレッドシートIDが正しいか確認

---

## 📱 管理者ダッシュボード

設定完了後、以下のURLで統計情報を確認できます：
- **ダッシュボード**: `http://localhost:3000/admin`

ダッシュボードでは以下が確認できます：
- 📊 総ユーザー数
- 🔄 総ログイン数  
- 📋 総記録数

---

## 💡 応用例

- **マーケティング分析**: ユーザー登録のトレンド分析
- **セキュリティ監査**: 不正ログインの検出
- **ユーザー体験改善**: ログインパターンの分析
- **レポート作成**: 定期的な利用状況レポート

---

## 🔗 参考リンク

- [Google Sheets API Documentation](https://developers.google.com/sheets/api)
- [Google Cloud Service Accounts](https://cloud.google.com/iam/docs/service-accounts)
- [NextAuth.js Documentation](https://next-auth.js.org/)

---

**🎉 設定完了！これでユーザーアクションが自動的にGoogle Sheetsに記録されます！** 