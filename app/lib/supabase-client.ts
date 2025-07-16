import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Supabase設定の検証
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase環境変数が設定されていません。ローカルモードで動作します。')
}

// シングルトンパターンでクライアントを管理
class SupabaseClientManager {
  private static instance: SupabaseClientManager
  private publicClient: SupabaseClient | null = null
  private adminClient: SupabaseClient | null = null
  
  private constructor() {
    if (supabaseUrl && supabaseAnonKey) {
      this.publicClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      })
    }
    
    if (supabaseUrl && supabaseServiceRoleKey) {
      this.adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })
    }
  }
  
  static getInstance(): SupabaseClientManager {
    if (!SupabaseClientManager.instance) {
      SupabaseClientManager.instance = new SupabaseClientManager()
    }
    return SupabaseClientManager.instance
  }
  
  getPublicClient(): SupabaseClient | null {
    return this.publicClient
  }
  
  getAdminClient(): SupabaseClient | null {
    return this.adminClient
  }
  
  isConfigured(): boolean {
    return this.publicClient !== null && this.adminClient !== null
  }
}

// エクスポート
const manager = SupabaseClientManager.getInstance()
export const supabase = manager.getPublicClient()
export const supabaseAdmin = manager.getAdminClient()
export const isSupabaseEnabled = () => manager.isConfigured()