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

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
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

  // 管理者権限チェック
  const isAdmin = session?.user?.email === 'ikki_y0518@icloud.com' ||
                  session?.user?.email === 'ikkiyamamoto0518@gmail.com';

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session || !isAdmin) {
      router.push('/');
      return;
    }

    fetchDashboardData();
  }, [session, status, isAdmin, router]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // 統計情報を取得
      const statsResponse = await fetch('/api/admin/stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
        console.log('📊 統計データ:', statsData);
      }

      // ユーザー活動を取得
      const activitiesResponse = await fetch('/api/admin/activities');
      if (activitiesResponse.ok) {
        const activitiesData = await activitiesResponse.json();
        setActivities(activitiesData.activities || []);
        console.log('👥 活動データ:', activitiesData);
      }

      // セキュリティイベントを取得
      const securityResponse = await fetch('/api/admin/security-events');
      if (securityResponse.ok) {
        const securityData = await securityResponse.json();
        setSecurityEvents(securityData);
        console.log('🔒 セキュリティデータ:', securityData);
      }

      // Google Sheets状態を取得
      const sheetsResponse = await fetch('/api/admin/sheets-status');
      if (sheetsResponse.ok) {
        const sheetsData = await sheetsResponse.json();
        setSheetsStatus(sheetsData);
        console.log('📊 Google Sheets状態:', sheetsData);
      }

      // ユーザー一覧を取得
      const usersResponse = await fetch('/api/admin/users');
      if (usersResponse.ok) {
        const userData = await usersResponse.json();
        setUsersData(userData);
        console.log('👥 ユーザーデータ:', userData);
      }

    } catch (error) {
      console.error('ダッシュボードデータの取得に失敗:', error);
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

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!session || !isAdmin) {
    return null;
  }

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('ja-JP');
  };

  const getActionBadge = (action: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    if (action === '新規登録' || action === 'signup') {
      return `${baseClasses} bg-green-100 text-green-800`;
    }
    return `${baseClasses} bg-blue-100 text-blue-800`;
  };

  const getSecurityBadge = (type: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    switch (type) {
      case 'failed_login':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'suspicious_activity':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'multiple_attempts':
        return `${baseClasses} bg-orange-100 text-orange-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  return (
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
              <span className="text-sm text-gray-500">
                管理者: {session.user?.name}
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
                                {activity.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {activity.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {activity.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={getActionBadge(activity.action)}>
                          {activity.action}
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
                                    {activity.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {activity.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {activity.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={getActionBadge(activity.action)}>
                            {activity.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {activity.provider}
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
  );
}