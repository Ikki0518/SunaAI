"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { userServiceServer } from '../lib/userServiceServer';

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [profile, setProfile] = useState({
    name: "",
    email: "",
  });

  useEffect(() => {
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    
    // セッションからプロフィール情報を設定
    setProfile({
      name: session.user?.name || "",
      email: session.user?.email || "",
    });
  }, [session, router]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      // プロフィール更新のAPIを呼び出し（今回は表示のみ）
      setMessage("プロフィールを更新しました！");
    } catch (error) {
      setMessage("更新に失敗しました。");
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-white/80 border-b border-gray-200/50">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center">
            <button
              onClick={() => router.back()}
              className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">設定</h1>
              <p className="text-sm text-gray-500 mt-1">アカウントとアプリの設定</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* メッセージ表示 */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.includes("失敗") ? "bg-red-50 text-red-600 border border-red-200" : "bg-green-50 text-green-600 border border-green-200"
          }`}>
            {message}
          </div>
        )}

        <div className="space-y-8">
          {/* プロフィール設定 */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">プロフィール</h2>
            
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  表示名
                </label>
                <input
                  id="name"
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({...profile, name: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="表示名を入力"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  メールアドレス
                </label>
                <input
                  id="email"
                  type="email"
                  value={profile.email}
                  readOnly
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
                  placeholder="メールアドレス"
                />
                <p className="text-xs text-gray-500 mt-1">メールアドレスは変更できません</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200"
              >
                {loading ? "更新中..." : "プロフィール更新"}
              </button>
            </form>
          </div>

          {/* アプリケーション設定 */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">アプリケーション設定</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                <div>
                  <h3 className="font-medium text-gray-900">チャット履歴</h3>
                  <p className="text-sm text-gray-500">ローカルに保存されたチャット履歴を管理</p>
                </div>
                <button
                  onClick={clearChatHistory}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-sm"
                >
                  履歴削除
                </button>
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                <div>
                  <h3 className="font-medium text-gray-900">テーマ</h3>
                  <p className="text-sm text-gray-500">アプリケーションの外観設定</p>
                </div>
                <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option>ライト</option>
                  <option>ダーク</option>
                  <option>システム</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                <div>
                  <h3 className="font-medium text-gray-900">通知</h3>
                  <p className="text-sm text-gray-500">新しいメッセージの通知設定</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* アカウント管理 */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">アカウント管理</h2>
            
            <div className="space-y-4">
              <button className="w-full text-left p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                <h3 className="font-medium text-gray-900">パスワード変更</h3>
                <p className="text-sm text-gray-500">アカウントのパスワードを変更</p>
              </button>

              <button className="w-full text-left p-4 border border-red-200 rounded-xl hover:bg-red-50 transition-colors text-red-600">
                <h3 className="font-medium">アカウント削除</h3>
                <p className="text-sm text-red-500">アカウントとすべてのデータを削除</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}