"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import UserMenu from './components/UserMenu';
import ChatSidebar from './components/ChatSidebar';
import SunaLogo from '@/app/components/SunaLogo';
import { ChatSession, ChatMessage } from '@/app/types/chat';
import { ChatHistoryManager } from '@/app/utils/chatHistory';

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

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

  // 初期化時に新しいセッション作成
  useEffect(() => {
    if (mounted && !currentSession) {
      const newSession = ChatHistoryManager.createNewSession();
      setCurrentSession(newSession);
    }
  }, [mounted, currentSession]);

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
      {/* メインコンテンツ */}
      <div
        className={`h-full flex flex-col overflow-hidden bg-white transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'ml-80' : 'ml-16'
        }`}
      >
        {/* ヘッダー */}
        <div className="sticky top-0 z-[60] bg-white border-b border-gray-100">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center relative">
                  <SunaLogo size="sm" />
                </div>
              </div>
              <UserMenu />
            </div>
          </div>
        </div>

        {/* チャットエリア */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* メッセージエリア */}
          <div className="flex-1 overflow-y-auto">
            {messages.length === 0 ? (
              /* 初期画面 */
              <div className="h-full flex flex-col items-center justify-center px-6">
                <div className="text-center mb-16">
                  {mounted && session?.user?.name ? (
                    <h1 className="text-4xl font-normal text-gray-800 mb-2">
                      こんにちは、{session.user.name}さん
                    </h1>
                  ) : (
                    <h1 className="text-4xl font-normal text-gray-800 mb-2">
                      こんにちは
                    </h1>
                  )}
                  <p className="text-lg text-gray-500">今日は何についてお話ししましょうか？</p>
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