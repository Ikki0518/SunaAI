"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import UserMenu from './UserMenu';
import ChatSidebar from './ChatSidebar';
import SunaLogo from '@/app/components/SunaLogo';
import { ChatSession, ChatMessage } from '@/app/types/chat';
import { ChatHistoryManager } from '@/app/utils/chatHistory';
import { useDeviceDetection } from '@/app/hooks/useDeviceDetection';
import MobileChatPage from './MobileChatPage';

export default function ClientChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { isMobile, mounted: deviceMounted } = useDeviceDetection();

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'connected' | 'disconnected' | 'syncing'>('disconnected');

  useEffect(() => {
    setMounted(true);
    // 認証されている場合のみ同期状況をチェック（ゲストユーザーの場合はスキップ）
    if (status === "authenticated" && session?.user?.id) {
      checkSyncStatus();
    } else if (status === "unauthenticated") {
      // ゲストユーザーの場合は即座にローカルモードに設定
      setSyncStatus('disconnected');
    }
  }, [status]);

  useEffect(() => {
    if (mounted && !currentSession && status !== "loading") {
      const newSession = ChatHistoryManager.createNewSession();
      setCurrentSession(newSession);
      setMessages([]);
      setConversationId(null);
    }
  }, [mounted, currentSession, status]);

  const checkSyncStatus = async () => {
    console.log('🔄 [SYNC STATUS] Starting sync status check...');
    
    // 認証されていない場合は即座にローカルモードに設定
    if (!session?.user?.id) {
      console.log('👤 [SYNC STATUS] User not authenticated - local mode only');
      setSyncStatus('disconnected');
      return; // 重要: ここでAPIコールを行わない
    }
    
    console.log('🔄 [SYNC STATUS] User authenticated:', {
      userId: session.user.id?.slice(0, 8) + '...',
      email: session.user.email
    });
    
    try {
      setSyncStatus('syncing');
      console.log('🔄 [SYNC STATUS] Testing Supabase connection...');
      
      // 軽量な接続テスト（データ読み込みはしない）
      const response = await fetch('/api/chat-sessions', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        console.log('✅ [SYNC STATUS] Supabase connection successful');
        setSyncStatus('connected');
      } else {
        console.warn('⚠️ [SYNC STATUS] Supabase connection test failed:', response.status);
        setSyncStatus('disconnected');
      }
    } catch (error) {
      console.error('❌ [SYNC STATUS] Supabase connection failed:', error);
      console.error('❌ [SYNC STATUS] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      setSyncStatus('disconnected');
    }
  };

  const saveCurrentSession = useCallback(async () => {
    if (!mounted || !currentSession || messages.length === 0) return;
    const updatedSession: ChatSession = {
      ...currentSession,
      messages,
      conversationId: conversationId || undefined,
      title: messages.length > 0 ? ChatHistoryManager.generateSessionTitle(messages) : currentSession.title,
      updatedAt: Date.now(),
    };
    
    // 認証されている場合のみSupabase同期、されていない場合はローカルのみ
    if (session?.user?.id) {
      try {
        setSyncStatus('syncing');
        await ChatHistoryManager.syncChatSession(updatedSession, session.user.id);
        setSyncStatus('connected');
      } catch (error) {
        console.error('チャット保存エラー:', error);
        setSyncStatus('disconnected');
        // エラーが発生してもローカル保存は継続
        ChatHistoryManager.saveChatSession(updatedSession);
      }
    } else {
      // ゲストユーザーの場合はローカルストレージのみ
      ChatHistoryManager.saveChatSession(updatedSession);
      console.log('👤 [GUEST] Chat saved to localStorage only');
    }
  }, [mounted, currentSession, messages, conversationId, session?.user?.id]);

  useEffect(() => {
    if (messages.length > 0 && mounted && currentSession) {
      const timeoutId = setTimeout(() => {
        saveCurrentSession();
      }, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [messages, conversationId, mounted, currentSession, saveCurrentSession]);

  const handleNewChat = () => {
    saveCurrentSession();
    const newSession = ChatHistoryManager.createNewSession();
    setCurrentSession(newSession);
    setMessages([]);
    setConversationId(null);
  };

  const handleSessionSelect = (session: ChatSession) => {
    saveCurrentSession();
    setCurrentSession(session);
    setMessages(session.messages || []);
    setConversationId(session.conversationId || null);
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMessage = input;
    setInput("");
    const userMsg: ChatMessage = { role: "user", content: userMessage, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          conversationId: conversationId
        }),
      });
      const data = await res.json();
      if (res.ok && data.answer) {
        const botMsg: ChatMessage = { role: "bot", content: data.answer, timestamp: Date.now() };
        setMessages(prev => [...prev, botMsg]);
        if (data.conversationId) {
          setConversationId(data.conversationId);
        }
        
        // チャット完了後の自動同期確認は削除（無限ループ防止）
      } else {
        const errorMsg: ChatMessage = { role: "bot", content: "エラーが発生しました", timestamp: Date.now() };
        setMessages(prev => [...prev, errorMsg]);
      }
    } catch (error) {
      const errorMsg: ChatMessage = { role: "bot", content: "エラーが発生しました", timestamp: Date.now() };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const [isComposing, setIsComposing] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = () => {
    setIsComposing(false);
  };

  // モバイルデバイスの場合はMobileChatPageを表示
  if (deviceMounted && isMobile) {
    return <MobileChatPage />;
  }

  // 認証処理中またはマウント前は何も表示しない
  if (status === "loading" || !mounted) {
    return (
      <div className="h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-white relative overflow-hidden">
      <div
        className={`h-full flex flex-col overflow-hidden bg-white transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'ml-80' : 'ml-16'
        }`}
      >
        {/* ヘッダー - デスクトップ用 */}
        <div className="sticky top-0 z-50 bg-white border-b border-gray-100">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center relative">
                  <SunaLogo size="sm" />
                </div>
                {/* デバイス間同期状況表示 */}
                {session?.user && (
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      syncStatus === 'connected' ? 'bg-green-500' :
                      syncStatus === 'syncing' ? 'bg-yellow-500 animate-pulse' :
                      'bg-red-500'
                    }`}></div>
                    <span className={`text-xs font-medium ${
                      syncStatus === 'connected' ? 'text-green-600' :
                      syncStatus === 'syncing' ? 'text-yellow-600' :
                      'text-red-600'
                    }`} title={
                      syncStatus === 'connected' ? 'Supabaseに正常に接続されています。チャット履歴は全デバイスで同期されます。' :
                      syncStatus === 'syncing' ? 'Supabaseとの同期を確認中です...' :
                      'Supabaseとの接続に問題があります。チャットはローカルに保存されますが、デバイス間同期はできません。'
                    }>
                      {syncStatus === 'connected' ? 'デバイス間同期' :
                       syncStatus === 'syncing' ? '同期中...' :
                       'ローカルのみ'}
                    </span>
                    {syncStatus === 'disconnected' && (
                      <button
                        onClick={checkSyncStatus}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                        title="同期状況を再確認"
                      >
                        再試行
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <UserMenu />
              </div>
            </div>
          </div>
        </div>

        {/* メインコンテンツ */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center px-6">
                <div className="text-center mb-8">
                  {session?.user?.name ? (
                    <h1 className="text-4xl font-normal text-gray-800 mb-2">
                      こんにちは、{session.user.name}さん
                    </h1>
                  ) : (
                    <h1 className="text-4xl font-normal text-gray-800 mb-2">
                      こんにちは
                    </h1>
                  )}
                  <p className="text-lg text-gray-500 mb-8">今日は何についてお話ししましょうか？</p>
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
                          <div className="relative flex items-center justify-center w-8 h-6">
                            <div
                              className="absolute w-3 h-3 bg-gradient-to-br from-cyan-200 to-cyan-300 rounded-full opacity-70"
                              style={{
                                animation: 'bubble-float 2s ease-in-out infinite',
                                animationDelay: '0s'
                              }}
                            ></div>
                            <div
                              className="absolute w-2 h-2 bg-gradient-to-br from-blue-200 to-blue-300 rounded-full opacity-80"
                              style={{
                                animation: 'bubble-float 2.5s ease-in-out infinite',
                                animationDelay: '0.8s',
                                left: '18px',
                                top: '2px'
                              }}
                            ></div>
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

          {/* フッター入力エリア - デスクトップ用 */}
          <div className="px-6 py-4 border-t border-gray-100 bg-white">
            <form
              onSubmit={e => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-end space-x-4"
            >
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
                rows={1}
                className="flex-1 resize-none px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50"
                placeholder="メッセージを入力..."
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-xl transition-all duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                送信
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* サイドバー - デスクトップ用 */}
      <ChatSidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        currentSessionId={currentSession?.id}
        onNewChat={handleNewChat}
        onSessionSelect={handleSessionSelect}
      />
    </div>
  );
}