"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import UserMenu from './components/UserMenu';
import ChatSidebar from '@/app/components/ChatSidebar';
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

  // 認証チェック
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push('/auth/signin');
    }
  }, [session, status, router]);

  // 認証されていない場合は何も表示しない
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center animate-pulse">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h8m-8 0V8a4 4 0 118 0v4m-8 0v4a4 4 0 108 0v-4" />
            </svg>
          </div>
          <p className="text-gray-500">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  // 現在のセッションを保存
  const saveCurrentSession = useCallback(async () => {
    if (!session?.user?.email || !currentSession || messages.length === 0) return;

    const updatedSession: ChatSession = {
      ...currentSession,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: Date.now()
      })),
      conversationId: conversationId || undefined,
      title: messages.length > 0 ? ChatHistoryManager.generateSessionTitle(messages) : currentSession.title,
      updatedAt: Date.now(),
    };

    try {
      await ChatHistoryManager.saveChatSession(session.user.email, updatedSession);
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }, [session?.user?.email, currentSession, messages, conversationId]);

  // メッセージを送信
  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input;
    setInput("");
    const newUserMessage: ChatMessage = { role: "user", content: userMessage, timestamp: Date.now() };
    setMessages(prev => [...prev, newUserMessage]);
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
      console.log("[応答データ]", data);
      console.log("[現在のメッセージ数]", messages.length);

      if (res.ok && data.answer) {
        console.log("[ボット応答を追加]", data.answer);
        const botMessage: ChatMessage = { role: "bot", content: data.answer, timestamp: Date.now() };
        setMessages(prev => {
          const newMessages = [...prev, botMessage];
          console.log("[新しいメッセージ配列長さ]", newMessages.length);
          return newMessages;
        });
        // conversationIdを更新
        if (data.conversationId) {
          console.log("[conversation_id更新]", data.conversationId);
          setConversationId(data.conversationId);
        }
      } else {
        console.log("[エラー応答]", res.status, data);
        const errorMessage: ChatMessage = { role: "bot", content: "エラーが発生しました", timestamp: Date.now() };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error("[エラー]", error);
      const errorMessage: ChatMessage = { role: "bot", content: "エラーが発生しました", timestamp: Date.now() };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // 新しいチャットを開始
  const handleNewChat = useCallback(async () => {
    // 現在のセッションを保存
    await saveCurrentSession();
    
    // 新しいセッションを作成
    if (session?.user?.email) {
      const newSession = ChatHistoryManager.createNewSession(session.user.email);
      setCurrentSession(newSession);
      setMessages([]);
      setConversationId(null);
      setSidebarOpen(false);
    }
  }, [session?.user?.email, saveCurrentSession]);

  // セッションを選択
  const handleSessionSelect = useCallback(async (chatSession: ChatSession) => {
    // 現在のセッションを保存
    await saveCurrentSession();
    
    // 選択されたセッションを読み込み
    setCurrentSession(chatSession);
    setMessages(chatSession.messages || []);
    setConversationId(chatSession.conversationId || null);
    setSidebarOpen(false);
  }, [saveCurrentSession]);

  // 初期化時に新しいセッションを作成
  useEffect(() => {
    if (session?.user?.email && !currentSession) {
      const newSession = ChatHistoryManager.createNewSession(session.user.email);
      setCurrentSession(newSession);
    }
  }, [session?.user?.email, currentSession]);

  // メッセージが変更されたときにセッションを自動保存
  useEffect(() => {
    if (messages.length > 0) {
      const timeoutId = setTimeout(() => {
        saveCurrentSession();
      }, 2000); // 2秒後に保存

      return () => clearTimeout(timeoutId);
    }
  }, [messages, saveCurrentSession]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex">
      {/* サイドバー */}
      <ChatSidebar
        currentSessionId={currentSession?.id}
        onSessionSelect={handleSessionSelect}
        onNewChat={handleNewChat}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* メインコンテンツ */}
      <div className="flex-1 flex flex-col lg:ml-0">
        {/* ヘッダー */}
        <div className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 border-b border-gray-200/50">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* ハンバーガーメニュー */}
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Suna</h1>
                  <p className="text-sm text-gray-500 mt-1">AIアシスタント</p>
                </div>
              </div>
              <UserMenu />
            </div>
          </div>
        </div>

        {/* チャットエリア */}
        <div className="flex-1 overflow-hidden">
          <div className="max-w-4xl mx-auto px-6 py-8 h-full flex flex-col">
            {/* メッセージエリア */}
            <div className="flex-1 overflow-y-auto space-y-6">
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h8m-8 0V8a4 4 0 118 0v4m-8 0v4a4 4 0 108 0v-4" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">チャットを始めましょう</h3>
                  <p className="text-gray-500">何でもお気軽にお聞きください</p>
                </div>
              )}
              
              {messages.map((msg, idx) => (
                <div key={`${msg.role}-${idx}`} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-3xl ${msg.role === "user" ? "order-2" : "order-1"}`}>
                      <div
                        className={`px-6 py-4 rounded-2xl shadow-sm ${
                          msg.role === "user"
                            ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white ml-12"
                            : "bg-white border border-gray-200 mr-12"
                        }`}
                      >
                        <div className={`text-sm font-medium mb-2 ${msg.role === "user" ? "text-blue-100" : "text-gray-500"}`}>
                          {msg.role === "user" ? "あなた" : "Suna"}
                        </div>
                        <div className={`whitespace-pre-wrap leading-relaxed ${msg.role === "user" ? "text-white" : "text-gray-800"}`}>
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  </div>
              ))}
              
              {loading && (
                <div className="flex justify-start">
                  <div className="max-w-3xl mr-12">
                    <div className="px-6 py-4 rounded-2xl bg-white border border-gray-200 shadow-sm">
                      <div className="text-sm font-medium mb-2 text-gray-500">Suna</div>
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                        <span className="text-sm text-gray-500">考え中...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 入力エリア */}
        <div className="bg-white border-t border-gray-200 shadow-lg">
          <div className="max-w-4xl mx-auto px-4 py-2">
            <div className="bg-gray-50 rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center px-3 py-2">
                <textarea
                  className="flex-1 resize-none border-0 outline-none bg-transparent text-gray-900 placeholder-gray-500 text-sm leading-5 min-h-[20px] max-h-24"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="メッセージを入力してください..."
                  rows={1}
                />
                
                <button
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  className="ml-3 w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-lg transition-all duration-200 flex items-center justify-center shadow-sm hover:shadow-md disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}