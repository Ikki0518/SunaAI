"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface UserStats {
  totalUsers: number;
  totalLogins: number;
  totalRecords: number;
  todayLogins: number;
  todaySignups: number;
  activeUsers: number;
  mode?: string;
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [bypassAuth, setBypassAuth] = useState(false);

  // 管理者権限チェック（確実な判定）
  const adminEmails = [
    'ikki_y0518@icloud.com',
    'ikkiyamamoto0518@gmail.com'
  ];
  
  // URLパラメータでバイパスモードをチェック（開発環境のみ）
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('bypass') === 'true' && process.env.NODE_ENV === 'development') {
      setBypassAuth(true);
      console.log('🔓 [ADMIN] Bypass mode activated (development only)');
    }
  }, []);
  
  const userEmail = session?.user?.email?.toLowerCase().trim();
  const isAdmin = bypassAuth || (userEmail && adminEmails.some(email => email.toLowerCase().trim() === userEmail));

  // デバッグ情報
  useEffect(() => {
    console.log('🐛 [ADMIN PAGE] Session status:', status);
    console.log('🐛 [ADMIN PAGE] Session data:', session);
    if (session?.user?.email) {
      console.log('🐛 [ADMIN PAGE] Current user email:', session.user.email);
      console.log('🐛 [ADMIN PAGE] User email (processed):', userEmail);
      console.log('🐛 [ADMIN PAGE] Admin emails array:', adminEmails);
      console.log('🐛 [ADMIN PAGE] Is admin:', isAdmin);
      console.log('🐛 [ADMIN PAGE] Bypass auth:', bypassAuth);
    }
  }, [session, userEmail, adminEmails, isAdmin, bypassAuth, status]);

  useEffect(() => {
    if (status === "loading") return;
    
    // バイパスモードの場合はセッションチェックをスキップ
    if (bypassAuth) {
      console.log('🔓 [ADMIN PAGE] Bypassing authentication checks');
      return;
    }
    
    if (!session) {
      console.log('🐛 [ADMIN PAGE] No session, redirecting to signin');
      router.push('/auth/signin');
      return;
    }
    if (!isAdmin) {
      console.log('🐛 [ADMIN PAGE] Not admin, redirecting to home');
      console.log('🐛 [ADMIN PAGE] User email:', session.user?.email);
      console.log('🐛 [ADMIN PAGE] Admin check details:', {
        email: session.user?.email,
        processedEmail: userEmail,
        adminEmails: adminEmails,
        isAdmin: isAdmin
      });
      alert(`アクセス拒否: ${session.user?.email} は管理者権限がありません`);
      router.push('/');
      return;
    }
    console.log('🐛 [ADMIN PAGE] Admin access granted');
  }, [session, status, isAdmin, router, userEmail, adminEmails, bypassAuth]);

  // 統計データを取得
  const [debugInfo, setDebugInfo] = useState<any>(null);
  
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
          setDebugInfo(data.debug);
          console.log('📊 統計データ:', data);
        } else {
          const errorData = await response.json();
          console.error('統計データ取得エラー:', errorData);
          setDebugInfo({ error: errorData });
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
        setDebugInfo({ error: error instanceof Error ? error.message : String(error) });
      } finally {
        setLoading(false);
      }
    };

    if (session || bypassAuth) {
      fetchStats();
    }
  }, [session, bypassAuth]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center animate-pulse">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-gray-500">読み込み中...</p>
        </div>
      </div>
    );
  }

  // バイパスモードまたは管理者権限がある場合のみ表示
  if (!bypassAuth && !session) {
    return null;
  }
  
  if (!bypassAuth && !isAdmin) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">アクセス拒否</h1>
          <p className="text-gray-600 mb-4">管理者権限が必要です</p>
          <p className="text-sm text-gray-500">ユーザー: {session?.user?.email || 'Unknown'}</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            チャット画面に戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* デバッグ情報 */}
        {bypassAuth && (
          <div className="mb-4 bg-yellow-100 border border-yellow-400 rounded-lg p-4">
            <h3 className="font-bold text-yellow-800 mb-2">🔓 バイパスモード有効</h3>
            <p className="text-sm text-yellow-700">認証チェックをスキップしています</p>
          </div>
        )}
        
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">📊 ユーザー統計ダッシュボード</h1>
              <p className="text-gray-600 mt-2">Sunaアプリケーションの利用統計</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors flex items-center space-x-2"
              >
                <span>🔄</span>
                <span>更新</span>
              </button>
              <button
                onClick={() => router.push(`/admin/dashboard${bypassAuth ? '?bypass=true' : ''}`)}
                className="px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors flex items-center space-x-2"
              >
                <span>🔧</span>
                <span>高度な管理ツール</span>
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
              >
                チャットに戻る
              </button>
            </div>
          </div>
        </div>

        {/* デバッグ情報 */}
        {debugInfo && (
          <div className="mb-6 bg-gray-100 rounded-lg p-4">
            <h3 className="font-bold text-gray-700 mb-2">🐛 デバッグ情報</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>環境: {debugInfo.environment || 'unknown'}</p>
              <p>Google Sheets連携: {debugInfo.hasGoogleSheets ? '有効' : '無効'}</p>
              <p>データモード: {stats?.mode || 'unknown'}</p>
              {debugInfo.errors && (
                <div className="mt-2 text-red-600">
                  <p className="font-semibold">エラー:</p>
                  {debugInfo.errors.map((error: string, index: number) => (
                    <p key={index} className="ml-2">• {error}</p>
                  ))}
                </div>
              )}
              <details className="mt-2">
                <summary className="cursor-pointer text-blue-600 hover:text-blue-800">詳細データ</summary>
                <pre className="mt-2 text-xs bg-white p-2 rounded overflow-auto">
                  {JSON.stringify({ stats, debugInfo }, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        )}

        {/* 統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">総ユーザー数</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.totalUsers || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">総ログイン数</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.totalLogins || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">総記録数</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.totalRecords || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">本日のログイン</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.todayLogins || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">本日の新規登録</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.todaySignups || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 情報セクション */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">📋 記録される情報</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">ユーザー情報</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• ユーザーID</li>
                <li>• 名前</li>
                <li>• メールアドレス</li>
                <li>• プロフィール画像</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">アクション情報</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 認証プロバイダー (Google/Credentials)</li>
                <li>• アクション種類 (新規登録/ログイン)</li>
                <li>• 日時</li>
                <li>• ユーザーエージェント</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 管理ツール案内 */}
        <div className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl border border-purple-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="font-medium text-gray-900">高度な管理ツール</h3>
                <p className="text-sm text-gray-600 mt-1">
                  リアルタイム監視、セキュリティイベント、詳細な分析機能を利用できます
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push(`/admin/dashboard${bypassAuth ? '?bypass=true' : ''}`)}
              className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors flex items-center space-x-2"
            >
              <span>🚀</span>
              <span>管理ダッシュボード</span>
            </button>
          </div>
        </div>

        {/* Google Sheets リンク */}
        <div className="mt-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl border border-green-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="font-medium text-gray-900">Google Sheets連携</h3>
              <p className="text-sm text-gray-600 mt-1">
                環境変数を設定すると、すべてのユーザーアクションがGoogle Sheetsに自動記録されます
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 