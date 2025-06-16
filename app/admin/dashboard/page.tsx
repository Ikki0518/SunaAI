'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface UserActivity {
  id: string;
  userId: string;
  name: string;
  email: string;
  provider: string;
  action: string;
  timestamp: string;
  userAgent?: string;
  imageUrl?: string;
}

interface SecurityEvent {
  id: string;
  type: 'failed_login' | 'suspicious_activity' | 'multiple_attempts';
  email: string;
  timestamp: string;
  details: string;
  ipAddress?: string;
}

interface DashboardStats {
  totalUsers: number;
  totalLogins: number;
  totalRecords: number;
  todayLogins: number;
  todaySignups: number;
  activeUsers: number;
}

interface SheetsStatus {
  isConfigured: boolean;
  configStatus: {
    sheetsId: boolean;
    serviceAccountEmail: boolean;
    privateKey: boolean;
  };
  connectionTest?: {
    status: string;
    message: string;
  };
  setupGuide: string;
}

interface RegisteredUser {
  id: string;
  email: string;
  phone: string;
  name: string;
  createdAt: number;
  registrationDate: string;
}

interface UsersData {
  users: RegisteredUser[];
  totalUsers: number;
  uniqueEmails: number;
  duplicates: { email: string; count: number }[];
  summary: {
    totalRecords: number;
    uniqueUsers: number;
    duplicateEmails: number;
  };
}

