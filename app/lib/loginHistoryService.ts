import fs from 'fs';
import path from 'path';
import { recordLoginHistory, recordUserActivity } from './supabase';

interface LoginRecord {
  userId: string;
  email: string;
  name: string;
  action: 'signin' | 'signup';
  timestamp: string;
  date: string; // YYYY-MM-DD format
}

class LoginHistoryService {
  private filePath: string;

  constructor() {
    this.filePath = path.join(process.cwd(), 'data', 'login-history.json');
  }

  private ensureFileExists(): void {
    try {
      if (!fs.existsSync(this.filePath)) {
        fs.writeFileSync(this.filePath, '[]', 'utf8');
      }
    } catch (error) {
      console.error('ログイン履歴ファイルの作成に失敗:', error);
    }
  }

  private readHistory(): LoginRecord[] {
    try {
      this.ensureFileExists();
      const data = fs.readFileSync(this.filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('ログイン履歴の読み込みに失敗:', error);
      return [];
    }
  }

  private writeHistory(records: LoginRecord[]): void {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(records, null, 2), 'utf8');
    } catch (error) {
      console.error('ログイン履歴の書き込みに失敗:', error);
    }
  }

  public async recordLogin(userId: string, email: string, name: string, action: 'signin' | 'signup'): Promise<void> {
    try {
      const now = new Date();
      const timestamp = now.toISOString();
      const date = now.toISOString().split('T')[0]; // YYYY-MM-DD

      const record: LoginRecord = {
        userId,
        email,
        name,
        action,
        timestamp,
        date
      };

      // Supabaseに記録
      if (action === 'signin' || action === 'signup') {
        await recordLoginHistory(
          userId,
          email,
          action === 'signup' ? 'signin' : action, // signupの場合もsigninとして記録
          undefined, // IPアドレスは後で追加
          undefined  // User-Agentは後で追加
        );

        // ユーザーアクティビティも記録
        await recordUserActivity(
          userId,
          email,
          action === 'signup' ? 'アカウント作成' : 'ログイン',
          `${name}がシステムに${action === 'signup' ? '新規登録' : 'ログイン'}しました`
        );
      }

      // ローカルファイルにも記録（バックアップとして）
      const history = this.readHistory();
      history.push(record);
      this.writeHistory(history);

      console.log(`🐛 [DEBUG] ログイン履歴を記録: ${action} - ${email}`);
    } catch (error) {
      console.error('ログイン履歴の記録に失敗:', error);
    }
  }

  public getStats() {
    try {
      const history = this.readHistory();
      const today = new Date().toISOString().split('T')[0];

      // 総ログイン数（サインインのみ）
      const totalLogins = history.filter(record => record.action === 'signin').length;

      // 今日のログイン数
      const todayLogins = history.filter(record => 
        record.date === today && record.action === 'signin'
      ).length;

      // 今日の新規登録数
      const todaySignups = history.filter(record => 
        record.date === today && record.action === 'signup'
      ).length;

      // 過去7日間のアクティブユーザー数
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

      const activeUserIds = new Set();
      history.forEach(record => {
        if (record.date >= sevenDaysAgoStr && record.action === 'signin') {
          activeUserIds.add(record.userId);
        }
      });

      return {
        totalLogins,
        todayLogins,
        todaySignups,
        activeUsers: activeUserIds.size,
        totalRecords: history.length
      };
    } catch (error) {
      console.error('統計情報の取得に失敗:', error);
      return {
        totalLogins: 0,
        todayLogins: 0,
        todaySignups: 0,
        activeUsers: 0,
        totalRecords: 0
      };
    }
  }

  public getAllHistory(): LoginRecord[] {
    return this.readHistory();
  }
}

export const loginHistoryService = new LoginHistoryService();