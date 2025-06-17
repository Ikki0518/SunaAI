'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { ChatMessage, ChatSession } from '@/app/types/chat';
import { ChatHistoryManager } from '@/app/utils/chatHistory';
import SunaLogo from './SunaLogo';
import UserMenu from './UserMenu';

export default function MobileChatPage() {
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [showChatList, setShowChatList] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);

  useEffect(() => {
    setMounted(true);
    loadChatHistory();
  }, []);

  const loadChatHistory = () => {
    try {
      const sessions = ChatHistoryManager.getSortedSessions();
      setChatSessions(sessions);
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setConversationId(null);
    setCurrentSession(null);
    setShowChatList(false);
  };

  const handleSessionSelect = (session: ChatSession) => {
    setMessages(session.messages);
    setConversationId(session.conversationId || null);
    setCurrentSession(session);
    setShowChatList(false);
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    const userMsg: ChatMessage = { role: "user", content: userMessage, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);

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
        const newMessages = [...messages, userMsg, botMsg];
        setMessages(newMessages);
        
        if (data.conversationId) {
          setConversationId(data.conversationId);
          
          // セッション保存
          try {
            const sessionToSave: ChatSession = {
              id: currentSession?.id || `session_${Date.now()}`,
              title: currentSession?.title || `${userMessage.slice(0, 30)}...`,
              messages: newMessages,
              conversationId: data.conversationId,
              createdAt: currentSession?.createdAt || Date.now(),
              updatedAt: Date.now()
            };
            
            ChatHistoryManager.saveChatSession(sessionToSave);
            setCurrentSession(sessionToSave);
            loadChatHistory();
          } catch (error) {
            console.error('Failed to save chat session:', error);
          }
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
    <div className="h-screen bg-white relative overflow-hidden flex flex-col">
      {/* モバイル用固定ヘッダー */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowChatList(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <SunaLogo size="sm" />
          </div>
          <div className="flex items-center">
            <UserMenu />
          </div>
        </div>
      </div>

      {/* メインコンテンツエリア */}
      <div className="flex-1 overflow-hidden pt-16 pb-20">
        <div className="h-full overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center px-4">
              <div className="text-center mb-8">
                {session?.user?.name ? (
                  <h1 className="text-2xl font-normal text-gray-800 mb-2">
                    こんにちは、{session.user.name}さん
                  </h1>
                ) : (
                  <h1 className="text-2xl font-normal text-gray-800 mb-2">
                    こんにちは
                  </h1>
                )}
                <p className="text-base text-gray-500 mb-6">今日は何についてお話ししましょうか？</p>
                <button
                  onClick={() => {
                    setInput("こんにちは");
                    handleSend();
                  }}
                  className="inline-flex items-center justify-center px-6 py-3 font-bold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  チャットを始める
                </button>
              </div>
            </div>
          ) : (
            <div className="px-4 py-6 space-y-4">
              {messages.map((msg, idx) => (
                <div key={`${msg.role}-${idx}`} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] ${msg.role === "user" ? "order-2" : "order-1"}`}>
                    <div
                      className={`px-4 py-3 rounded-xl ${
                        msg.role === "user"
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      <div className={`text-xs font-medium mb-1 ${msg.role === "user" ? "text-blue-100" : "text-gray-600"}`}>
                        {msg.role === "user" ? "あなた" : "Suna"}
                      </div>
                      <div className="whitespace-pre-wrap leading-relaxed text-sm">
                        {msg.content}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="max-w-[85%]">
                    <div className="px-4 py-3 rounded-xl bg-gray-100">
                      <div className="text-xs font-medium mb-1 text-gray-600">Suna</div>
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
                        <span className="text-gray-500 text-xs">考えています...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* モバイル用固定フッター */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 px-4 py-3">
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-end space-x-3"
        >
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            rows={1}
            style={{ fontSize: '16px' }} // iOS Safari ズーム防止
            className="flex-1 resize-none px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-gray-900 text-sm placeholder-gray-500"
            placeholder="メッセージを入力..."
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
          >
            送信
          </button>
        </form>
      </div>

      {/* モバイル用チャット選択画面（下から全画面スライドイン） */}
      <div className={`fixed inset-0 z-60 transition-transform duration-300 ease-in-out ${
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
                          {new Date(chatSession.updatedAt).toLocaleDateString('ja-JP', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
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