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

// Supabaseから全ユーザーを取得
export async function getSupabaseUsers() {
  if (!supabaseAdmin) throw new Error('Supabase管理者クライアントが未設定です');
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}