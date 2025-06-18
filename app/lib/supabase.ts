import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// デバッグログ（開発環境のみ）
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 [SUPABASE DEBUG] Environment variables check:', {
    hasUrl: !!supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
    hasServiceKey: !!supabaseServiceRoleKey,
    urlLength: supabaseUrl.length,
    anonKeyLength: supabaseAnonKey.length,
    serviceKeyLength: supabaseServiceRoleKey.length
  });
}

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

// デバッグログ（開発環境のみ）
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 [SUPABASE DEBUG] Client initialization:', {
    isSupabaseConfigured,
    hasSupabaseClient: !!supabase,
    hasSupabaseAdmin: !!supabaseAdmin
  });
}

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

export interface ChatSession {
  id: string
  user_id: string
  title: string
  conversation_id?: string
  is_pinned: boolean
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  session_id: string
  user_id: string
  role: 'user' | 'bot'
  content: string
  timestamp: number
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

// ユーザーアクティビティ取得
export async function getUserActivities(limit: number = 100) {
  if (!supabaseAdmin) throw new Error('Supabase管理者クライアントが未設定です');
  const { data, error } = await supabaseAdmin
    .from('user_activities')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

// ログイン履歴取得
export async function getLoginHistory(limit: number = 100) {
  if (!supabaseAdmin) throw new Error('Supabase管理者クライアントが未設定です');
  const { data, error } = await supabaseAdmin
    .from('login_history')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

// セキュリティイベント取得
export async function getSecurityEvents(limit: number = 100) {
  if (!supabaseAdmin) throw new Error('Supabase管理者クライアントが未設定です');
  const { data, error } = await supabaseAdmin
    .from('security_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

// 統計情報取得
export async function getStats() {
  if (!supabaseAdmin) throw new Error('Supabase管理者クライアントが未設定です');
  // ユーザー数
  const { data: users, error: userError } = await supabaseAdmin.from('users').select('*');
  // ログイン履歴
  const { data: logins, error: loginError } = await supabaseAdmin.from('login_history').select('*');
  if (userError || loginError) throw userError || loginError;
  return {
    totalUsers: users?.length || 0,
    totalLogins: logins?.length || 0,
    todayLogins: (logins || []).filter((l: any) => l.created_at && new Date(l.created_at).toDateString() === new Date().toDateString()).length,
    todaySignups: (users || []).filter((u: any) => u.created_at && new Date(u.created_at).toDateString() === new Date().toDateString()).length,
    activeUsers: 0 // 必要に応じて実装
  };
}

// ダミー実装: ログイン履歴・ユーザーアクティビティ・セキュリティイベント記録
export async function recordLoginHistory(...args: any[]) {}
export async function recordUserActivity(...args: any[]) {}
export async function recordSecurityEvent(...args: any[]) {}

// Supabaseに新規ユーザーを追加
export async function insertSupabaseUser({ phone, email, name, passwordHash }: { phone: string, email: string, name: string, passwordHash: string }) {
  if (!supabaseAdmin) throw new Error('Supabase管理者クライアントが未設定です');
  const { data, error } = await supabaseAdmin
    .from('users')
    .insert([{ phone, email, name, password: passwordHash }]);
  if (error) throw error;
  return data;
}

// Supabaseからemailでユーザーを取得
export async function getSupabaseUserByEmail(email: string) {
  if (!supabaseAdmin) throw new Error('Supabase管理者クライアントが未設定です');
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('email', email)
    .single();
  if (error) return null;
  return data;
}

// Supabaseにログイン履歴を追加
export async function insertSupabaseLoginHistory({ user_id, user_email, action }: { user_id: string, user_email: string, action: string }) {
  if (!supabaseAdmin) throw new Error('Supabase管理者クライアントが未設定です');
  const { data, error } = await supabaseAdmin
    .from('login_history')
    .insert([{ user_id, user_email, action }]);
  if (error) throw error;
  return data;
}

// Supabaseにチャットセッションを保存
export async function saveSupabaseChatSession(session: any) {
  if (!supabaseAdmin) throw new Error('Supabase管理者クライアントが未設定です');
  const { data, error } = await supabaseAdmin
    .from('chat_sessions')
    .upsert([session], { onConflict: 'id' });
  if (error) throw error;
  return data;
}

// Supabaseからユーザーのチャットセッション一覧を取得
export async function getSupabaseChatSessions(user_id: string) {
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 [SUPABASE DEBUG] getSupabaseChatSessions called:', {
      user_id,
      hasSupabaseAdmin: !!supabaseAdmin,
      isSupabaseConfigured: !!isSupabaseConfigured,
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceRoleKey
    });
  }
  
  if (!supabaseAdmin) {
    const errorMsg = `Supabase管理者クライアントが未設定です。環境変数を確認してください:
    - NEXT_PUBLIC_SUPABASE_URL: ${!!supabaseUrl}
    - NEXT_PUBLIC_SUPABASE_ANON_KEY: ${!!supabaseAnonKey} 
    - SUPABASE_SERVICE_ROLE_KEY: ${!!supabaseServiceRoleKey}`;
    console.error('🔧 [SUPABASE ERROR]', errorMsg);
    throw new Error(errorMsg);
  }
  
  const { data, error } = await supabaseAdmin
    .from('chat_sessions')
    .select('*')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// Supabaseにチャットメッセージを保存
export async function saveSupabaseChatMessage(message: any) {
  if (!supabaseAdmin) throw new Error('Supabase管理者クライアントが未設定です');
  const { data, error } = await supabaseAdmin
    .from('chat_messages')
    .insert([message]);
  if (error) throw error;
  return data;
}

// Supabaseからチャットセッションのメッセージ一覧を取得
export async function getSupabaseChatMessages(session_id: string) {
  if (!supabaseAdmin) throw new Error('Supabase管理者クライアントが未設定です');
  const { data, error } = await supabaseAdmin
    .from('chat_messages')
    .select('*')
    .eq('session_id', session_id)
    .order('timestamp', { ascending: true });
  if (error) throw error;
  return data || [];
}
// Supabaseでユーザー名を更新
export async function updateSupabaseUserName(user_id: string, name: string) {
  if (!supabaseAdmin) throw new Error('Supabase管理者クライアントが未設定です');
  const { data, error } = await supabaseAdmin
    .from('users')
    .update({ name })
    .eq('id', user_id)
    .select()
    .single();
  if (error) throw error;
  return data;
}