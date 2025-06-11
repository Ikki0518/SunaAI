"use client";
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { ChatSession } from '@/app/types/chat';
import { ChatHistoryManager } from '@/app/utils/chatHistory';

interface ChatSidebarProps {
  currentSessionId?: string;
  onSessionSelect: (session: ChatSession) => void;
  onNewChat: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function ChatSidebar({ 
  currentSessionId, 
  onSessionSelect, 
  onNewChat, 
  isOpen, 
  onToggle 
}: ChatSidebarProps) {
  const { data: session } = useSession();
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.email) {
      loadChatHistory();
    }
  }, [session?.user?.email]);

  const loadChatHistory = async () => {
    if (!session?.user?.email) return;
    
    try {
      setLoading(true);
      const sessions = await ChatHistoryManager.loadChatSessions(session.user.email);
      setChatSessions(sessions);
    } catch (error) {
      console.error('Failed to load chat history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!session?.user?.email) return;
    if (!confirm('このチャットを削除しますか？')) return;

    try {
      await ChatHistoryManager.deleteChatSession(session.user.email, sessionId);
      setChatSessions(prev => prev.filter(s => s.id !== sessionId));
      
      // 現在のセッションが削除された場合は新しいチャットを開始
      if (currentSessionId === sessionId) {
        onNewChat();
      }
    } catch (error) {
      console.error('Failed to delete chat session:', error);
      alert('チャットの削除に失敗しました');
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    
    if (date >= today) {
      return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    } else if (date >= yesterday) {
      return '昨日';
    } else {
      return date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
    }
  };

  return (
    <>
      {/* モバイル用オーバーレイ */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}
      
      {/* サイドバー */}
      <div className={`
        fixed top-0 left-0 h-full bg-white border-r border-gray-200 shadow-lg z-50 transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        w-80 lg:translate-x-0 lg:static lg:z-auto
      `}>
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">チャット履歴</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={onNewChat}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="新しいチャット"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button
              onClick={onToggle}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* チャット履歴リスト */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : chatSessions.length === 0 ? (
            <div className="text-center p-8 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h8m-8 0V8a4 4 0 118 0v4m-8 0v4a4 4 0 108 0v-4" />
              </svg>
              <p className="text-sm">まだチャット履歴がありません</p>
              <button
                onClick={onNewChat}
                className="mt-3 text-blue-500 hover:text-blue-600 text-sm font-medium"
              >
                新しいチャットを始める
              </button>
            </div>
          ) : (
            <div className="p-2">
              {chatSessions.map((chatSession) => (
                <div
                  key={chatSession.id}
                  onClick={() => onSessionSelect(chatSession)}
                  className={`
                    group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors mb-1
                    ${currentSessionId === chatSession.id 
                      ? 'bg-blue-50 border border-blue-200' 
                      : 'hover:bg-gray-50'
                    }
                  `}
                >
                  <div className="flex-1 min-w-0">
                    <h3 className={`
                      text-sm font-medium truncate
                      ${currentSessionId === chatSession.id ? 'text-blue-900' : 'text-gray-900'}
                    `}>
                      {chatSession.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(chatSession.updatedAt)}
                    </p>
                  </div>
                  
                  <button
                    onClick={(e) => handleDeleteSession(chatSession.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 rounded transition-all"
                    title="削除"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}