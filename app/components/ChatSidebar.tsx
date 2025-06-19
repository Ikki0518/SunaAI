"use client";
import { useState, useEffect, useCallback } from 'react';
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
  const [mounted, setMounted] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [loading, setLoading] = useState(false);

  // SSR回避のためのマウント確認
  useEffect(() => {
    setMounted(true);
  }, []);

  const loadChatHistory = useCallback(async () => {
    if (loading) return;
    
    try {
      setLoading(true);
      
      // 認証されている場合のみSupabaseから読み込み、そうでない場合はローカルのみ
      if (session?.user?.id) {
        console.log('🐘 [SIDEBAR] Loading from Supabase + Local for user:', session.user.id);
        const sessions = await ChatHistoryManager.loadAllSessions(session.user.id);
        setChatSessions(sessions);
        console.log('🐘 [SIDEBAR] Chat history loaded:', sessions.length, 'sessions');
      } else {
        console.log('👤 [SIDEBAR] Guest user - loading from local storage only');
        const localSessions = ChatHistoryManager.getSortedSessions();
        setChatSessions(localSessions);
        console.log('👤 [SIDEBAR] Local sessions loaded:', localSessions.length, 'sessions');
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
      // フォールバック: ローカルストレージのみ
      const localSessions = ChatHistoryManager.getSortedSessions();
      setChatSessions(localSessions);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, loading]);

  // 🔄 初回読み込みのみ（無限ループ防止）
  useEffect(() => {
    if (mounted) {
      loadChatHistory();
    }
  }, [mounted]); // session?.user?.idとloadChatHistoryを依存配列から削除

  // 🔄 ローカル同期リスナー（認証されている場合のみ）
  useEffect(() => {
    if (!mounted || !session?.user?.id) return;

    const cleanup = ChatHistoryManager.setupLocalSyncListener(() => {
      console.log('📡 [LOCAL SYNC] Refreshing chat history due to update');
      loadChatHistory();
    });

    return cleanup;
  }, [mounted, session?.user?.id]); // loadChatHistoryを依存配列から削除

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('このチャットを削除しますか？')) return;

    try {
      ChatHistoryManager.deleteChatSession(sessionId);
      setChatSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (error) {
      console.error('Failed to delete chat session:', error);
      alert('チャットの削除に失敗しました');
    }
  };

  const handleTogglePin = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      ChatHistoryManager.togglePinSession(sessionId);
      loadChatHistory(); // リロードしてソート順を更新
    } catch (error) {
      console.error('Failed to toggle pin session:', error);
      alert('ピン留めの切り替えに失敗しました');
    }
  };

  const handleStartRename = (sessionId: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(sessionId);
    setEditingTitle(currentTitle);
  };

  const handleSaveRename = (sessionId: string) => {
    if (!editingTitle.trim()) {
      setEditingSessionId(null);
      setEditingTitle('');
      return;
    }

    try {
      ChatHistoryManager.renameSession(sessionId, editingTitle);
      loadChatHistory(); // リロードして変更を反映
      setEditingSessionId(null);
      setEditingTitle('');
    } catch (error) {
      console.error('Failed to rename session:', error);
      alert('リネームに失敗しました');
    }
  };

  const handleCancelRename = () => {
    setEditingSessionId(null);
    setEditingTitle('');
  };

  const formatDate = (timestamp: number) => {
    if (!mounted) return '';
    
    // タイムスタンプの検証
    if (!timestamp || isNaN(timestamp) || timestamp <= 0) {
      return '不明';
    }
    
    try {
      const date = new Date(timestamp);
      
      // 日付オブジェクトの検証
      if (isNaN(date.getTime())) {
        return '不明';
      }
      
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
    } catch (error) {
      console.warn('⚠️ [SIDEBAR] Date formatting error:', timestamp, error);
      return '不明';
    }
  };

  return (
    <>
      {/* サイドバー - デスクトップ用 */}
      <div 
        className={`
          fixed top-0 left-0 h-full z-40
          ${isOpen ? 'w-80' : 'w-16'} 
          transition-all duration-300 ease-in-out
          bg-white border-r border-gray-200 shadow-lg
          overflow-hidden
        `}
        style={{ minWidth: isOpen ? '320px' : '64px' }}
      >
        {/* 常に表示されるボタン群 */}
        <div className="flex flex-col p-2 space-y-1 bg-white border-b border-gray-200">
          {/* ハンバーガーメニューボタン */}
          <button
            onClick={onToggle}
            className="w-12 h-12 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
            title={isOpen ? "サイドバーを閉じる" : "サイドバーを開く"}
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          {/* 新規チャットボタン */}
          <button
            onClick={onNewChat}
            className="w-12 h-12 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
            title="新しいチャット"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* サイドバーコンテンツ - 常にDOMに存在、CSSでアニメーション制御 */}
        <div className={`h-full flex flex-col transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          {/* ヘッダー */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className={`text-lg font-semibold text-gray-900 transition-all duration-500 ${
              isOpen ? 'opacity-100 translate-y-0 delay-200' : 'opacity-0 translate-y-4'
            }`}>
              過去のチャット
            </h2>
          </div>

          {/* チャット履歴リスト */}
          <div className="flex-1 overflow-y-auto">
            {chatSessions.length === 0 ? (
              <div className={`text-center p-8 text-gray-500 transition-all duration-500 ${
                isOpen ? 'opacity-100 translate-y-0 delay-300' : 'opacity-0 translate-y-4'
              }`}>
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
                {chatSessions.map((chatSession, index) => (
                  <div
                    key={chatSession.id}
                    onClick={() => editingSessionId !== chatSession.id && onSessionSelect(chatSession)}
                    className={`
                      group flex items-center justify-between p-3 rounded-lg transition-all duration-500 mb-1
                      ${editingSessionId === chatSession.id ? 'bg-gray-50' : 
                        currentSessionId === chatSession.id 
                          ? 'bg-blue-50 border border-blue-200 cursor-pointer' 
                          : 'hover:bg-gray-50 cursor-pointer'
                      }
                      ${isOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-6 scale-95'}
                    `}
                    style={{ 
                      transitionDelay: isOpen ? `${400 + index * 100}ms` : '0ms',
                      transformOrigin: 'center'
                    }}
                  >
                    <div className="flex-1 min-w-0 flex items-center">
                      {/* ピン留めアイコン */}
                      {chatSession.isPinned && (
                        <svg className="w-3 h-3 text-yellow-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        {editingSessionId === chatSession.id ? (
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveRename(chatSession.id);
                              } else if (e.key === 'Escape') {
                                handleCancelRename();
                              }
                            }}
                            onBlur={() => handleSaveRename(chatSession.id)}
                            className="w-full text-sm font-medium bg-white border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                          />
                        ) : (
                          <>
                            <h3 className={`
                              text-sm font-medium truncate
                              ${currentSessionId === chatSession.id ? 'text-blue-900' : 'text-gray-900'}
                            `}>
                              {chatSession.title}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDate(chatSession.updatedAt)}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {editingSessionId !== chatSession.id && (
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* ピン留めボタン */}
                        <button
                          onClick={(e) => handleTogglePin(chatSession.id, e)}
                          className={`p-1 rounded transition-colors ${
                            chatSession.isPinned 
                              ? 'text-yellow-500 hover:text-yellow-600' 
                              : 'text-gray-400 hover:text-yellow-500'
                          }`}
                          title={chatSession.isPinned ? "ピン留めを解除" : "ピン留め"}
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </button>
                        
                        {/* リネームボタン */}
                        <button
                          onClick={(e) => handleStartRename(chatSession.id, chatSession.title, e)}
                          className="p-1 text-gray-400 hover:text-blue-500 rounded transition-colors"
                          title="リネーム"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        
                        {/* 削除ボタン */}
                        <button
                          onClick={(e) => handleDeleteSession(chatSession.id, e)}
                          className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                          title="削除"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}