# Google Sheets連携設定手順

## 📋 概要
新規ユーザー登録とアクティビティログをGoogle Sheetsに自動記録するための設定手順です。

## 🚀 設定手順

### 1. Google Cloud Platformでプロジェクトを作成

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成（例：`suna-user-tracking`）
3. プロジェクトを選択

### 2. Google Sheets APIを有効化

1. 左側メニューから「APIとサービス」→「ライブラリ」
2. 「Google Sheets API」を検索
3. 「有効にする」をクリック

### 3. サービスアカウントを作成

1. 「APIとサービス」→「認証情報」
2. 「認証情報を作成」→「サービスアカウント」
3. サービスアカウント名を入力（例：`sheets-service-account`）
4. 「作成して続行」をクリック
5. ロールは設定不要（「完了」をクリック）

### 4. サービスアカウントキーを生成

1. 作成したサービスアカウントをクリック
2. 「キー」タブ→「鍵を追加」→「新しい鍵を作成」
3. 「JSON」を選択して「作成」
4. JSONファイルがダウンロードされます

### 5. Google Sheetsを作成・共有

1. [Google Sheets](https://sheets.google.com/) で新しいスプレッドシートを作成
2. スプレッドシート名を設定（例：`Suna ユーザー管理`）
3. URLからスプレッドシートIDを取得
   ```
   https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
   ```
4. 「共有」ボタンをクリック
5. サービスアカウントのメールアドレス（JSONファイル内の`client_email`）を追加
6. 権限を「編集者」に設定

### 6. シートを準備

以下の2つのシートを作成してください：

#### シート1: `ユーザー登録`
- A1: 登録日時
- B1: メールアドレス  
- C1: 名前
- D1: ログイン方法
- E1: ステータス
- F1: 記録日時

#### シート2: `アクティビティログ`
- A1: タイムスタンプ
- B1: メールアドレス
- C1: アクション
- D1: 詳細
- E1: 記録日時

### 7. 環境変数を設定

`.env.local` ファイルを以下のように更新：

```bash
# Google Sheets連携設定
GOOGLE_SHEETS_ID=your-actual-spreadsheet-id-here
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-actual-private-key-here\n-----END PRIVATE KEY-----"
```

**重要な注意点：**
- `GOOGLE_SHEETS_ID`: スプレッドシートのURLから取得したID
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`: JSONファイルの`client_email`の値
- `GOOGLE_PRIVATE_KEY`: JSONファイルの`private_key`の値（改行文字 `\n` を含む）

### 8. 動作確認

1. アプリケーションを再起動
   ```bash
   npm run dev
   ```

2. 新規ユーザー登録を実行

3. Google Sheetsを確認して以下が記録されているかチェック：
   - `ユーザー登録` シートに新規登録データ
   - `アクティビティログ` シートにログイン履歴

## 🔧 トラブルシューティング

### よくあるエラー

#### 1. 認証エラー
```
Google Sheets認証エラー
```
**解決方法：**
- サービスアカウントのメールアドレスがスプレッドシートに共有されているか確認
- 環境変数が正しく設定されているか確認

#### 2. スプレッドシートが見つからない
```
The caller does not have permission
```
**解決方法：**
- スプレッドシートIDが正しいか確認
- サービスアカウントに編集権限があるか確認

#### 3. プライベートキーエラー
```
invalid_grant
```
**解決方法：**
- `GOOGLE_PRIVATE_KEY` の改行文字が正しく設定されているか確認
- JSONファイルから直接コピーして設定

## 📊 記録される情報

### ユーザー登録シート
- 登録日時
- メールアドレス
- ユーザー名
- ログイン方法（credentials/google）
- ステータス（新規登録）
- 記録日時

### アクティビティログシート
- タイムスタンプ
- メールアドレス
- アクション（ログイン/Google OAuth ログイン）
- 詳細情報
- 記録日時

## 🔒 セキュリティ注意事項

1. **JSONキーファイルの管理**
   - JSONファイルは安全な場所に保管
   - Gitにコミットしない（`.gitignore`に追加）

2. **環境変数の保護**
   - 本番環境では適切な環境変数管理サービスを使用
   - プライベートキーは暗号化して保存

3. **アクセス権限**
   - サービスアカウントには最小限の権限のみ付与
   - 定期的にアクセスログを確認

## 📞 サポート

設定でお困りの場合は、以下の情報をお知らせください：
- エラーメッセージ
- 設定した環境変数（プライベートキー以外）
- Google Cloud Consoleのスクリーンショット