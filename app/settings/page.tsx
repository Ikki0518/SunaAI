"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useTheme } from '../contexts/ThemeContext';

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { theme, setTheme, resolvedTheme } = useTheme();
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  
  // フォームの状態
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    selectedTheme: theme,
    notifications: true,
  });

  useEffect(() => {
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    
    // セッションからプロフィール情報を設定
    setFormData(prev => ({
      ...prev,
      name: session.user?.name || "",
      email: session.user?.email || "",
      selectedTheme: theme,
    }));
  }, [session, router, theme]);

  // 変更を検知
  useEffect(() => {
    if (!session) return;
    
    const hasProfileChanges = formData.name !== (session.user?.name || "");
    const hasThemeChanges = formData.selectedTheme !== theme;
    
    setHasChanges(hasProfileChanges || hasThemeChanges);
  }, [formData, session, theme]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveChanges = async () => {
    setLoading(true);
    setMessage("");

    try {
      // プロフィール更新
      if (formData.name !== (session?.user?.name || "")) {
        const response = await fetch('/api/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formData.name,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "プロフィール更新に失敗しました");
        }
      }

      // テーマ変更
      if (formData.selectedTheme !== theme) {
        setTheme(formData.selectedTheme);
      }

      setMessage("設定を保存しました！");
      setHasChanges(false);
      
      // セッションを更新するためにページをリロード
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error: any) {
      console.error('Settings save error:', error);
      setMessage(error.message || "設定の保存に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  const clearChatHistory = () => {
    if (confirm("チャット履歴をすべて削除しますか？この操作は元に戻せません。")) {
      localStorage.removeItem('dify-chat-history');
      setMessage("チャット履歴を削除しました。");
    }
  };

  if (!session) {
    return null;
  }

  return (
    <div className={`min-h-screen ${resolvedTheme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'}`}>
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-white/80 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center">
            <button
              onClick={() => router.back()}
              className="mr-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">設定</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">アカウントとアプリの設定</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* メッセージ表示 */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.includes("失敗") || message.includes("エラー") 
              ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800" 
              : "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800"
          }`}>
            {message}
          </div>
        )}

        <div className="space-y-8">
          {/* プロフィール設定 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">プロフィール</h2>
            
            <div className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  表示名
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="表示名を入力"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  メールアドレス
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  readOnly
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  placeholder="メールアドレス"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">メールアドレスは変更できません</p>
              </div>
            </div>
          </div>

          {/* アプリケーション設定 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">アプリケーション設定</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-xl">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">テーマ</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">アプリケーションの外観設定</p>
                </div>
                <select 
                  value={formData.selectedTheme}
                  onChange={(e) => handleInputChange('selectedTheme', e.target.value as 'light' | 'dark' | 'system')}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="light">ライト</option>
                  <option value="dark">ダーク</option>
                  <option value="system">システム</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-xl">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">通知</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">新しいメッセージの通知設定</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.notifications}
                    onChange={(e) => handleInputChange('notifications', e.target.checked)}
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-xl">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">チャット履歴</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">ローカルに保存されたチャット履歴を管理</p>
                </div>
                <button
                  onClick={clearChatHistory}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-sm"
                >
                  履歴削除
                </button>
              </div>
            </div>
          </div>

          {/* アカウント管理 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">アカウント管理</h2>
            
            <div className="space-y-4">
              <button className="w-full text-left p-4 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <h3 className="font-medium text-gray-900 dark:text-white">パスワード変更</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">アカウントのパスワードを変更</p>
              </button>

              <button className="w-full text-left p-4 border border-red-200 dark:border-red-800 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-600 dark:text-red-400">
                <h3 className="font-medium">アカウント削除</h3>
                <p className="text-sm text-red-500 dark:text-red-400">アカウントとすべてのデータを削除</p>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 固定保存ボタン */}
      {hasChanges && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={handleSaveChanges}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-full shadow-lg transition-all duration-200 flex items-center space-x-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>保存中...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>変更を保存</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}