// モバイル検出用フック
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return isMobile;
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalLogins: 0,
    totalRecords: 0,
    todayLogins: 0,
    todaySignups: 0,
    activeUsers: 0
  });
  const [sheetsStatus, setSheetsStatus] = useState<SheetsStatus | null>(null);
  const [usersData, setUsersData] = useState<UsersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'activities' | 'security' | 'users' | 'sheets'>('overview');
  const [bypassAuth, setBypassAuth] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // URLパラメータでバイパスモードをチェック（開発環境のみ）
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('bypass') === 'true' && process.env.NODE_ENV === 'development') {
      setBypassAuth(true);
      console.log('🔓 [ADMIN DASHBOARD] Bypass mode activated (development only)');
    }
  }, []);

  // 管理者権限チェック
  const isAdmin = bypassAuth ||
                  session?.user?.email === 'ikki_y0518@icloud.com' ||
                  session?.user?.email === 'ikkiyamamoto0518@gmail.com';

  useEffect(() => {
    if (status === 'loading') return;
    
    // バイパスモードの場合はセッションチェックをスキップ
    if (bypassAuth) {
      console.log('🔓 [ADMIN DASHBOARD] Bypassing authentication checks');
      fetchDashboardData();
      return;
    }
    
    if (!session) {
      console.log('🐛 [ADMIN DASHBOARD] No session found, redirecting to signin');
      router.push('/auth/signin');
      return;
    }

    // 管理者権限チェック（既存ユーザーアカウント対応）
    const userEmail = session.user?.email?.toLowerCase().trim();
    const isAdminUser = userEmail === 'ikki_y0518@icloud.com' || userEmail === 'ikkiyamamoto0518@gmail.com';
    
    if (!isAdminUser) {
      console.log('🐛 [ADMIN DASHBOARD] Access denied for:', userEmail);
      router.push('/');
      return;
    }

    console.log('🐛 [ADMIN DASHBOARD] Admin access granted for:', userEmail);
    fetchDashboardData();
  }, [session, status, router, bypassAuth]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      console.log('🔧 [ADMIN DASHBOARD] Starting data fetch...');
      
      // 統計情報を取得（新しいSupabase統合APIを優先）
      try {
        console.log('📊 [ADMIN DASHBOARD] Fetching stats...');
        const statsUrl = bypassAuth ? '/api/admin/stats-v2?bypass=true' : '/api/admin/stats-v2';
        const statsResponse = await fetch(statsUrl);
        console.log('📊 [ADMIN DASHBOARD] Stats response status:', statsResponse.status);
        
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData);
          console.log('📊 統計データ (Supabase):', statsData);
        } else {
          // フォールバック
          console.log('📊 [ADMIN DASHBOARD] Falling back to original stats API');
          const fallbackUrl = bypassAuth ? '/api/admin/stats?bypass=true' : '/api/admin/stats';
          const fallbackResponse = await fetch(fallbackUrl);
          console.log('📊 [ADMIN DASHBOARD] Fallback stats response status:', fallbackResponse.status);
          
          if (fallbackResponse.ok) {
            const statsData = await fallbackResponse.json();
            setStats(statsData);
            console.log('📊 統計データ (Fallback):', statsData);
          } else {
            const errorText = await fallbackResponse.text();
            console.error('📊 [ADMIN DASHBOARD] Stats API error:', errorText);
          }
        }
      } catch (error) {
        console.error('統計情報の取得エラー:', error);
      }

      // ユーザー活動を取得（新しいSupabase統合APIを優先）
      try {
        console.log('👥 [ADMIN DASHBOARD] Fetching activities...');
        const activitiesUrl = bypassAuth ? '/api/admin/activities-v2?bypass=true' : '/api/admin/activities-v2';
        const activitiesResponse = await fetch(activitiesUrl);
        console.log('👥 [ADMIN DASHBOARD] Activities response status:', activitiesResponse.status);
        
        if (activitiesResponse.ok) {
          const activitiesData = await activitiesResponse.json();
          setActivities(activitiesData.activities || []);
          console.log('👥 活動データ (Supabase):', activitiesData);
        } else {
          // フォールバック
          console.log('👥 [ADMIN DASHBOARD] Falling back to original activities API');
          const fallbackUrl = bypassAuth ? '/api/admin/activities?bypass=true' : '/api/admin/activities';
          const fallbackResponse = await fetch(fallbackUrl);
          console.log('👥 [ADMIN DASHBOARD] Fallback activities response status:', fallbackResponse.status);
          
          if (fallbackResponse.ok) {
            const activitiesData = await fallbackResponse.json();
            setActivities(activitiesData.activities || []);
            console.log('👥 活動データ (Fallback):', activitiesData);
          } else {
            const errorText = await fallbackResponse.text();
            console.error('👥 [ADMIN DASHBOARD] Activities API error:', errorText);
          }
        }
      } catch (error) {
        console.error('ユーザー活動の取得エラー:', error);
      }

      // セキュリティイベントを取得（新しいSupabase統合APIを優先）
      try {
        console.log('🔒 [ADMIN DASHBOARD] Fetching security events...');
        const securityUrl = bypassAuth ? '/api/admin/security-events-v2?bypass=true' : '/api/admin/security-events-v2';
        const securityResponse = await fetch(securityUrl);
        console.log('🔒 [ADMIN DASHBOARD] Security response status:', securityResponse.status);
        
        if (securityResponse.ok) {
          const securityData = await securityResponse.json();
          setSecurityEvents(securityData.events || securityData);
          console.log('🔒 セキュリティデータ (Supabase):', securityData);
        } else {
          // フォールバック
          console.log('🔒 [ADMIN DASHBOARD] Falling back to original security API');
          const fallbackUrl = bypassAuth ? '/api/admin/security-events?bypass=true' : '/api/admin/security-events';
          const fallbackResponse = await fetch(fallbackUrl);
          console.log('🔒 [ADMIN DASHBOARD] Fallback security response status:', fallbackResponse.status);
          
          if (fallbackResponse.ok) {
            const securityData = await fallbackResponse.json();
            setSecurityEvents(securityData);
            console.log('🔒 セキュリティデータ (Fallback):', securityData);
          } else {
            const errorText = await fallbackResponse.text();
            console.error('🔒 [ADMIN DASHBOARD] Security API error:', errorText);
          }
        }
      } catch (error) {
        console.error('セキュリティイベントの取得エラー:', error);
      }

      // Google Sheets状態を取得
      try {
        console.log('📋 [ADMIN DASHBOARD] Fetching Google Sheets status...');
        const sheetsUrl = bypassAuth ? '/api/admin/sheets-status?bypass=true' : '/api/admin/sheets-status';
        const sheetsResponse = await fetch(sheetsUrl);
        console.log('📋 [ADMIN DASHBOARD] Sheets response status:', sheetsResponse.status);
        
      if (sheetsResponse.ok) {
        const sheetsData = await sheetsResponse.json();
        setSheetsStatus(sheetsData);
          console.log('📋 Google Sheets状態:', sheetsData);
        } else {
          const errorText = await sheetsResponse.text();
          console.error('📋 [ADMIN DASHBOARD] Sheets API error:', errorText);
        }
      } catch (error) {
        console.error('Google Sheets状態の取得エラー:', error);
      }

      // ユーザーデータを取得
      try {
        console.log('👤 [ADMIN DASHBOARD] Fetching users data...');
        const usersUrl = bypassAuth ? '/api/admin/users?bypass=true' : '/api/admin/users';
        const usersResponse = await fetch(usersUrl);
        console.log('👤 [ADMIN DASHBOARD] Users response status:', usersResponse.status);
        
      if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setUsersData(usersData);
          console.log('👤 ユーザーデータ:', usersData);
        } else {
          const errorText = await usersResponse.text();
          console.error('👤 [ADMIN DASHBOARD] Users API error:', errorText);
        }
      } catch (error) {
        console.error('ユーザーデータの取得エラー:', error);
      }

      console.log('🔧 [ADMIN DASHBOARD] Data fetch completed');
    } catch (error) {
      console.error('ダッシュボードデータの取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetUsers = async () => {
    if (!confirm('⚠️ 警告: 管理者以外の全ユーザーデータを削除します。この操作は取り消せません。続行しますか？')) {
      return;
    }

    try {
      setResetting(true);
      const response = await fetch('/api/admin/users?action=reset', {
        method: 'DELETE'
      });

      if (response.ok) {
        const result = await response.json();
        alert(`✅ ${result.deletedCount}人のユーザーデータを削除しました。`);
        // データを再取得
        await fetchDashboardData();
      } else {
        alert('❌ ユーザーデータのリセットに失敗しました。');
      }
    } catch (error) {
      console.error('ユーザーリセットエラー:', error);
      alert('❌ エラーが発生しました。');
    } finally {
      setResetting(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`⚠️ 警告: ユーザー「${userName}」を削除します。この操作は取り消せません。続行しますか？`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users?action=deleteUser&userId=${userId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const result = await response.json();
        alert(`✅ ユーザー「${result.deletedUser.name}」を削除しました。`);
        // データを再取得
        await fetchDashboardData();
      } else {
        const error = await response.json();
        alert(`❌ ${error.error || 'ユーザーの削除に失敗しました。'}`);
      }
    } catch (error) {
      console.error('ユーザー削除エラー:', error);
      alert('❌ エラーが発生しました。');
    }
  };

  // モバイル版ダッシュボード UI
  const renderMobileDashboard = () => {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* モバイル用固定ヘッダー */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowMobileMenu(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Suna管理</h1>
                {bypassAuth && (
                  <span className="text-xs text-yellow-600 bg-yellow-100 px-1 py-0.5 rounded">
                    🔓 バイパス
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => fetchDashboardData()}
                className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                disabled={loading}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* メインコンテンツ（パディングトップでヘッダー分を考慮） */}
        <div className="pt-16 px-4 py-6">
          {/* モバイル専用：カード形式ダッシュボード */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 統計概要 */}
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-4">📊 サイト統計</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">{stats.totalUsers}</div>
                    <div className="text-sm text-gray-500">総ユーザー</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">{stats.totalLogins}</div>
                    <div className="text-sm text-gray-500">総ログイン</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-600">{stats.todayLogins}</div>
                    <div className="text-sm text-gray-500">今日のログイン</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">{stats.todaySignups}</div>
                    <div className="text-sm text-gray-500">今日の新規</div>
                  </div>
                </div>
              </div>

              {/* 管理機能カード */}
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900">⚙️ 管理機能</h2>
                
                {/* ユーザー活動カード */}
                <button
                  onClick={() => setActiveTab('activities')}
                  className="w-full bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                      <span className="text-white text-xl">👥</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">ユーザー活動</h3>
                      <p className="text-sm text-gray-500">ログイン履歴や活動状況を確認</p>
                    </div>
                    <div className="text-gray-400">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </button>

                {/* セキュリティカード */}
                <button
                  onClick={() => setActiveTab('security')}
                  className="w-full bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center">
                      <span className="text-white text-xl">🔒</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">セキュリティ監視</h3>
                      <p className="text-sm text-gray-500">不正アクセスやセキュリティイベント</p>
                      <p className="text-xs text-red-600 mt-1">{securityEvents.length}件のイベント</p>
                    </div>
                    <div className="text-gray-400">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </button>

                {/* ユーザー管理カード */}
                <button
                  onClick={() => setActiveTab('users')}
                  className="w-full bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                      <span className="text-white text-xl">⚙️</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">ユーザー管理</h3>
                      <p className="text-sm text-gray-500">登録ユーザーの管理と削除</p>
                      <p className="text-xs text-green-600 mt-1">{usersData?.users?.length || 0}名のユーザー</p>
                    </div>
                    <div className="text-gray-400">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </button>

                {/* Google Sheetsカード */}
                <button
                  onClick={() => setActiveTab('sheets')}
                  className="w-full bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
                      <span className="text-white text-xl">📋</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">Google Sheets連携</h3>
                      <p className="text-sm text-gray-500">データエクスポートと設定</p>
                      <p className={`text-xs mt-1 ${sheetsStatus?.isConfigured ? 'text-green-600' : 'text-yellow-600'}`}>
                        {sheetsStatus?.isConfigured ? '設定済み' : '未設定'}
                      </p>
                    </div>
                    <div className="text-gray-400">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </button>
              </div>

              {/* 最近の活動プレビュー */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">最近の活動</h3>
                  <button
                    onClick={() => setActiveTab('activities')}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    すべて見る
                  </button>
                </div>
                <div className="p-4 space-y-3">
                  {activities.slice(0, 3).map((activity, index) => (
                    <div key={activity.id} className="flex items-center space-x-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">
                          {activity.name ? activity.name.charAt(0).toUpperCase() : 'U'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {activity.name || 'Unknown User'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {activity.action || 'Unknown'} • {formatDate(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {activities.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      <p className="text-sm">活動履歴がありません</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 他のタブのコンテンツは簡略化 */}
          {activeTab === 'activities' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">ユーザー活動</h3>
              </div>
              <div className="p-4 space-y-3">
                {activities.map((activity, index) => (
                  <div key={activity.id} className="flex items-center space-x-3 py-3 border-b border-gray-100 last:border-b-0">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm">
                        {activity.name ? activity.name.charAt(0).toUpperCase() : 'U'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {activity.name || 'Unknown User'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {activity.email || 'No email'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {activity.action || 'Unknown'} • {formatDate(activity.timestamp)}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      {getActionBadge(activity.action || 'unknown')}
                    </div>
                  </div>
                ))}
                {activities.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">活動履歴がありません</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* セキュリティタブ */}
          {activeTab === 'security' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">セキュリティイベント</h3>
              </div>
              <div className="p-4 space-y-3">
                {securityEvents.slice(0, 10).map((event, index) => (
                  <div key={event.id} className="flex items-start space-x-3 py-3 border-b border-gray-100 last:border-b-0">
                    <div className="flex-shrink-0 w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {event.email}
                      </p>
                      <p className="text-xs text-gray-500">
                        {event.details}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDate(event.timestamp)}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      {getSecurityBadge(event.type)}
                    </div>
                  </div>
                ))}
                {securityEvents.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">セキュリティイベントがありません</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ユーザー管理タブ */}
          {activeTab === 'users' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">ユーザー管理</h3>
              </div>
              <div className="p-4 space-y-3">
                {usersData?.users?.slice(0, 10).map((user, index) => (
                  <div key={user.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm">
                          {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {user.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {user.email}
                        </p>
                        <p className="text-xs text-gray-400">
                          {user.registrationDate}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteUser(user.id, user.name)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
                {(!usersData?.users || usersData.users.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">登録ユーザーがありません</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sheetsタブ */}
          {activeTab === 'sheets' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Google Sheets</h3>
              </div>
              <div className="p-4">
                {sheetsStatus ? (
                  <div className="space-y-4">
                    <div className={`p-4 rounded-lg ${sheetsStatus.isConfigured ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                      <div className="flex items-center space-x-2">
                        <span className={`text-lg ${sheetsStatus.isConfigured ? 'text-green-600' : 'text-yellow-600'}`}>
                          {sheetsStatus.isConfigured ? '✅' : '⚠️'}
                        </span>
                        <span className={`text-sm font-medium ${sheetsStatus.isConfigured ? 'text-green-800' : 'text-yellow-800'}`}>
                          {sheetsStatus.isConfigured ? 'Google Sheets設定済み' : 'Google Sheets未設定'}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 leading-relaxed">
                      {sheetsStatus.setupGuide}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">設定情報を読み込み中...</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* モバイル用メニューオーバーレイ */}
        {showMobileMenu && (
          <div className="fixed inset-0 z-60">
            <div 
              className="absolute inset-0 bg-black bg-opacity-50"
              onClick={() => setShowMobileMenu(false)}
            />
            <div className="absolute top-0 left-0 w-80 h-full bg-white shadow-xl">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">メニュー</h2>
                  <button
                    onClick={() => setShowMobileMenu(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="p-4 space-y-2">
                {[
                  { key: 'activities', label: 'ユーザー活動', icon: '👥' },
                  { key: 'security', label: 'セキュリティ', icon: '🔒' },
                  { key: 'users', label: 'ユーザー管理', icon: '⚙️' },
                  { key: 'sheets', label: 'Google Sheets', icon: '📋' }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setActiveTab(tab.key as any);
                      setShowMobileMenu(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === tab.key
                        ? 'bg-blue-50 text-blue-600 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-xl">{tab.icon}</span>
                    <span className="font-medium">{tab.label}</span>
                  </button>
                ))}
              </div>
              
              {/* 管理者情報 */}
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gray-50">
                <div className="text-center">
                  <p className="text-sm text-gray-600">管理者</p>
                  <p className="text-sm font-medium text-gray-900">
                    {session?.user?.name || 'バイパスモード'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {session?.user?.email || '開発モード'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ローディングオーバーレイ */}
        {loading && (
          <div className="fixed inset-0 z-70 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-xl p-6 flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <span className="text-gray-900 font-medium">読み込み中...</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">管理画面を読み込み中...</p>
        </div>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">認証状態を確認中...</p>
        </div>
      </div>
    );
  }

  if (!bypassAuth && (!session || !isAdmin)) {
    return null;
  }

  const formatDate = (timestamp: string) => {
    if (!timestamp) return 'Unknown';
    try {
    return new Date(timestamp).toLocaleString('ja-JP');
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getActionBadge = (action: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    if (!action) {
      return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>Unknown</span>;
    }
    if (action === '新規登録' || action === 'signup') {
      return <span className={`${baseClasses} bg-green-100 text-green-800`}>{action}</span>;
    }
    return <span className={`${baseClasses} bg-blue-100 text-blue-800`}>{action}</span>;
  };

  const getSecurityBadge = (type: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    if (!type) {
      return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>Unknown</span>;
    }
    switch (type) {
      case 'failed_login':
        return <span className={`${baseClasses} bg-red-100 text-red-800`}>ログイン失敗</span>;
      case 'suspicious_activity':
        return <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>不審な活動</span>;
      case 'multiple_attempts':
        return <span className={`${baseClasses} bg-orange-100 text-orange-800`}>複数回試行</span>;
      default:
        return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>{type}</span>;
    }
  };

  // モバイル版とデスクトップ版の分岐
  if (isMobile) {
    return renderMobileDashboard();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* デバッグ情報表示 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* バイパスモード警告（デスクトップ版のみ表示） */}
        {!isMobile && bypassAuth && (
          <div className="mb-4 bg-yellow-100 border-l-4 border-yellow-500 p-4 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">バイパスモード有効</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>認証チェックをスキップしています。本番環境では使用しないでください。</p>
                  <p className="mt-1">通常モードに戻すにはURLから ?bypass=true を削除してください。</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* デバッグ情報（デスクトップ版のみ表示） */}
        {!isMobile && status !== 'loading' && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">🔍 デバッグ情報</h3>
            <div className="text-xs text-blue-800 space-y-1">
              <p><strong>認証状態:</strong> {status}</p>
              <p><strong>セッション:</strong> {session ? '有効' : '無効'}</p>
              <p><strong>ユーザーメール:</strong> {session?.user?.email || 'なし'}</p>
              <p><strong>管理者権限:</strong> {isAdmin ? '有効' : '無効'}</p>
              <p><strong>バイパスモード:</strong> {bypassAuth ? '有効' : '無効'}</p>
            </div>
            <div className="mt-2">
              <a 
                href="/admin/dashboard?bypass=true" 
                className="inline-flex items-center px-3 py-1 border border-blue-300 shadow-sm text-xs leading-4 font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                バイパスモードで開く
              </a>
            </div>
          </div>
        )}
      </div>

    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Suna 管理ダッシュボード</h1>
              <p className="mt-1 text-sm text-gray-500">
                ユーザー活動とセキュリティの監視
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {bypassAuth && (
                <span className="text-sm text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
                  🔓 バイパスモード
                </span>
              )}
              <span className="text-sm text-gray-500">
                管理者: {session?.user?.name || 'バイパスモード'}
              </span>
              <button
                onClick={() => fetchDashboardData()}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                更新
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* タブナビゲーション */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'overview', label: '概要', icon: '📊' },
              { key: 'activities', label: 'ユーザー活動', icon: '👥' },
              { key: 'security', label: 'セキュリティ', icon: '🔒' },
              { key: 'users', label: 'ユーザー管理', icon: '⚙️' },
              { key: 'sheets', label: 'Google Sheets', icon: '📋' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* 概要タブ */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* 統計カード */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm">👥</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          総ユーザー数
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {stats.totalUsers}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm">🔑</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          総ログイン数
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {stats.totalLogins}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm">📅</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          今日のログイン
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {stats.todayLogins}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm">✨</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          今日の新規登録
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {stats.todaySignups}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 最近の活動 */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  最近の活動
                </h3>
                <div className="space-y-3">
                  {activities.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          {activity.imageUrl ? (
                            <img className="h-8 w-8 rounded-full" src={activity.imageUrl} alt="" />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-xs text-gray-600">
                                  {activity.name ? activity.name.charAt(0).toUpperCase() : 'U'}
                              </span>
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                              {activity.name || 'Unknown User'}
                          </p>
                          <p className="text-xs text-gray-500">
                              {activity.email || 'No email'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                          <span className={getActionBadge(activity.action || 'unknown')}>
                            {activity.action || 'Unknown'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(activity.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ユーザー活動タブ */}
        {activeTab === 'activities' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                全ユーザー活動履歴
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ユーザー
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        アクション
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        プロバイダー
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        日時
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {activities.map((activity) => (
                      <tr key={activity.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              {activity.imageUrl ? (
                                <img className="h-10 w-10 rounded-full" src={activity.imageUrl} alt="" />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                  <span className="text-sm text-gray-600">
                                      {activity.name ? activity.name.charAt(0).toUpperCase() : 'U'}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                  {activity.name || 'Unknown User'}
                              </div>
                              <div className="text-sm text-gray-500">
                                  {activity.email || 'No email'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <span className={getActionBadge(activity.action || 'unknown')}>
                              {activity.action || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {activity.provider || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(activity.timestamp)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* セキュリティタブ */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  セキュリティイベント
                </h3>
                {securityEvents.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    セキュリティイベントはありません
                  </p>
                ) : (
                  <div className="space-y-4">
                    {securityEvents.map((event) => (
                      <div key={event.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className={getSecurityBadge(event.type)}>
                              {event.type === 'failed_login' && 'ログイン失敗'}
                              {event.type === 'suspicious_activity' && '不審な活動'}
                              {event.type === 'multiple_attempts' && '複数回試行'}
                            </span>
                            <span className="text-sm font-medium text-gray-900">
                              {event.email}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {formatDate(event.timestamp)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-gray-600">
                          {event.details}
                        </p>
                        {event.ipAddress && (
                          <p className="mt-1 text-xs text-gray-500">
                            IP: {event.ipAddress}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ユーザー管理タブ */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* ユーザー統計 */}
            {usersData && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                          <span className="text-white text-sm">📊</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            総レコード数
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {usersData.summary.totalRecords}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                          <span className="text-white text-sm">👥</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            ユニークユーザー
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {usersData.summary.uniqueUsers}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                          <span className="text-white text-sm">⚠️</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            重複メール
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {usersData.summary.duplicateEmails}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 重複警告 */}
            {usersData && usersData.duplicates.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-yellow-900 mb-2">⚠️ 重複メールアドレスが検出されました</h4>
                <div className="text-sm text-yellow-800">
                  {usersData.duplicates.map((dup, index) => (
                    <p key={index}>• {dup.email} ({dup.count}回登録)</p>
                  ))}
                </div>
              </div>
            )}

            {/* 管理機能 */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  管理機能
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div>
                      <h4 className="text-sm font-medium text-red-900">ユーザーデータリセット</h4>
                      <p className="text-sm text-red-700">管理者以外の全ユーザーデータを削除します（取り消し不可）</p>
                    </div>
                    <button
                      onClick={handleResetUsers}
                      disabled={resetting}
                      className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {resetting ? '削除中...' : '全ユーザー削除'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ユーザー一覧 */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  登録ユーザー一覧
                </h3>
                {usersData && usersData.users.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            ユーザー情報
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            メールアドレス
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            電話番号
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            登録日時
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            ユーザーID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            操作
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {usersData.users.map((user) => (
                          <tr key={user.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                                    <span className="text-white font-medium text-sm">
                                      {user.name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {user.name}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {user.email === 'ikkiyamamoto0518@gmail.com' || user.email === 'ikki_y0518@icloud.com' ? '管理者' : '一般ユーザー'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {user.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {user.phone}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {user.registrationDate}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                              {user.id}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {user.email === 'ikkiyamamoto0518@gmail.com' || user.email === 'ikki_y0518@icloud.com' ? (
                                <span className="text-gray-400">管理者</span>
                              ) : (
                                <button
                                  onClick={() => handleDeleteUser(user.id, user.name)}
                                  className="text-red-600 hover:text-red-900 transition-colors"
                                >
                                  削除
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">登録ユーザーがいません</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Google Sheetsタブ */}
        {activeTab === 'sheets' && (
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Google Sheets連携状態
                </h3>
                
                {sheetsStatus ? (
                  <div className="space-y-6">
                    {/* 連携状態の概要 */}
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${sheetsStatus.isConfigured ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className={`font-medium ${sheetsStatus.isConfigured ? 'text-green-700' : 'text-red-700'}`}>
                        {sheetsStatus.isConfigured ? 'Google Sheets連携が設定されています' : 'Google Sheets連携が設定されていません'}
                      </span>
                    </div>

                    {/* 設定詳細 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${sheetsStatus.configStatus.sheetsId ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <span className="text-sm font-medium">スプレッドシートID</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {sheetsStatus.configStatus.sheetsId ? '設定済み' : '未設定'}
                        </p>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${sheetsStatus.configStatus.serviceAccountEmail ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <span className="text-sm font-medium">サービスアカウント</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {sheetsStatus.configStatus.serviceAccountEmail ? '設定済み' : '未設定'}
                        </p>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${sheetsStatus.configStatus.privateKey ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <span className="text-sm font-medium">プライベートキー</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {sheetsStatus.configStatus.privateKey ? '設定済み' : '未設定'}
                        </p>
                      </div>
                    </div>

                    {/* 接続テスト結果 */}
                    {sheetsStatus.connectionTest && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-blue-900 mb-2">接続状態</h4>
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${sheetsStatus.connectionTest.status === 'ready' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <span className="text-sm text-blue-800">{sheetsStatus.connectionTest.message}</span>
                        </div>
                      </div>
                    )}

                    {/* 設定手順 */}
                    {!sheetsStatus.isConfigured && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-yellow-900 mb-2">📋 設定が必要です</h4>
                        <p className="text-sm text-yellow-800 mb-3">
                          Google Sheets連携を有効にするには、以下の手順に従って設定してください：
                        </p>
                        <ol className="text-sm text-yellow-800 space-y-1 list-decimal list-inside">
                          <li>Google Cloud Platformでプロジェクトを作成</li>
                          <li>Google Sheets APIを有効化</li>
                          <li>サービスアカウントを作成してJSONキーをダウンロード</li>
                          <li>Google Sheetsを作成してサービスアカウントと共有</li>
                          <li>環境変数を設定</li>
                        </ol>
                        <div className="mt-3">
                          <a
                            href="/GOOGLE_SHEETS_SETUP.md"
                            target="_blank"
                            className="inline-flex items-center px-3 py-2 border border-yellow-300 shadow-sm text-sm leading-4 font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                          >
                            📖 詳細な設定手順を見る
                          </a>
                        </div>
                      </div>
                    )}

                    {/* 機能説明 */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">📊 記録される情報</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                          <h5 className="font-medium text-gray-800">ユーザー登録シート</h5>
                          <ul className="mt-1 space-y-1 list-disc list-inside">
                            <li>登録日時</li>
                            <li>メールアドレス</li>
                            <li>ユーザー名</li>
                            <li>ログイン方法</li>
                          </ul>
                        </div>
                        <div>
                          <h5 className="font-medium text-gray-800">アクティビティログシート</h5>
                          <ul className="mt-1 space-y-1 list-disc list-inside">
                            <li>ログイン履歴</li>
                            <li>アクション詳細</li>
                            <li>タイムスタンプ</li>
                            <li>ユーザー情報</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-500">Google Sheets状態を確認中...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}