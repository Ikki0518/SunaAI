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
      
      // JST（日本標準時）での日付を記録
      const nowJST = new Date(now.getTime() + (9 * 60 * 60 * 1000));
      const date = nowJST.toISOString().split('T')[0]; // YYYY-MM-DD（JST）

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
      
      // 日本標準時（JST）ベースで「今日」を計算
      const nowJST = new Date(Date.now() + (9 * 60 * 60 * 1000)); // UTC+9時間
      const todayJST = nowJST.toISOString().split('T')[0]; // YYYY-MM-DD形式（JST）

      console.log('📊 [LOGIN STATS] 統計計算開始');
      console.log('📊 [LOGIN STATS] 現在時刻 (JST):', nowJST.toISOString());
      console.log('📊 [LOGIN STATS] 今日の日付 (JST):', todayJST);
      console.log('📊 [LOGIN STATS] 履歴レコード数:', history.length);

      // 総ログイン数（サインインのみ）
      const totalLogins = history.filter(record => record.action === 'signin').length;

      // 今日のログイン数（JSTベース）
      const todayLogins = history.filter(record => {
        if (record.action !== 'signin') return false;
        
        // まずdateフィールドを確認
        if (record.date === todayJST) return true;
        
        // timestampからJST日付を計算してダブルチェック
        try {
          const recordTimeJST = new Date(new Date(record.timestamp).getTime() + (9 * 60 * 60 * 1000));
          const recordDateJST = recordTimeJST.toISOString().split('T')[0];
          return recordDateJST === todayJST;
        } catch {
          return false;
        }
      }).length;

      // 今日の新規登録数（JSTベース）
      const todaySignups = history.filter(record => {
        if (record.action !== 'signup') return false;
        
        // まずdateフィールドを確認
        if (record.date === todayJST) return true;
        
        // timestampからJST日付を計算してダブルチェック
        try {
          const recordTimeJST = new Date(new Date(record.timestamp).getTime() + (9 * 60 * 60 * 1000));
          const recordDateJST = recordTimeJST.toISOString().split('T')[0];
          return recordDateJST === todayJST;
        } catch {
          return false;
        }
      }).length;

      // 過去7日間のアクティブユーザー数（JSTベース）
      const sevenDaysAgoJST = new Date(nowJST.getTime() - (7 * 24 * 60 * 60 * 1000));
      const sevenDaysAgoStr = sevenDaysAgoJST.toISOString().split('T')[0];

      const activeUserIds = new Set();
      history.forEach(record => {
        if (record.action === 'signin') {
          // dateフィールドベース
          if (record.date >= sevenDaysAgoStr) {
            activeUserIds.add(record.userId);
          }
          // timestampベース（JSTで計算）
          try {
            const recordTimeJST = new Date(new Date(record.timestamp).getTime() + (9 * 60 * 60 * 1000));
            if (recordTimeJST >= sevenDaysAgoJST) {
              activeUserIds.add(record.userId);
            }
          } catch {
            // timestampが無効な場合はスキップ
          }
        }
      });

      // デバッグ情報
      console.log('📊 [LOGIN STATS] 計算結果:');
      console.log('  - 総ログイン数:', totalLogins);
      console.log('  - 今日のログイン (JST):', todayLogins);
      console.log('  - 今日の新規登録 (JST):', todaySignups);
      console.log('  - アクティブユーザー数:', activeUserIds.size);
      console.log('  - 総記録数:', history.length);
      console.log('  ⏰ JST 0時にリセットされます');

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