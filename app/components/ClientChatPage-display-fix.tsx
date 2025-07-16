"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import UserMenu from './UserMenu';
import ChatSidebar from './ChatSidebar';
import SunaLogo from '@/app/components/SunaLogo';
import { ChatSession, ChatMessage } from '@/app/types/chat';
import { ChatHistoryManager } from '@/app/utils/chatHistory';
import { useDeviceDetection } from '@/app/hooks/useDeviceDetection';
import MobileChatPage from './MobileChatPage';

export default function ClientChatPageDisplayFix() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { isMobile, mounted: deviceMounted } = useDeviceDetection();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'connected' | 'disconnected' | 'syncing'>('disconnected');
  const [isSaving, setIsSaving] = useState(false);

  // 自動スクロール関数
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  // メッセージが更新されたら自動スクロール
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    setMounted(true);
    if (status === "authenticated" && session?.user?.id) {
      checkSyncStatus();
    } else if (status === "unauthenticated") {
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
    if (!session?.user?.id) {
      setSyncStatus('disconnected');
      return;
    }
    
    try {
      setSyncStatus('syncing');
      const response = await fetch('/api/chat-sessions', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        setSyncStatus('connected');
      } else {
        setSyncStatus('disconnected');
      }
    } catch (error) {
      console.error('❌ [SYNC STATUS] Supabase connection failed:', error);
      setSyncStatus('disconnected');
    }
  };

  const saveCurrentSession = useCallback(async () => {
    if (!mounted || !currentSession || messages.length === 0 || isSaving) {
      return;
    }
    
    setIsSaving(true);
    
    try {
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
      
      if (session?.user?.id) {
        try {
          setSyncStatus('syncing');
          await ChatHistoryManager.syncChatSession(updatedSession, session.user.id);
          setSyncStatus('connected');
        } catch (error) {
          console.error('チャット保存エラー:', error);
          setSyncStatus('disconnected');
          ChatHistoryManager.saveChatSession(updatedSession);
        }
      } else {
        ChatHistoryManager.saveChatSession(updatedSession);
      }
    } finally {
      setIsSaving(false);
    }
  }, [mounted, currentSession, messages, conversationId, session?.user?.id, isSaving]);

  useEffect(() => {
    if (messages.length > 0 && mounted && currentSession) {
      const timeoutId = setTimeout(() => {
        saveCurrentSession().then(() => {
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('chatHistoryUpdated'));
          }, 100);
        });
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [messages.length, conversationId, mounted, currentSession, saveCurrentSession]);

  const handleNewChat = async () => {
    if (currentSession && messages.length > 0) {
      try {
        await saveCurrentSession();
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('chatHistoryUpdated'));
        }, 100);
      } catch (error) {
        console.error('❌ [NEW CHAT] Failed to save current session:', error);
      }
    }
    
    const newSession = ChatHistoryManager.createNewSession();
    setCurrentSession(newSession);
    setMessages([]);
    setConversationId(null);
  };

  const handleSessionSelect = async (chatSession: ChatSession) => {
    saveCurrentSession();
    
    setCurrentSession(chatSession);
    setConversationId(chatSession.conversationId || null);
    
    try {
      let messages = chatSession.messages || [];
      
      if (session?.user?.id && chatSession.id) {
        const supabaseMessages = await ChatHistoryManager.loadMessagesFromSupabase(chatSession.id);
        messages = supabaseMessages;
      }
      
      const uniqueMessages = messages.filter((message, index, array) =>
        array.findIndex(m =>
          m.timestamp === message.timestamp &&
          m.role === message.role &&
          m.content === message.content
        ) === index
      );
      
      setMessages(uniqueMessages);
    } catch (error) {
      console.error('❌ [SESSION SELECT] Failed to load messages:', error);
      setMessages(chatSession.messages || []);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    if (!currentSession) {
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
        
        setTimeout(() => {
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

  const handleToggleFavorite = (index: number) => {
    setMessages(prev => {
      const newMessages = [...prev];
      newMessages[index] = {
        ...newMessages[index],
        isFavorite: !newMessages[index].isFavorite
      };
      
      if (currentSession) {
        const updatedSession = {
          ...currentSession,
          messages: newMessages,
          updatedAt: Date.now()
        };
        setCurrentSession(updatedSession);
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

  if (deviceMounted && isMobile) {
    return <MobileChatPage />;
  }

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

  // お気に入りメッセージを分離
  const favoriteMessages = messages.filter(msg => msg.isFavorite);
  const regularMessages = messages.filter(msg => !msg.isFavorite);

  return (
    <div className="h-screen bg-white relative overflow-hidden">
      <div
        className={`h-full flex flex-col overflow-hidden bg-white transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'ml-80' : 'ml-16'
        }`}
      >
        {/* ヘッダー */}
        <div className="sticky top-0 z-50 bg-white border-b border-gray-100">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center relative">
                  <SunaLogo size="sm" />
                </div>
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
                    }`}>
                      {syncStatus === 'connected' ? 'デバイス間同期' :
                       syncStatus === 'syncing' ? '同期中...' :
                       'ローカルのみ'}
                    </span>
                    {syncStatus === 'disconnected' && (
                      <button
                        onClick={checkSyncStatus}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
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
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto" 
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
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
                      if (loading) return;
                      
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
                          
                          setTimeout(() => {
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
              <div className="max-w-3xl mx-auto px-6 py-8">
                {/* お気に入りメッセージがある場合は上部に表示 */}
                {favoriteMessages.length > 0 && (
                  <div className="mb-8 pb-8 border-b border-gray-200">
                    <h3 className="text-sm font-medium text-gray-600 mb-4 flex items-center">
                      <svg className="w-4 h-4 text-yellow-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      お気に入りメッセージ
                    </h3>
                    <div className="space-y-4">
                      {favoriteMessages.map((msg, idx) => {
                        const originalIndex = messages.findIndex(m => 
                          m.timestamp === msg.timestamp && 
                          m.role === msg.role && 
                          m.content === msg.content
                        );
                        return (
                          <div key={`fav-${msg.timestamp}`} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-2xl ${msg.role === "user" ? "order-2" : "order-1"} relative group`}>
                              <div
                                className={`px-6 py-4 rounded-2xl ${
                                  msg.role === "user"
                                    ? "bg-blue-500 text-white"
                                    : "bg-gray-100 text-gray-900"
                                } ring-2 ring-yellow-400`}
                              >
                                <div className={`flex items-center justify-between mb-2`}>
                                  <div className={`text-sm font-medium ${msg.role === "user" ? "text-blue-100" : "text-gray-600"}`}>
                                    {msg.role === "user" ? "あなた" : "Suna"}
                                  </div>
                                  <button
                                    onClick={() => handleToggleFavorite(originalIndex)}
                                    className={`ml-2 p-1 rounded-full transition-all duration-200 ${
                                      msg.role === "user" 
                                        ? "hover:bg-blue-400" 
                                        : "hover:bg-gray-200"
                                    }`}
                                    title="お気に入りを解除"
                                  >
                                    <svg
                                      className="w-5 h-5 text-yellow-400 fill-current"
                                      fill="currentColor"
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
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 通常のメッセージ（時系列順） */}
                <div className="space-y-4">
                  {regularMessages.map((msg, idx) => {
                    const originalIndex = messages.findIndex(m => 
                      m.timestamp === msg.timestamp && 
                      m.role === msg.role && 
                      m.content === msg.content
                    );
                    return (
                      <div key={`${msg.role}-${msg.timestamp}`} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-2xl ${msg.role === "user" ? "order-2" : "order-1"} relative group`}>
                          <div
                            className={`px-6 py-4 rounded-2xl ${
                              msg.role === "user"
                                ? "bg-blue-500 text-white"
                                : "bg-gray-100 text-gray-900"
                            }`}
                          >
                            <div className={`flex items-center justify-between mb-2`}>
                              <div className={`text-sm font-medium ${msg.role === "user" ? "text-blue-100" : "text-gray-600"}`}>
                                {msg.role === "user" ? "あなた" : "Suna"}
                              </div>
                              <button
                                onClick={() => handleToggleFavorite(originalIndex)}
                                className={`ml-2 p-1 rounded-full transition-all duration-200 ${
                                  msg.role === "user" 
                                    ? "hover:bg-blue-400" 
                                    : "hover:bg-gray-200"
                                } opacity-0 group-hover:opacity-100`}
                                title="お気に入りに追加"
                              >
                                <svg
                                  className={`w-5 h-5 ${
                                    msg.role === "user" 
                                      ? "text-blue-200" 
                                      : "text-gray-400"
                                  }`}
                                  fill="none"
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
                    );
                  })}
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
                {/* 自動スクロール用の要素 */}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* フッター入力エリア */}
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

      {/* サイドバー */}
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