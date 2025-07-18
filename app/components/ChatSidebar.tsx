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
  const [errorCount, setErrorCount] = useState(0);
  const [lastLoadTime, setLastLoadTime] = useState<number>(0);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 🎯 修正1: 空のチャットセッションを除外するフィルタリング関数
  const filterNonEmptySessions = (sessions: ChatSession[]): ChatSession[] => {
    return sessions.filter(session => {
      // メッセージが存在し、かつ空でない場合のみ表示
      return session.messages && session.messages.length > 0;
    });
  };

  const loadChatHistory = useCallback(async () => {
    if (loading) return;
    const now = Date.now();
    if (now - lastLoadTime < 5000) {
      console.log('⏸️ [SIDEBAR] Skipping load - too soon after last load');
      return;
    }
    if (errorCount >= 3) {
      console.log('⏸️ [SIDEBAR] Skipping load - too many errors');
      return;
    }
    console.log('🔍 [DEBUG] loadChatHistory called, loading:', loading);
    try {
      setLoading(true);
      setLastLoadTime(now);
      ChatHistoryManager.cleanupDuplicateSessions();
      
      if (session?.user?.id) {
        console.log('🐘 [SIDEBAR] Loading from Supabase + Local for user:', session.user.id);
        const sessions = await ChatHistoryManager.loadAllSessions(session.user.id);
        console.log('🧹 [SIDEBAR] Original sessions count:', sessions.length);
        
        const deduplicatedSessions = ChatHistoryManager.deduplicateSessionsByTitle(sessions);
        console.log('🧹 [SIDEBAR] After deduplication:', deduplicatedSessions.length);
        
        // 🎯 修正3: 空のチャットセッションを除外
        const nonEmptySessions = filterNonEmptySessions(deduplicatedSessions);
        console.log('🧹 [SIDEBAR] After filtering empty sessions:', nonEmptySessions.length);
        
        setChatSessions(nonEmptySessions);
        console.log('🐘 [SIDEBAR] Chat history loaded:', nonEmptySessions.length, 'sessions');
        setErrorCount(0);
      } else {
        console.log('👤 [SIDEBAR] Guest user - loading from local storage only');
        const localSessions = ChatHistoryManager.getSortedSessions();
        
        // 🎯 修正3: ローカルセッションも空のものを除外
        const nonEmptyLocalSessions = filterNonEmptySessions(localSessions);
        console.log('🧹 [SIDEBAR] Local sessions after filtering:', nonEmptyLocalSessions.length);
        
        setChatSessions(nonEmptyLocalSessions);
        console.log('👤 [SIDEBAR] Local sessions loaded:', nonEmptyLocalSessions.length, 'sessions');
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
      setErrorCount(prev => prev + 1);
      const localSessions = ChatHistoryManager.getSortedSessions();
      const nonEmptyLocalSessions = filterNonEmptySessions(localSessions);
      setChatSessions(nonEmptyLocalSessions);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, loading, lastLoadTime, errorCount]);

  useEffect(() => {
    if (!mounted) return;
    const handleChatHistoryUpdate = () => {
      console.log('🔄 [SIDEBAR] Chat history update event received');
      loadChatHistory();
    };
    window.addEventListener('chatHistoryUpdated', handleChatHistoryUpdate);
    return () => {
      window.removeEventListener('chatHistoryUpdated', handleChatHistoryUpdate);
    };
  }, [mounted, loadChatHistory]);

  useEffect(() => {
    if (mounted && !loading) {
      console.log('🔍 [DEBUG] Initial load effect triggered');
      loadChatHistory();
    }
  }, [mounted]);

  useEffect(() => {
    if (!mounted || !session?.user?.id) return;
    console.log('🔍 [DEBUG] Local sync listener temporarily disabled to prevent infinite loop');
  }, [mounted, session?.user?.id]);

  // 🔥 修正: ChatHistoryManagerの新しい削除機能を使用
  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('このチャットを削除しますか？この操作は取り消せません。')) return;

    setDeletingSessionId(sessionId);

    try {
      console.log('🗑️ [SIDEBAR] Starting session deletion:', sessionId);

      // ChatHistoryManagerの統合削除機能を使用（Supabase + ローカルストレージ）
      await ChatHistoryManager.deleteChatSession(sessionId, session?.user?.id);
      console.log('✅ [SIDEBAR] Successfully deleted using ChatHistoryManager');

      // 🎯 削除成功後は最新状態を再読み込み（確実性のため）
      setChatSessions(prev => prev.filter(s => s.id !== sessionId));
      
      // さらに確実性を向上させるため、少し遅延後にサーバーから再読み込み
      setTimeout(() => {
        loadChatHistory();
      }, 500);

      console.log('🗑️ [SIDEBAR] Session deleted successfully:', sessionId);

    } catch (error) {
      console.error('❌ [SIDEBAR] Failed to delete chat session:', error);
      
      // エラーの詳細をユーザーに表示
      if (error instanceof Error) {
        alert(`チャットの削除に失敗しました: ${error.message}`);
      } else {
        alert('チャットの削除に失敗しました。ネットワーク接続を確認してください。');
      }
      
      // エラー時は画面の更新を行わない（データベースとの整合性を保つため）
    } finally {
      setDeletingSessionId(null);
    }
  };

  const handleTogglePin = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      ChatHistoryManager.togglePinSession(sessionId);
      loadChatHistory();
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
      loadChatHistory();
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

  // 🎯 修正1: より詳細で読みやすい時刻表示フォーマット
  const formatDate = (timestamp: number) => {
    if (!mounted) return '';
    
    // タイムスタンプの検証を強化
    if (!timestamp || isNaN(timestamp) || timestamp <= 0) {
      console.warn('⚠️ [SIDEBAR] Invalid timestamp:', timestamp);
      return '不明';
    }
    
    try {
      const date = new Date(timestamp);
      
      // 日付オブジェクトの検証
      if (isNaN(date.getTime())) {
        console.warn('⚠️ [SIDEBAR] Invalid date object from timestamp:', timestamp);
        return '不明';
      }
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      // より詳細な時刻表示
      if (date >= today) {
        // 今日の場合は時刻のみ
        return date.toLocaleTimeString('ja-JP', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      } else if (date >= yesterday) {
        // 昨日の場合
        return `昨日 ${date.toLocaleTimeString('ja-JP', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}`;
      } else if (date >= oneWeekAgo) {
        // 1週間以内の場合は曜日と時刻
        const weekday = date.toLocaleDateString('ja-JP', { weekday: 'short' });
        return `${weekday} ${date.toLocaleTimeString('ja-JP', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}`;
      } else {
        // それより前は月日と時刻
        return date.toLocaleDateString('ja-JP', { 
          year: 'numeric',
          month: 'numeric', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    } catch (error) {
      console.warn('⚠️ [SIDEBAR] Date formatting error:', timestamp, error);
      return '不明';
    }
  };

  return (
    <>
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
        <div className="flex flex-col p-2 space-y-1 bg-white border-b border-gray-200">
          <button
            onClick={onToggle}
            className="w-12 h-12 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
            title={isOpen ? "サイドバーを閉じる" : "サイドバーを開く"}
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
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
        <div className={`h-full flex flex-col transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className={`text-lg font-semibold text-gray-900 transition-all duration-500 ${
              isOpen ? 'opacity-100 translate-y-0 delay-200' : 'opacity-0 translate-y-4'
            }`}>
              チャット
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {chatSessions.length === 0 ? (
              <div className={`text-center p-8 text-gray-500 transition-all duration-500 ${
                isOpen ? 'opacity-100 translate-y-0 delay-300' : 'opacity-0 translate-y-4'
              }`}>
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h8m-8 0V8a4 4 0 118 0v4m-8 0v4a4 4 0 108 0v-4" />
                </svg>
                <p className="text-sm">チャット履歴がありません</p>
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
                      ${deletingSessionId === chatSession.id ? 'opacity-50 pointer-events-none' : ''}
                      ${isOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-6 scale-95'}
                    `}
                    style={{ 
                      transitionDelay: isOpen ? `${400 + index * 100}ms` : '0ms',
                      transformOrigin: 'center'
                    }}
                  >
                    <div className="flex-1 min-w-0 flex items-center">
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
                            {/* メッセージ数も表示 */}
                            <p className="text-xs text-gray-400 mt-0.5">
                              {chatSession.messages?.length || 0} メッセージ
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                    {editingSessionId !== chatSession.id && (
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                        <button
                          onClick={(e) => handleStartRename(chatSession.id, chatSession.title, e)}
                          className="p-1 text-gray-400 hover:text-blue-500 rounded transition-colors"
                          title="リネーム"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => handleDeleteSession(chatSession.id, e)}
                          className={`p-1 rounded transition-colors ${
                            deletingSessionId === chatSession.id
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-gray-400 hover:text-red-500'
                          }`}
                          title={deletingSessionId === chatSession.id ? "削除中..." : "削除"}
                          disabled={deletingSessionId === chatSession.id}
                        >
                          {deletingSessionId === chatSession.id ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
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