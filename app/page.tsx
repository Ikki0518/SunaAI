"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import UserMenu from './components/UserMenu';
import ChatSidebar from './components/ChatSidebar';
import SunaLogo from '@/app/components/SunaLogo';
import ForceAdminButton from '@/app/components/ForceAdminButton';
import { ChatSession, ChatMessage } from '@/app/types/chat';
import { ChatHistoryManager } from '@/app/utils/chatHistory';

// FORCE CACHE REFRESH - 2025/06/13 22:54 - ADMIN BUTTON FIX

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // 管理者権限チェック（複数の方法で確認）
  const userEmail = session?.user?.email?.toLowerCase().trim();
  const isAdminByEmail = userEmail === 'ikki_y0518@icloud.com' || userEmail === 'ikkiyamamoto0518@gmail.com';
  const isAdminBySession = (session?.user as any)?.isAdmin === true || (session?.user as any)?.role === 'admin';
  const isAdminById = session?.user?.id?.startsWith('admin-');
  const isAdmin = isAdminByEmail || isAdminBySession || isAdminById;
  
  // 強制的に管理者ボタンを表示（複数条件）
  const forceShowAdminButton = isAdmin || session?.user?.email === 'ikki_y0518@icloud.com';
  
  // 本番環境でのデバッグ用：管理者ボタンの表示状態を画面に表示
  const showDebugInfo = true; // 本番環境でのテスト用
  
  // デバッグ情報（本番環境でも表示）
  useEffect(() => {
    if (session?.user?.email) {
      console.log('🐛 [DEBUG] Current user email:', session.user.email);
      console.log('🐛 [DEBUG] User email (processed):', userEmail);
      console.log('🐛 [DEBUG] User ID:', session.user.id);
      console.log('🐛 [DEBUG] Full session user:', session.user);
      console.log('🐛 [DEBUG] Admin checks:', {
        isAdminByEmail,
        isAdminBySession,
        isAdminById,
        isAdmin,
        forceShowAdminButton
      });
      console.log('🐛 [DEBUG] Session details:', {
        originalEmail: session.user.email,
        processedEmail: userEmail,
        userId: session.user.id,
        userIdStartsWithAdmin: session.user.id?.startsWith('admin-'),
        sessionUserIsAdmin: (session.user as any)?.isAdmin,
        sessionUserRole: (session.user as any)?.role
      });
    }
  }, [session, isAdmin, userEmail, forceShowAdminButton, isAdminByEmail, isAdminBySession, isAdminById]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);

  // SSR回避
  useEffect(() => {
    setMounted(true);
  }, []);

  // 認証チェック
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🐛 [DEBUG] Auth status changed:', { status, hasSession: !!session, userId: session?.user?.id });
    }
    if (status === "unauthenticated") {
      if (process.env.NODE_ENV === 'development') {
        console.log('🐛 [DEBUG] Redirecting to signin - user not authenticated');
      }
      router.push('/auth/signin');
    }
  }, [status, router]);

  // 初期化時に新しいセッションを準備
  useEffect(() => {
    if (mounted && !currentSession) {
      // ページ読み込み時は常に新しいセッションから開始する
      const newSession = ChatHistoryManager.createNewSession();
      setCurrentSession(newSession);
      setMessages([]); // メッセージをクリア
      setConversationId(null); // 会話IDをクリア
    }
  }, [mounted]);

  // ドロップダウンメニューの外部クリック処理
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (adminDropdownOpen) {
        const target = event.target as Element;
        if (!target.closest('.admin-dropdown')) {
          setAdminDropdownOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [adminDropdownOpen]);

  // 管理者権限チェック関数
  const checkAdminAccess = useCallback((targetPath: string) => {
    if (!session?.user?.email) {
      alert('ログインが必要です');
      return;
    }
    
    const userEmail = session.user.email.toLowerCase().trim();
    const adminEmails = ['ikki_y0518@icloud.com', 'ikkiyamamoto0518@gmail.com'];
    
    if (adminEmails.includes(userEmail)) {
      router.push(targetPath);
      setAdminDropdownOpen(false);
    } else {
      alert('管理者権限が必要です。このアカウントでは管理者機能にアクセスできません。');
    }
  }, [session, router]);

  // セッション保存
  const saveCurrentSession = useCallback(() => {
    if (!mounted || !currentSession || messages.length === 0) return;

    const updatedSession: ChatSession = {
      ...currentSession,
      messages,
      conversationId: conversationId || undefined,
      title: messages.length > 0 ? ChatHistoryManager.generateSessionTitle(messages) : currentSession.title,
      updatedAt: Date.now(),
    };

    ChatHistoryManager.saveChatSession(updatedSession);
  }, [mounted, currentSession, messages, conversationId]);

  // メッセージが変更されたら自動保存
  useEffect(() => {
    if (messages.length > 0 && mounted && currentSession) {
      const timeoutId = setTimeout(() => {
        saveCurrentSession();
      }, 2000);

      return () => clearTimeout(timeoutId);
    }
  }, [messages, conversationId, mounted, currentSession, saveCurrentSession]);

  // 新しいチャット
  const handleNewChat = () => {
    saveCurrentSession();
    const newSession = ChatHistoryManager.createNewSession();
    setCurrentSession(newSession);
    setMessages([]);
    setConversationId(null);
  };

  // セッション選択
  const handleSessionSelect = (session: ChatSession) => {
    saveCurrentSession();
    setCurrentSession(session);
    setMessages(session.messages || []);
    setConversationId(session.conversationId || null);
  };

  // メッセージを送信
  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input;
    setInput("");
    const userMsg: ChatMessage = { role: "user", content: userMessage, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('🐛 [DEBUG] Sending chat request:', { message: userMessage, conversationId });
      }
      
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          conversationId: conversationId
        }),
      });

      if (process.env.NODE_ENV === 'development') {
        console.log('🐛 [DEBUG] Chat API response status:', res.status, res.statusText);
      }
      const data = await res.json();
      if (process.env.NODE_ENV === 'development') {
        console.log("🐛 [DEBUG] Chat API response data:", data);
      }

      if (res.ok && data.answer) {
        console.log("[ボット応答を追加]", data.answer);
        const botMsg: ChatMessage = { role: "bot", content: data.answer, timestamp: Date.now() };
        setMessages(prev => [...prev, botMsg]);
        
        // conversationIdを更新
        if (data.conversationId) {
          console.log("[conversation_id更新]", data.conversationId);
          setConversationId(data.conversationId);
        }
      } else {
        console.log("[エラー応答]", res.status, data);
        const errorMsg: ChatMessage = { role: "bot", content: "エラーが発生しました", timestamp: Date.now() };
        setMessages(prev => [...prev, errorMsg]);
      }
    } catch (error) {
      console.error("[エラー]", error);
      const errorMsg: ChatMessage = { role: "bot", content: "エラーが発生しました", timestamp: Date.now() };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 認証チェック中は何も表示しない
  if (status === "loading") {
    return null;
  }

  return (
    <div className="h-screen bg-white relative overflow-hidden">
      {/* 強制管理者ボタン - 複数配置で確実に表示 */}
      <ForceAdminButton />
      <ForceAdminButton />
      <ForceAdminButton />
      
      {/* メインコンテンツ */}
      <div
        className={`h-full flex flex-col overflow-hidden bg-white transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'ml-80' : 'ml-16'
        }`}
      >
        {/* 最上部管理者アクセスバー */}
        {session?.user?.email && (
          <div className="bg-yellow-400 text-black px-6 py-2 text-center font-bold">
            🚨 管理者テスト中: {session.user.email}
            <a
              href="/admin"
              className="ml-4 px-4 py-1 bg-black text-yellow-400 rounded hover:bg-gray-800 transition-colors"
            >
              管理者ダッシュボード
            </a>
          </div>
        )}
        
        {/* 大きな管理者アクセスボタン - 確実に表示 */}
        {session?.user?.email === 'ikki_y0518@icloud.com' && (
          <div className="fixed top-20 right-5 z-[9999999]">
            <a
              href="/admin"
              className="block bg-red-600 text-white px-8 py-4 rounded-lg shadow-2xl hover:bg-red-700 transition-all transform hover:scale-105 text-xl font-bold border-4 border-white"
            >
              🚨 管理者ダッシュボード 🚨
            </a>
          </div>
        )}
        
        {/* バイパスボタン - 全ユーザーに表示 */}
        {session?.user?.email && (
          <div className="fixed bottom-20 left-5 z-[9999999]">
            <a
              href="/admin?bypass=true"
              className="block bg-purple-600 text-white px-6 py-3 rounded-lg shadow-2xl hover:bg-purple-700 transition-all transform hover:scale-105 font-bold border-2 border-yellow-400"
            >
              🔓 管理者ダッシュボード（バイパス）
            </a>
          </div>
        )}
        
        {/* バイパスボタン - 全ユーザーに表示 */}
        {session?.user?.email && (
          <div className="fixed bottom-20 left-5 z-[9999999]">
            <a
              href="/admin?bypass=true"
              className="block bg-purple-600 text-white px-6 py-3 rounded-lg shadow-2xl hover:bg-purple-700 transition-all transform hover:scale-105 font-bold border-2 border-yellow-400"
            >
              🔓 管理者ダッシュボード（バイパス）
            </a>
          </div>
        )}
        {/* ヘッダー */}
        <div className="sticky top-0 z-[60] bg-white border-b border-gray-100">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center relative">
                  <SunaLogo size="sm" />
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {/* デバッグ情報表示（常に表示） */}
                {session && (
                  <div className="text-xs bg-yellow-100 border border-yellow-300 rounded px-3 py-2 mr-2 max-w-md">
                    <div className="font-bold mb-1">🐛 DEBUG INFO</div>
                    <div>Original: {session.user.email}</div>
                    <div>Processed: {userEmail}</div>
                    <div className={`font-bold ${isAdmin ? 'text-green-600' : 'text-red-600'}`}>
                      Admin: {isAdmin ? 'YES ✅' : 'NO ❌'}
                    </div>
                    <div className={`font-bold ${forceShowAdminButton ? 'text-green-600' : 'text-red-600'}`}>
                      Force Show: {forceShowAdminButton ? 'YES ✅' : 'NO ❌'}
                    </div>
                    {/* 緊急アクセス用リンク */}
                    {forceShowAdminButton && (
                      <div className="mt-2 pt-2 border-t border-yellow-400">
                        <button
                          onClick={() => checkAdminAccess('/admin')}
                          className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                        >
                          🚨 緊急管理者アクセス
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {/* 管理者ボタン - 絶対に表示 */}
                {session && (
                  <div className="relative admin-dropdown">
                    <button
                      onClick={() => setAdminDropdownOpen(!adminDropdownOpen)}
                      className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all duration-200 flex items-center space-x-2 text-sm font-medium shadow-lg hover:shadow-xl"
                      title="管理者メニュー"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <span>管理者</span>
                      <svg className={`w-4 h-4 transition-transform duration-200 ${adminDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {adminDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                        <button
                          onClick={() => checkAdminAccess('/admin')}
                          className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3"
                        >
                          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          <div>
                            <div className="font-medium">統計ダッシュボード</div>
                            <div className="text-xs text-gray-500">ユーザー統計を確認</div>
                          </div>
                        </button>
                        <button
                          onClick={() => checkAdminAccess('/admin/dashboard')}
                          className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3"
                        >
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <div>
                            <div className="font-medium">高度な管理ツール</div>
                            <div className="text-xs text-gray-500">ユーザー管理・セキュリティ</div>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {/* 右上管理者ボタン - 絶対表示 */}
                <a
                  href="/admin"
                  className="mr-3 px-6 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors shadow-xl border-2 border-red-800"
                  title="管理者ダッシュボード"
                  style={{ zIndex: 9999 }}
                >
                  🔧 管理者サイト
                </a>
                <UserMenu />
              </div>
            </div>
          </div>
        </div>

        {/* チャットエリア */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 緊急管理者アクセスバー */}
          {session?.user?.email && (
            <div className="bg-red-100 border-b border-red-200 px-6 py-3">
              <div className="flex items-center justify-between">
                <div className="text-red-700 text-sm">
                  🚨 管理者機能テスト中 - ユーザー: {session.user.email}
                </div>
                <a
                  href="/admin"
                  className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors shadow-lg"
                >
                  🔧 管理者ダッシュボード
                </a>
              </div>
            </div>
          )}
          {/* メッセージエリア */}
          <div className="flex-1 overflow-y-auto">
            {messages.length === 0 ? (
              /* 初期画面 */
              <div className="h-full flex flex-col items-center justify-center px-6">
                <div className="text-center mb-8">
                  {mounted && session?.user?.name ? (
                    <h1 className="text-4xl font-normal text-gray-800 mb-2">
                      こんにちは、{session.user.name}さん
                    </h1>
                  ) : (
                    <h1 className="text-4xl font-normal text-gray-800 mb-2">
                      こんにちは
                    </h1>
                  )}
                  <p className="text-lg text-gray-500 mb-8">今日は何についてお話ししましょうか？</p>
                  
                  {/* チャットを始めるボタン */}
                  <button
                    onClick={() => {
                      setInput("こんにちは");
                      handleSend();
                    }}
                    className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 ease-in-out transform bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl hover:from-blue-600 hover:to-blue-700 hover:scale-105 hover:shadow-xl"
                  >
                    <span className="absolute inset-0 w-full h-full transition duration-200 ease-out transform translate-x-1 translate-y-1 bg-gradient-to-r from-blue-600 to-blue-700 group-hover:-translate-x-0 group-hover:-translate-y-0"></span>
                    <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-500 to-blue-600 border-2 border-blue-600 group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-blue-700"></span>
                    <span className="relative flex items-center space-x-2">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span className="text-lg">チャットを始める</span>
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              /* メッセージ表示エリア */
              <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
                {messages.map((msg, idx) => (
                  <div key={`${msg.role}-${idx}`} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-2xl ${msg.role === "user" ? "order-2" : "order-1"}`}>
                      <div
                        className={`px-6 py-4 rounded-2xl ${
                          msg.role === "user"
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 text-gray-900"
                        }`}
                      >
                        <div className={`text-sm font-medium mb-2 ${msg.role === "user" ? "text-blue-100" : "text-gray-600"}`}>
                          {msg.role === "user" ? "あなた" : "Suna"}
                        </div>
                        <div className="whitespace-pre-wrap leading-relaxed">
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {loading && (
                  <div className="flex justify-start">
                    <div className="max-w-2xl">
                      <div className="px-6 py-4 rounded-2xl bg-gray-100">
                        <div className="text-sm font-medium mb-2 text-gray-600">Suna</div>
                        <div className="flex items-center space-x-3">
                          {/* 泡がぷくぷくするアニメーション */}
                          <div className="relative flex items-center justify-center w-8 h-6">
                            {/* 大きな泡 */}
                            <div
                              className="absolute w-3 h-3 bg-gradient-to-br from-cyan-200 to-cyan-300 rounded-full opacity-70"
                              style={{
                                animation: 'bubble-float 2s ease-in-out infinite',
                                animationDelay: '0s'
                              }}
                            ></div>
                            {/* 中くらいの泡 */}
                            <div
                              className="absolute w-2 h-2 bg-gradient-to-br from-blue-200 to-blue-300 rounded-full opacity-80"
                              style={{
                                animation: 'bubble-float 2.5s ease-in-out infinite',
                                animationDelay: '0.8s',
                                left: '18px',
                                top: '2px'
                              }}
                            ></div>
                            {/* 小さな泡 */}
                            <div
                              className="absolute w-1.5 h-1.5 bg-gradient-to-br from-teal-200 to-teal-300 rounded-full opacity-60"
                              style={{
                                animation: 'bubble-float 1.8s ease-in-out infinite',
                                animationDelay: '1.2s',
                                left: '8px',
                                top: '-2px'
                              }}
                            ></div>
                          </div>
                          <span className="text-gray-500 text-sm">考えています...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 入力エリア */}
          <div className="border-t border-gray-100 bg-white">
            <div className="max-w-3xl mx-auto px-6 py-6">
              <div className="relative">
                <div className="flex items-end space-x-4 bg-gray-50 rounded-3xl p-4 border border-gray-200">
                  <div className="flex-1">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Sunaに相談する"
                      className="w-full resize-none border-0 bg-transparent text-gray-900 placeholder-gray-500 focus:ring-0 focus:outline-none text-base leading-6"
                      rows={1}
                      style={{ minHeight: '24px', maxHeight: '120px' }}
                    />
                  </div>
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || loading}
                    className="flex-shrink-0 bg-blue-500 text-white p-3 rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* サイドバー（オーバーレイ） */}
      <ChatSidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onNewChat={handleNewChat}
        onSessionSelect={handleSessionSelect}
        currentSessionId={currentSession?.id}
      />
    </div>
  );
}