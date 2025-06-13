import { google } from 'googleapis';

interface UserRegistrationData {
  email: string;
  name: string;
  registrationDate: string;
  loginMethod: string;
}

export class GoogleSheetsService {
  private sheets: any;
  private spreadsheetId: string;

  constructor() {
    this.spreadsheetId = process.env.GOOGLE_SHEETS_ID || '';
    
    if (!this.spreadsheetId) {
      console.warn('Google Sheets ID not configured');
      return;
    }

    try {
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      this.sheets = google.sheets({ version: 'v4', auth });
    } catch (error) {
      console.error('Google Sheets認証エラー:', error);
    }
  }

  async addUserRegistration(userData: UserRegistrationData): Promise<boolean> {
    if (!this.sheets || !this.spreadsheetId) {
      console.warn('Google Sheets未設定のため、スキップします');
      return false;
    }

    try {
      // ヘッダー行が存在するかチェック
      await this.ensureHeaderExists();

      // 新しい行を追加
      const values = [
        [
          userData.registrationDate,
          userData.email,
          userData.name,
          userData.loginMethod,
          '新規登録',
          new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
        ]
      ];

      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'ユーザー登録!A:F',
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: values,
        },
      });

      console.log('Google Sheetsに登録データを追加しました:', response.data);
      return true;
    } catch (error) {
      console.error('Google Sheetsへの書き込みエラー:', error);
      return false;
    }
  }

  private async ensureHeaderExists(): Promise<void> {
    try {
      // シートの最初の行を取得
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'ユーザー登録!A1:F1',
      });

      // ヘッダーが存在しない場合は作成
      if (!response.data.values || response.data.values.length === 0) {
        const headerValues = [
          [
            '登録日時',
            'メールアドレス',
            '名前',
            'ログイン方法',
            'ステータス',
            '記録日時'
          ]
        ];

        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: 'ユーザー登録!A1:F1',
          valueInputOption: 'USER_ENTERED',
          resource: {
            values: headerValues,
          },
        });

        console.log('Google Sheetsにヘッダー行を作成しました');
      }
    } catch (error) {
      console.error('ヘッダー確認エラー:', error);
    }
  }

  async logActivity(activity: {
    email: string;
    action: string;
    details?: string;
    timestamp: string;
  }): Promise<boolean> {
    if (!this.sheets || !this.spreadsheetId) {
      return false;
    }

    try {
      // アクティビティログシートにヘッダーを確保
      await this.ensureActivityHeaderExists();

      const values = [
        [
          activity.timestamp,
          activity.email,
          activity.action,
          activity.details || '',
          new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
        ]
      ];

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'アクティビティログ!A:E',
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: values,
        },
      });

      return true;
    } catch (error) {
      console.error('アクティビティログエラー:', error);
      return false;
    }
  }

  private async ensureActivityHeaderExists(): Promise<void> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'アクティビティログ!A1:E1',
      });

      if (!response.data.values || response.data.values.length === 0) {
        const headerValues = [
          [
            'タイムスタンプ',
            'メールアドレス',
            'アクション',
            '詳細',
            '記録日時'
          ]
        ];

        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: 'アクティビティログ!A1:E1',
          valueInputOption: 'USER_ENTERED',
          resource: {
            values: headerValues,
          },
        });
      }
    } catch (error) {
      console.error('アクティビティヘッダー確認エラー:', error);
    }
  }
}

// シングルトンインスタンス
export const googleSheetsService = new GoogleSheetsService();