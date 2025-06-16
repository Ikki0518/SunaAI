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

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    if (mounted && !currentSession && status !== "loading") {
      const newSession = ChatHistoryManager.createNewSession();
      setCurrentSession(newSession);
      setMessages([]);
      setConversationId(null);
    }
  }, [mounted, currentSession, status]);

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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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
                onKeyDown={handleKeyPress}
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