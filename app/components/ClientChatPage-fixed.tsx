"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import UserMenu from './UserMenu';
import ChatSidebar from './ChatSidebar';
import SunaLogo from '@/app/components/SunaLogo';
import { ChatSession, ChatMessage } from '@/app/types/chat';
import { ChatHistoryManager } from '@/app/utils/chatHistory';

export default function ClientChatPageFixed() {
  const { data: session, status } = useSession();
  const router = useRouter();
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
  
  // モバイル用チャット履歴表示
  const [showChatList, setShowChatList] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);

  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    setTimeout(scrollToBottom, 100);
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

  // モバイル用チャット履歴読み込み
  const loadChatHistory = async () => {
    try {
      setSyncStatus('syncing');
      
      ChatHistoryManager.cleanupDuplicateSessions();
      
      if (session?.user?.id) {
        const sessions = await ChatHistoryManager.loadAllSessions(session.user.id);
        const deduplicatedSessions = ChatHistoryManager.deduplicateSessionsByTitle(sessions);
        setChatSessions(deduplicatedSessions);
        setSyncStatus('connected');
      } else {
        const localSessions = ChatHistoryManager.getSortedSessions();
        setChatSessions(localSessions);
        setSyncStatus('disconnected');
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
      setSyncStatus('disconnected');
      const localSessions = ChatHistoryManager.getSortedSessions();
      setChatSessions(localSessions);
    }
  };

  useEffect(() => {
    if (mounted && status !== "loading") {
      loadChatHistory();
    }
  }, [mounted, status]);

  useEffect(() => {
    if (!mounted || !session?.user?.id) return;

    const cleanup = ChatHistoryManager.setupLocalSyncListener(() => {
      loadChatHistory();
    });

    return cleanup;
  }, [mounted, session?.user?.id]);

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
    setShowChatList(false); // モバイル用
  };

  const handleSessionSelect = async (chatSession: ChatSession) => {
    saveCurrentSession();
    
    setCurrentSession(chatSession);
    setConversationId(chatSession.conversationId || null);
    setShowChatList(false); // モバイル用
    
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

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  if (status === "loading" || !mounted) {
    return (
      <div className="h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">{'読み込み中...'}</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">{'認証中...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-white relative overflow-hidden">
      {/* PC用サイドバー（デスクトップでのみ表示） */}
      <div className="hidden md:block">
        <ChatSidebar
          isOpen={sidebarOpen}
          onToggle={toggleSidebar}
          currentSessionId={currentSession?.id}
          onNewChat={handleNewChat}
          onSessionSelect={handleSessionSelect}
        />
      </div>

      {/* メインコンテンツエリア */}
      <div
        className={`h-full flex flex-col bg-white transition-all duration-300 ease-in-out
          md:ml-16 ${sidebarOpen ? 'md:ml-80' : 'md:ml-16'}
        `}
      >
        {/* ヘッダー - レスポンシブデザイン */}
        <div className="bg-white border-b border-gray-100 
                       fixed top-0 left-0 right-0 z-50 md:static md:z-auto
                       px-4 py-3 md:px-6 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 md:space-x-4">
              {/* モバイル用ハンバーガーメニュー */}
              <button
                onClick={() => setShowChatList(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors md:hidden"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              <div className="flex items-center relative">
                <SunaLogo size="sm" />
              </div>
              
              {session?.user && (
                <div className="flex items-center space-x-1 md:space-x-2">
                  <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${
                    syncStatus === 'connected' ? 'bg-green-500' :
                    syncStatus === 'syncing' ? 'bg-yellow-500 animate-pulse' :
                    'bg-red-500'
                  }`}></div>
                                     <span className={`text-xs font-medium ${
                     syncStatus === 'connected' ? 'text-green-600' :
                     syncStatus === 'syncing' ? 'text-yellow-600' :
                     'text-red-600'
                   }`}>
                     {syncStatus === 'connected' ? 
                       <>
                         <span className="hidden md:inline">デバイス間同期</span>
                         <span className="md:hidden">同期</span>
                       </>
                      :
                      syncStatus === 'syncing' ? 
                       <>
                         <span className="hidden md:inline">同期中...</span>
                         <span className="md:hidden">...</span>
                       </>
                      :
                       <>
                         <span className="hidden md:inline">ローカルのみ</span>
                         <span className="md:hidden">ローカル</span>
                       </>
                     }
                   </span>
                  {syncStatus === 'disconnected' && (
                    <button
                      onClick={checkSyncStatus}
                      className="text-xs text-blue-600 hover:text-blue-800 underline hidden md:inline"
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

        {/* メインコンテンツ - レスポンシブデザイン */}
        <div className="flex-1 flex flex-col overflow-hidden 
                       pt-16 pb-20 md:pt-0 md:pb-0">
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto" 
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center px-4 md:px-6">
                <div className="text-center mb-8">
                  {session?.user?.name ? (
                    <h1 className="text-2xl md:text-4xl font-normal text-gray-800 mb-2">
                      こんにちは、{session.user.name}さん
                    </h1>
                  ) : (
                    <h1 className="text-2xl md:text-4xl font-normal text-gray-800 mb-2">
                      こんにちは
                    </h1>
                  )}
                  <p className="text-base md:text-lg text-gray-500 mb-6 md:mb-8">今日は何についてお話ししましょうか？</p>
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
                    className={`group relative inline-flex items-center justify-center px-6 py-3 md:px-8 md:py-4 font-bold text-white transition-all duration-200 ease-in-out transform bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl md:rounded-2xl hover:from-blue-600 hover:to-blue-700 hover:scale-105 hover:shadow-xl ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span className="absolute inset-0 w-full h-full transition duration-200 ease-out transform translate-x-1 translate-y-1 bg-gradient-to-r from-blue-600 to-blue-700 group-hover:-translate-x-0 group-hover:-translate-y-0"></span>
                    <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-500 to-blue-600 border-2 border-blue-600 group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-blue-700"></span>
                    <span className="relative flex items-center space-x-2">
                      <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span className="text-base md:text-lg">チャットを始める</span>
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-4 py-6 md:px-6 md:py-8 w-full space-y-4">
                {messages.map((msg, idx) => (
                  <div key={`${msg.role}-${msg.timestamp}`} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] md:max-w-2xl ${msg.role === "user" ? "order-2" : "order-1"} relative group`}>
                      <div
                        className={`px-4 py-3 md:px-6 md:py-4 rounded-xl md:rounded-2xl ${
                          msg.role === "user"
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 text-gray-900"
                        } ${msg.isFavorite ? 'ring-2 ring-yellow-400' : ''}`}
                      >
                        <div className={`flex items-center justify-between mb-1 md:mb-2`}>
                          <div className={`text-xs md:text-sm font-medium ${msg.role === "user" ? "text-blue-100" : "text-gray-600"}`}>
                            {msg.role === "user" ? "あなた" : "Suna"}
                          </div>
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
                              className={`w-4 h-4 md:w-5 md:h-5 ${
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
                        <div className="whitespace-pre-wrap leading-relaxed text-sm md:text-base">
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] md:max-w-2xl">
                      <div className="px-4 py-3 md:px-6 md:py-4 rounded-xl md:rounded-2xl bg-gray-100">
                        <div className="text-xs md:text-sm font-medium mb-1 md:mb-2 text-gray-600">Suna</div>
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
                          <span className="text-gray-500 text-xs md:text-sm">{'考えています...'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* フッター入力エリア - レスポンシブデザイン */}
          <div className="bg-white border-t border-gray-100 
                         fixed bottom-0 left-0 right-0 z-50 md:static md:z-auto
                         px-4 py-3 md:px-6 md:py-4">
            <form
              onSubmit={e => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-end space-x-3 md:space-x-4"
            >
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
                rows={1}
                style={{ fontSize: '16px' }} // iOS Safari ズーム防止
                className="flex-1 resize-none px-3 py-2 md:px-4 md:py-3 border border-gray-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white md:bg-gray-50 text-sm md:text-base"
                placeholder="メッセージを入力..."
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 md:py-3 md:px-8 rounded-lg md:rounded-xl transition-all duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm md:text-base"
              >
                送信
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* モバイル用チャット履歴モーダル */}
      <div className={`md:hidden fixed inset-0 z-60 transition-transform duration-300 ease-in-out ${
        showChatList ? 'translate-y-0' : 'translate-y-full'
      }`}>
        <div className="h-full bg-white flex flex-col">
          {/* ヘッダー */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
            <h2 className="text-xl font-bold text-gray-900">チャット履歴</h2>
            <button
              onClick={() => setShowChatList(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 新規チャットボタン */}
          <div className="p-4 border-b border-gray-200">
            <button
              onClick={handleNewChat}
              className="w-full flex items-center justify-center space-x-3 px-6 py-4 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors shadow-sm"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-lg font-semibold">新しいチャットを始める</span>
            </button>
          </div>

          {/* チャット履歴リスト */}
          <div className="flex-1 overflow-y-auto">
            {chatSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 px-8">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h8m-8 0V8a4 4 0 118 0v4m-8 0v4a4 4 0 108 0v-4" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">まだチャットがありません</h3>
                <p className="text-center text-gray-500">上のボタンから新しいチャットを始めてみましょう！</p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {chatSessions.map((chatSession) => (
                  <div
                    key={chatSession.id}
                    onClick={() => handleSessionSelect(chatSession)}
                    className={`p-4 rounded-xl transition-all cursor-pointer border-2 ${
                      currentSession?.id === chatSession.id 
                        ? 'bg-blue-50 border-blue-200 shadow-sm' 
                        : 'bg-gray-50 border-transparent hover:bg-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 text-base truncate">
                          {chatSession.title}
                        </h4>
                        <p className="text-sm text-gray-500 mt-1">
                          {(() => {
                            try {
                              if (!chatSession.updatedAt || isNaN(chatSession.updatedAt) || chatSession.updatedAt <= 0) {
                                return '不明';
                              }
                              const date = new Date(chatSession.updatedAt);
                              if (isNaN(date.getTime())) {
                                return '不明';
                              }
                              return date.toLocaleDateString('ja-JP', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              });
                            } catch (error) {
                              console.warn('⚠️ Date formatting error:', chatSession.updatedAt, error);
                              return '不明';
                            }
                          })()}
                        </p>
                        {chatSession.messages && chatSession.messages.length > 0 && (
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                            {chatSession.messages[chatSession.messages.length - 1]?.content?.slice(0, 80)}...
                          </p>
                        )}
                      </div>
                      {currentSession?.id === chatSession.id && (
                        <div className="flex-shrink-0">
                          <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}