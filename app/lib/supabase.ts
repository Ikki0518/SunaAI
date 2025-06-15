import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Supabaseが設定されているかチェック
const isSupabaseConfigured = supabaseUrl && supabaseAnonKey

// クライアント用（ブラウザで使用）
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null as any

// サーバー用（管理者権限が必要な操作で使用）
export const supabaseAdmin = isSupabaseConfigured && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null as any

// Supabaseが設定されているかを確認する関数
export function isSupabaseEnabled(): boolean {
  return !!isSupabaseConfigured
}

// データベーステーブルの型定義
export interface UserActivity {
  id: string
  user_id: string
  user_email: string
  action: string
  details?: string
  ip_address?: string
  user_agent?: string
  created_at: string
}

export interface SecurityEvent {
  id: string
  type: string
  email?: string
  user_id?: string
  details: string
  ip_address?: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  created_at: string
}

export interface LoginHistory {
  id: string
  user_id: string
  user_email: string
  action: 'signin' | 'signout' | 'failed'
  ip_address?: string
  user_agent?: string
  created_at: string
}

// ユーザーアクティビティを記録
export async function recordUserActivity(
  userId: string,
  userEmail: string,
  action: string,
  details?: string,
  ipAddress?: string,
  userAgent?: string
) {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_activities')
      .insert({
        user_id: userId,
        user_email: userEmail,
        action,
        details,
        ip_address: ipAddress,
        user_agent: userAgent
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error recording user activity:', error)
    return null
  }
}

// セキュリティイベントを記録
export async function recordSecurityEvent(
  type: string,
  details: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  email?: string,
  userId?: string,
  ipAddress?: string
) {
  try {
    const { data, error } = await supabaseAdmin
      .from('security_events')
      .insert({
        type,
        email,
        user_id: userId,
        details,
        ip_address: ipAddress,
        severity
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error recording security event:', error)
    return null
  }
}

// ログイン履歴を記録
export async function recordLoginHistory(
  userId: string,
  userEmail: string,
  action: 'signin' | 'signout' | 'failed',
  ipAddress?: string,
  userAgent?: string
) {
  try {
    const { data, error } = await supabaseAdmin
      .from('login_history')
      .insert({
        user_id: userId,
        user_email: userEmail,
        action,
        ip_address: ipAddress,
        user_agent: userAgent
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error recording login history:', error)
    return null
  }
}

// 管理者用：ユーザーアクティビティを取得
export async function getUserActivities(limit = 100) {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_activities')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching user activities:', error)
    return []
  }
}

// 管理者用：セキュリティイベントを取得
export async function getSecurityEvents(limit = 100) {
  try {
    const { data, error } = await supabaseAdmin
      .from('security_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching security events:', error)
    return []
  }
}

// 管理者用：ログイン履歴を取得
export async function getLoginHistory(limit = 100) {
  try {
    const { data, error } = await supabaseAdmin
      .from('login_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching login history:', error)
    return []
  }
}

// 統計情報を取得
export async function getStats() {
  try {
    // ユーザー数を取得
    const { count: totalUsers } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })

    // 今日のログイン数を取得
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const { count: todayLogins } = await supabaseAdmin
      .from('login_history')
      .select('*', { count: 'exact', head: true })
      .eq('action', 'signin')
      .gte('created_at', today.toISOString())

    // 総ログイン数を取得
    const { count: totalLogins } = await supabaseAdmin
      .from('login_history')
      .select('*', { count: 'exact', head: true })
      .eq('action', 'signin')

    // アクティブユーザー数（過去7日間）
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const { data: activeUsersData } = await supabaseAdmin
      .from('login_history')
      .select('user_id')
      .eq('action', 'signin')
      .gte('created_at', sevenDaysAgo.toISOString())

    const activeUsers = new Set(activeUsersData?.map((row: any) => row.user_id) || []).size

    return {
      totalUsers: totalUsers || 0,
      todayLogins: todayLogins || 0,
      totalLogins: totalLogins || 0,
      activeUsers
    }
  } catch (error) {
    console.error('Error fetching stats:', error)
    return {
      totalUsers: 0,
      todayLogins: 0,
      totalLogins: 0,
      activeUsers: 0
    }
  }
}