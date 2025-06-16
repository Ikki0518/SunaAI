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

interface LoginHistoryRecord extends LoginRecord {
  userAgent?: string;
  ipAddress?: string;
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
      const now = new Date();
      const today = now.toISOString().split('T')[0]; // YYYY-MM-DD形式
      const todayJST = new Date(now.getTime() + (9 * 60 * 60 * 1000)).toISOString().split('T')[0]; // JST考慮

      console.log('📊 [LOGIN STATS] 統計計算開始');
      console.log('📊 [LOGIN STATS] 今日の日付 (UTC):', today);
      console.log('📊 [LOGIN STATS] 今日の日付 (JST):', todayJST);
      console.log('📊 [LOGIN STATS] 履歴レコード数:', history.length);

      // 総ログイン数（サインインのみ）
      const totalLogins = history.filter(record => record.action === 'signin').length;

      // 今日のログイン数（UTC, JST両方を考慮）
      const todayLoginsUTC = history.filter(record => 
        record.date === today && record.action === 'signin'
      ).length;
      
      const todayLoginsJST = history.filter(record => 
        record.date === todayJST && record.action === 'signin'
      ).length;

      // タイムスタンプベースでの今日のログイン数（より確実）
      const todayLoginsTimestamp = history.filter(record => {
        if (record.action !== 'signin') return false;
        const recordDate = new Date(record.timestamp);
        const recordDateStr = recordDate.toISOString().split('T')[0];
        return recordDateStr === today || recordDateStr === todayJST;
      }).length;

      const todayLogins = Math.max(todayLoginsUTC, todayLoginsJST, todayLoginsTimestamp);

      // 今日の新規登録数（UTC, JST両方を考慮）
      const todaySignupsUTC = history.filter(record => 
        record.date === today && record.action === 'signup'
      ).length;
      
      const todaySignupsJST = history.filter(record => 
        record.date === todayJST && record.action === 'signup'
      ).length;

      // タイムスタンプベースでの今日の新規登録数
      const todaySignupsTimestamp = history.filter(record => {
        if (record.action !== 'signup') return false;
        const recordDate = new Date(record.timestamp);
        const recordDateStr = recordDate.toISOString().split('T')[0];
        return recordDateStr === today || recordDateStr === todayJST;
      }).length;

      const todaySignups = Math.max(todaySignupsUTC, todaySignupsJST, todaySignupsTimestamp);

      // 過去7日間のアクティブユーザー数
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

      const activeUserIds = new Set();
      history.forEach(record => {
        if (record.action === 'signin') {
          // dateフィールドベース
          if (record.date >= sevenDaysAgoStr) {
            activeUserIds.add(record.userId);
          }
          // timestampベース（フォールバック）
          const recordDate = new Date(record.timestamp);
          if (recordDate >= sevenDaysAgo) {
            activeUserIds.add(record.userId);
          }
        }
      });

      // デバッグ情報
      console.log('📊 [LOGIN STATS] 計算結果:');
      console.log('  - 総ログイン数:', totalLogins);
      console.log('  - 今日のログイン (UTC):', todayLoginsUTC);
      console.log('  - 今日のログイン (JST):', todayLoginsJST);
      console.log('  - 今日のログイン (Timestamp):', todayLoginsTimestamp);
      console.log('  - 今日のログイン (最終):', todayLogins);
      console.log('  - 今日の新規登録 (UTC):', todaySignupsUTC);
      console.log('  - 今日の新規登録 (JST):', todaySignupsJST);
      console.log('  - 今日の新規登録 (Timestamp):', todaySignupsTimestamp);
      console.log('  - 今日の新規登録 (最終):', todaySignups);
      console.log('  - アクティブユーザー数:', activeUserIds.size);
      console.log('  - 総記録数:', history.length);

      // 最近のレコードをサンプル表示
      const recentRecords = history.slice(-5);
      console.log('📊 [LOGIN STATS] 最新5件のレコード:');
      recentRecords.forEach((record, index) => {
        console.log(`  ${index + 1}. ${record.date} ${record.action} (${record.email})`);
      });

      return {
        totalLogins,
        todayLogins,
        todaySignups,
        activeUsers: activeUserIds.size,
        totalRecords: history.length
      };
    } catch (error) {
      console.error('📊 [LOGIN STATS] 統計情報の取得に失敗:', error);
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

  // 新しいレコードを追加
  public addRecord(record: LoginHistoryRecord): void {
    try {
      const history = this.readHistory();
      history.push(record);
      
      // ファイルに保存
      if (typeof window === 'undefined') {
        // サーバーサイドの場合
        fs.writeFileSync(this.filePath, JSON.stringify(history, null, 2));
        console.log('✅ [LOGIN HISTORY] レコード追加完了:', record.email, record.action);
      }
    } catch (error) {
      console.error('❌ [LOGIN HISTORY] レコード追加エラー:', error);
      throw error;
    }
  }
}

export const loginHistoryService = new LoginHistoryService();