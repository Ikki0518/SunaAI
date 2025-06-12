"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useTheme } from "../contexts/ThemeContext";

export default function ProfilePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const [stats, setStats] = useState({
    totalChats: 0,
    totalMessages: 0,
    joinDate: "",
  });

  useEffect(() => {
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    // チャット統計を計算
    const chatHistory = localStorage.getItem('dify-chat-history');
    if (chatHistory) {
      try {
        const parsed = JSON.parse(chatHistory);
        const totalChats = parsed.sessions?.length || 0;
        const totalMessages = parsed.sessions?.reduce((sum: number, session: any) => sum + (session.messages?.length || 0), 0) || 0;
        
        setStats({
          totalChats,
          totalMessages,
          joinDate: new Date().toLocaleDateString('ja-JP'),
        });
      } catch (error) {
        console.error('Failed to parse chat history:', error);
      }
    }
  }, [session, router]);

  if (!session) {
    return null;
  }

  const userInitial = session.user?.name?.charAt(0).toUpperCase() || 'U';

  return (
    <div className={`min-h-screen ${resolvedTheme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'}`}>
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
              <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">プロフィール</h1>
              <p className="text-sm text-gray-500 mt-1">アカウント情報と利用統計</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* プロフィール情報 */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
            <div className="flex items-center space-x-6">
              {/* アバター */}
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                {userInitial}
              </div>
              
              {/* ユーザー情報 */}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900">{session.user?.name}</h2>
                <p className="text-gray-600 mt-1">{session.user?.email}</p>
                <p className="text-sm text-gray-500 mt-2">参加日: {stats.joinDate}</p>
              </div>

              {/* 編集ボタン */}
              <button
                onClick={() => router.push('/settings')}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>編集</span>
              </button>
            </div>
          </div>

          {/* 利用統計 */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">利用統計</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                <div className="text-3xl font-bold text-blue-600 mb-2">{stats.totalChats}</div>
                <div className="text-sm text-blue-700 font-medium">総チャット数</div>
              </div>
              
              <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                <div className="text-3xl font-bold text-green-600 mb-2">{stats.totalMessages}</div>
                <div className="text-sm text-green-700 font-medium">総メッセージ数</div>
              </div>
              
              <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                <div className="text-3xl font-bold text-purple-600 mb-2">
                  {stats.totalChats > 0 ? Math.round(stats.totalMessages / stats.totalChats) : 0}
                </div>
                <div className="text-sm text-purple-700 font-medium">平均メッセージ/チャット</div>
              </div>
            </div>
          </div>

          {/* アクティビティ */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">最近のアクティビティ</h3>
            
            <div className="space-y-4">
              {stats.totalChats > 0 ? (
                <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">チャットを開始しました</p>
                    <p className="text-xs text-gray-500">最近</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p>まだアクティビティがありません</p>
                  <p className="text-sm">チャットを始めてみましょう！</p>
                </div>
              )}
            </div>
          </div>

          {/* クイックアクション */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">クイックアクション</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => router.push('/')}
                className="flex items-center space-x-3 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">新しいチャット</h4>
                  <p className="text-sm text-gray-500">新しい会話を開始</p>
                </div>
              </button>

              <button
                onClick={() => router.push('/settings')}
                className="flex items-center space-x-3 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-10 h-10 bg-gray-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">設定</h4>
                  <p className="text-sm text-gray-500">アカウント設定を変更</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}