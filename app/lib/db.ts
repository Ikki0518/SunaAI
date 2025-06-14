import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';

// ユーザー関連の関数
export async function createUser(email: string, password: string, name: string, phone: string) {
  try {
    const id = Date.now().toString();
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const result = await sql`
      INSERT INTO users (id, email, phone, password, name)
      VALUES (${id}, ${email}, ${phone}, ${hashedPassword}, ${name})
      RETURNING *
    `;
    
    return result.rows[0];
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

export async function getUserByEmail(email: string) {
  try {
    const result = await sql`
      SELECT * FROM users WHERE email = ${email}
    `;
    
    return result.rows[0];
  } catch (error) {
    console.error('Error getting user by email:', error);
    return null;
  }
}

export async function getAllUsers() {
  try {
    const result = await sql`
      SELECT id, email, phone, name, created_at FROM users
      ORDER BY created_at DESC
    `;
    
    return result.rows;
  } catch (error) {
    console.error('Error getting all users:', error);
    return [];
  }
}

export async function getUserStats() {
  try {
    const totalUsersResult = await sql`
      SELECT COUNT(DISTINCT id) as count FROM users
    `;
    
    const uniqueEmailsResult = await sql`
      SELECT COUNT(DISTINCT email) as count FROM users
    `;
    
    return {
      totalUsers: totalUsersResult.rows[0].count,
      uniqueEmails: uniqueEmailsResult.rows[0].count
    };
  } catch (error) {
    console.error('Error getting user stats:', error);
    return { totalUsers: 0, uniqueEmails: 0 };
  }
}

// ログイン履歴関連の関数
export async function recordLoginHistory(
  userId: string,
  email: string,
  name: string,
  action: 'signin' | 'signup',
  userAgent?: string,
  ipAddress?: string
) {
  try {
    await sql`
      INSERT INTO login_history (user_id, email, name, action, user_agent, ip_address)
      VALUES (${userId}, ${email}, ${name}, ${action}, ${userAgent || null}, ${ipAddress || null})
    `;
  } catch (error) {
    console.error('Error recording login history:', error);
  }
}

export async function getLoginStats() {
  try {
    // 総ログイン数
    const totalLoginsResult = await sql`
      SELECT COUNT(*) as count FROM login_history WHERE action = 'signin'
    `;
    
    // 今日のログイン数
    const todayLoginsResult = await sql`
      SELECT COUNT(*) as count FROM login_history 
      WHERE action = 'signin' AND date = CURRENT_DATE
    `;
    
    // 今日の新規登録数
    const todaySignupsResult = await sql`
      SELECT COUNT(*) as count FROM login_history 
      WHERE action = 'signup' AND date = CURRENT_DATE
    `;
    
    // 過去7日間のアクティブユーザー数
    const activeUsersResult = await sql`
      SELECT COUNT(DISTINCT user_id) as count FROM login_history 
      WHERE action = 'signin' AND date >= CURRENT_DATE - INTERVAL '7 days'
    `;
    
    // 総記録数
    const totalRecordsResult = await sql`
      SELECT COUNT(*) as count FROM login_history
    `;
    
    return {
      totalLogins: parseInt(totalLoginsResult.rows[0].count),
      todayLogins: parseInt(todayLoginsResult.rows[0].count),
      todaySignups: parseInt(todaySignupsResult.rows[0].count),
      activeUsers: parseInt(activeUsersResult.rows[0].count),
      totalRecords: parseInt(totalRecordsResult.rows[0].count)
    };
  } catch (error) {
    console.error('Error getting login stats:', error);
    return {
      totalLogins: 0,
      todayLogins: 0,
      todaySignups: 0,
      activeUsers: 0,
      totalRecords: 0
    };
  }
}

export async function getRecentActivities(limit: number = 50) {
  try {
    const result = await sql`
      SELECT 
        lh.id,
        lh.user_id,
        lh.email,
        lh.name,
        lh.action,
        lh.timestamp,
        lh.user_agent,
        lh.ip_address
      FROM login_history lh
      ORDER BY lh.timestamp DESC
      LIMIT ${limit}
    `;
    
    return result.rows.map(row => ({
      id: row.id.toString(),
      userId: row.user_id,
      email: row.email,
      name: row.name,
      action: row.action === 'signup' ? '新規登録' : 'ログイン',
      timestamp: row.timestamp.toISOString(),
      provider: 'credentials',
      userAgent: row.user_agent,
      ipAddress: row.ip_address
    }));
  } catch (error) {
    console.error('Error getting recent activities:', error);
    return [];
  }
}

// データベースの初期化
export async function initializeDatabase() {
  try {
    // ユーザーテーブルの作成
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50),
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // ログイン履歴テーブルの作成
    await sql`
      CREATE TABLE IF NOT EXISTS login_history (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        action VARCHAR(50) NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        date DATE DEFAULT CURRENT_DATE,
        user_agent TEXT,
        ip_address VARCHAR(45)
      )
    `;
    
    // インデックスの作成
    await sql`CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_login_history_date ON login_history(date)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_login_history_action ON login_history(action)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}