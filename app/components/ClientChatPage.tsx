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
  const [isSaving, setIsSaving] = useState(false);

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
    if (!mounted || !currentSession || messages.length === 0 || isSaving) {
      if (isSaving) {
        console.log('⏸️ [SAVE] Skipping save - already saving');
      }
      return;
    }
    
    setIsSaving(true);
    
    try {
      console.log('💾 [SAVE] Saving current session:', {
        sessionId: currentSession.id,
        messageCount: messages.length,
        isManuallyRenamed: currentSession.isManuallyRenamed
      });
      
      // 手動でリネームされていない場合のみ自動生成
      const title = currentSession.isManuallyRenamed
        ? currentSession.title
        : (messages.length > 0 ? ChatHistoryManager.generateSessionTitle(messages) : currentSession.title);
      
      const updatedSession: ChatSession = {
        ...currentSession,
        messages,
        conversationId: conversationId || undefined,
        title,
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
    } finally {
      setIsSaving(false);
    }
  }, [mounted, currentSession, messages, conversationId, session?.user?.id, isSaving]);

  useEffect(() => {
    if (messages.length > 0 && mounted && currentSession) {
      // 即座にセッションを保存し、サイドバーを更新
      const timeoutId = setTimeout(() => {
        console.log('⏰ [AUTO SAVE] Saving session immediately...');
        saveCurrentSession().then(() => {
          // 保存完了後、サイドバーを更新
          setTimeout(() => {
            console.log('🔄 [AUTO SAVE] Refreshing sidebar after save...');
            window.dispatchEvent(new CustomEvent('chatHistoryUpdated'));
          }, 100);
        });
      }, 500); // 500msに短縮して即座に反映
      return () => clearTimeout(timeoutId);
    }
  }, [messages.length, conversationId, mounted, currentSession, saveCurrentSession]); // messagesではなくmessages.lengthを監視

  const handleNewChat = async () => {
    // 現在のセッションにメッセージがある場合は確実に保存する
    if (currentSession && messages.length > 0) {
      console.log('🔄 [NEW CHAT] Saving current session before creating new one...');
      try {
        await saveCurrentSession();
        console.log('✅ [NEW CHAT] Current session saved successfully');
        
        // サイドバーを更新して新しく保存されたセッションを表示
        setTimeout(() => {
          console.log('🔄 [NEW CHAT] Refreshing sidebar...');
          window.dispatchEvent(new CustomEvent('chatHistoryUpdated'));
        }, 100);
      } catch (error) {
        console.error('❌ [NEW CHAT] Failed to save current session:', error);
      }
    }
    
    console.log('➕ [NEW CHAT] Creating new session...');
    const newSession = ChatHistoryManager.createNewSession();
    setCurrentSession(newSession);
    setMessages([]);
    setConversationId(null);
    console.log('✅ [NEW CHAT] New session created:', newSession.id);
  };

  const handleSessionSelect = async (chatSession: ChatSession) => {
    // 現在のセッションを保存
    saveCurrentSession();
    
    console.log('🔄 [SESSION SELECT] Loading session:', chatSession.id, 'title:', chatSession.title);
    
    // セッションを設定
    setCurrentSession(chatSession);
    setConversationId(chatSession.conversationId || null);
    
    // メッセージを読み込み（認証済みの場合はSupabaseから、そうでなければローカルから）
    try {
      let messages = chatSession.messages || [];
      
      // 認証済みユーザーの場合、Supabaseから最新メッセージを読み込み
      if (session?.user?.id && chatSession.id) {
        console.log('🔄 [SESSION SELECT] Loading messages from Supabase for session:', chatSession.id);
        const supabaseMessages = await ChatHistoryManager.loadMessagesFromSupabase(chatSession.id);
        messages = supabaseMessages;
      }
      
      // メッセージの重複を除去（timestamp + role + contentベース）
      const uniqueMessages = messages.filter((message, index, array) =>
        array.findIndex(m =>
          m.timestamp === message.timestamp &&
          m.role === message.role &&
          m.content === message.content
        ) === index
      );
      
      console.log('📨 [SESSION SELECT] Loaded messages:', messages.length, '→ unique:', uniqueMessages.length);
      setMessages(uniqueMessages);
    } catch (error) {
      console.error('❌ [SESSION SELECT] Failed to load messages:', error);
      // エラー時はセッションに含まれているメッセージを使用
      setMessages(chatSession.messages || []);
    }
  };

  const handleSend = async () => {
    console.log('🔧 [CLIENT] handleSend called, input:', input, 'loading:', loading);
    console.log('🔧 [CLIENT] currentSession:', currentSession);
    
    if (!input.trim()) {
      console.log('🔧 [CLIENT] Input is empty, returning');
      return;
    }
    
    if (loading) {
      console.log('🔧 [CLIENT] Loading is true, returning');
      return;
    }
    
    if (!currentSession) {
      console.log('🔧 [CLIENT] No current session, creating new one');
      const newSession = ChatHistoryManager.createNewSession();
      setCurrentSession(newSession);
    }
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
        
        // メッセージ送信完了後、即座にサイドバーを更新
        setTimeout(() => {
          console.log('🔄 [CHAT] Refreshing sidebar after message...');
          window.dispatchEvent(new CustomEvent('chatHistoryUpdated'));
        }, 100);
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

  // お気に入りの切り替え処理
  const handleToggleFavorite = (index: number) => {
    setMessages(prev => {
      const newMessages = [...prev];
      // 実際のメッセージのインデックスを取得（ソート前の配列での位置）
      const sortedMessages = [...prev].sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return b.timestamp - a.timestamp;
      });
      const targetMessage = sortedMessages[index];
      const originalIndex = prev.findIndex(msg =>
        msg.timestamp === targetMessage.timestamp &&
        msg.role === targetMessage.role &&
        msg.content === targetMessage.content
      );
      
      if (originalIndex !== -1) {
        newMessages[originalIndex] = {
          ...newMessages[originalIndex],
          isFavorite: !newMessages[originalIndex].isFavorite
        };
      }
      
      // セッションを更新
      if (currentSession) {
        const updatedSession = {
          ...currentSession,
          messages: newMessages,
          updatedAt: Date.now()
        };
        setCurrentSession(updatedSession);
        // 保存処理をトリガー
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('chatHistoryUpdated'));
        }, 100);
      }
      
      return newMessages;
    });
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

  // 未認証の場合は何も表示しない（middlewareがリダイレクトを処理）
  if (status === "unauthenticated") {
    return (
      <div className="h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">認証中...</p>
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
                    onClick={async () => {
                      // 既に送信中の場合は何もしない
                      if (loading) return;
                      
                      // 直接メッセージを送信（入力フィールドを経由しない）
                      const userMessage = "こんにちは";
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
                          
                          // メッセージ送信完了後、即座にサイドバーを更新
                          setTimeout(() => {
                            console.log('🔄 [HELLO BUTTON] Refreshing sidebar after hello message...');
                            window.dispatchEvent(new CustomEvent('chatHistoryUpdated'));
                          }, 100);
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
                    }}
                    disabled={loading}
                    className={`group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 ease-in-out transform bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl hover:from-blue-600 hover:to-blue-700 hover:scale-105 hover:shadow-xl ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                {/* メッセージをソート: お気に入りが上、その後タイムスタンプ順 */}
                {[...messages]
                  .sort((a, b) => {
                    // まずお気に入りでソート
                    if (a.isFavorite && !b.isFavorite) return -1;
                    if (!a.isFavorite && b.isFavorite) return 1;
                    // 同じお気に入り状態なら、タイムスタンプでソート（新しい順）
                    return b.timestamp - a.timestamp;
                  })
                  .map((msg, idx) => (
                  <div key={`${msg.role}-${idx}-${msg.timestamp}`} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-2xl ${msg.role === "user" ? "order-2" : "order-1"} relative group`}>
                      <div
                        className={`px-6 py-4 rounded-2xl ${
                          msg.role === "user"
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 text-gray-900"
                        } ${msg.isFavorite ? 'ring-2 ring-yellow-400' : ''}`}
                      >
                        <div className={`flex items-center justify-between mb-2`}>
                          <div className={`text-sm font-medium ${msg.role === "user" ? "text-blue-100" : "text-gray-600"}`}>
                            {msg.role === "user" ? "あなた" : "Suna"}
                          </div>
                          {/* お気に入りボタン */}
                          <button
                            onClick={() => handleToggleFavorite(idx)}
                            className={`ml-2 p-1 rounded-full transition-all duration-200 ${
                              msg.role === "user"
                                ? "hover:bg-blue-400"
                                : "hover:bg-gray-200"
                            } ${msg.isFavorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                            title={msg.isFavorite ? "お気に入りを解除" : "お気に入りに追加"}
                          >
                            <svg
                              className={`w-5 h-5 ${
                                msg.isFavorite
                                  ? "text-yellow-400 fill-current"
                                  : msg.role === "user"
                                    ? "text-blue-200"
                                    : "text-gray-400"
                              }`}
                              fill={msg.isFavorite ? "currentColor" : "none"}
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                              />
                            </svg>
                          </button>
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
                console.log('🔧 [CLIENT] Form submitted');
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