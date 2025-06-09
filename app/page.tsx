"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ChatHistory, ChatSession, Message } from './types/chat';
import { chatHistoryUtils } from './utils/chatHistory';
import ChatSidebar from './components/ChatSidebar';
import UserMenu from './components/UserMenu';

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ChatHistory>({ sessions: [], currentSessionId: null });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // サイドバーは初期状態で閉じておく（オーバーレイ形式のため）
  // 必要に応じてユーザーが開く

  // 認証チェック
  useEffect(() => {
    if (status === "loading") return; // まだ読み込み中
    if (!session) {
      router.push('/auth/signin');
      return;
    }
  }, [session, status, router]);

  // サーバーから履歴を読み込み
  useEffect(() => {
    if (session) {
      const loadHistory = async () => {
        const savedHistory = await chatHistoryUtils.getHistory();
        setHistory(savedHistory);
        
        // ローカルからサーバーへの移行を試行
        await chatHistoryUtils.migrateLocalToServer();
      };
      loadHistory();
    }
  }, [session]);

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
    return null; // リダイレクト中
  }

  // 現在のセッションを取得
  const currentSession = chatHistoryUtils.getCurrentSession(history);
  const messages = currentSession?.messages || [];

  // 履歴を保存
  const saveHistory = async (newHistory: ChatHistory) => {
    setHistory(newHistory);
    await chatHistoryUtils.saveHistory(newHistory);
  };

  // 新しいチャットを開始
  const startNewChat = async () => {
    const newSession = chatHistoryUtils.createNewSession();
    const newHistory = chatHistoryUtils.addSession(history, newSession);
    await saveHistory(newHistory);
    setSidebarOpen(false); // 新しいチャット作成後にサイドバーを閉じる
  };

  // セッションを選択
  const selectSession = async (sessionId: string) => {
    const newHistory = chatHistoryUtils.setCurrentSession(history, sessionId);
    await saveHistory(newHistory);
    setSidebarOpen(false); // セッション選択後にサイドバーを閉じる
  };

  // セッションを削除
  const deleteSession = async (sessionId: string) => {
    const newHistory = await chatHistoryUtils.deleteSession(history, sessionId);
    await saveHistory(newHistory);
  };

  // セッションをピン留め/解除
  const pinSession = async (sessionId: string, isPinned: boolean) => {
    const newHistory = await chatHistoryUtils.pinSession(history, sessionId, isPinned);
    await saveHistory(newHistory);
  };

  // セッション名を変更
  const renameSession = async (sessionId: string, newTitle: string) => {
    const newHistory = await chatHistoryUtils.renameSession(history, sessionId, newTitle);
    await saveHistory(newHistory);
  };



  // メッセージを送信
  const handleSend = async () => {
    if (!input.trim()) return;

    let workingSession = currentSession;
    let workingHistory = history;

    // 現在のセッションがない場合は新しく作成
    if (!workingSession) {
      workingSession = chatHistoryUtils.createNewSession();
      workingHistory = chatHistoryUtils.addSession(history, workingSession);
    }

    // ユーザーメッセージを追加
    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: Date.now(),
    };

    workingSession = chatHistoryUtils.addMessageToSession(workingSession, userMessage);
    workingHistory = await chatHistoryUtils.updateSession(workingHistory, workingSession.id, workingSession);
    await saveHistory(workingHistory);

    const messageToSend = input;
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: messageToSend,
          conversationId: workingSession.conversationId,
        }),
      });

      const data = await res.json();
      
      // conversation_idを更新
      if (data.conversationId && !workingSession.conversationId) {
        workingSession.conversationId = data.conversationId;
      }

      // ボットメッセージを追加
      const botMessage: Message = {
        role: "bot",
        content: data.answer || "(no response)",
        timestamp: Date.now(),
      };

      workingSession = chatHistoryUtils.addMessageToSession(workingSession, botMessage);
      workingHistory = await chatHistoryUtils.updateSession(workingHistory, workingSession.id, workingSession);
      await saveHistory(workingHistory);

    } catch (e) {
      const errorMessage: Message = {
        role: "bot",
        content: "(エラーが発生しました)",
        timestamp: Date.now(),
      };

      workingSession = chatHistoryUtils.addMessageToSession(workingSession, errorMessage);
      workingHistory = await chatHistoryUtils.updateSession(workingHistory, workingSession.id, workingSession);
      await saveHistory(workingHistory);
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

  return (
    <div className="relative h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* サイドバー（固定位置） */}
      <ChatSidebar
        sessions={history.sessions}
        currentSessionId={history.currentSessionId}
        onSessionSelect={selectSession}
        onNewChat={startNewChat}
        onDeleteSession={deleteSession}
        onPinSession={pinSession}
        onRenameSession={renameSession}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* メインチャットエリア */}
      <div className={`
        h-full flex flex-col transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'w-[calc(100%-320px)] ml-80 z-10' : 'w-full ml-0 z-50'}
      `}>
        {/* ヘッダー */}
        <div className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 border-b border-gray-200/50">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="mr-3 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title={sidebarOpen ? 'サイドバーを閉じる' : 'サイドバーを開く'}
                >
                  {sidebarOpen ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <rect x="3" y="3" width="6" height="18" rx="1" strokeWidth={2}/>
                      <rect x="11" y="3" width="2" height="18" rx="1" strokeWidth={2}/>
                      <rect x="15" y="3" width="6" height="18" rx="1" strokeWidth={2}/>
                    </svg>
                  )}
                </button>
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
                    {currentSession?.title || "Suna"}
                  </h1>
                  <p className="text-sm text-gray-500 mt-1">Sunaとの対話</p>
                </div>
              </div>
              <UserMenu />
            </div>
          </div>
        </div>

        {/* チャットコンテナー */}
        <div className="flex-1 overflow-hidden">
          <div className="max-w-4xl mx-auto px-6 py-8 h-full flex flex-col">
            {/* メッセージエリア */}
            <div className="flex-1 overflow-y-auto space-y-6 mb-8">
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
                <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
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
                      <div className={`text-xs mt-2 ${msg.role === "user" ? "text-blue-100" : "text-gray-400"}`}>
                        {new Date(msg.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
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

            {/* 入力エリア */}
            <div className="flex-shrink-0">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
                <div className="flex items-end p-4">
                  <textarea
                    className="flex-1 resize-none border-0 outline-none text-gray-900 placeholder-gray-500 text-base leading-6 min-h-[24px] max-h-32"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="メッセージを入力してください..."
                    rows={1}
                    style={{
                      height: Math.min(Math.max(24, input.split('\n').length * 24), 128)
                    }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={loading || !input.trim()}
                    className="ml-4 w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-xl transition-all duration-200 flex items-center justify-center shadow-md hover:shadow-lg disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    </div>
  );
}