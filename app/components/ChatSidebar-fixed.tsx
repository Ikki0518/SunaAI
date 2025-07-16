"use client";
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { ChatSession } from '@/app/types/chat';
import { ChatHistoryManager } from '@/app/utils/chatHistory';
import { PinFixedChatHistoryManager } from '@/app/utils/chatHistory-pin-fix';

interface ChatSidebarProps {
  currentSessionId?: string;
  onSessionSelect: (session: ChatSession) => void;
  onNewChat: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function FixedChatSidebar({
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
  const [pinningSessionId, setPinningSessionId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadChatHistory = useCallback(async () => {
    if (loading) return;
    
    try {
      setLoading(true);
      
      // 重複セッションをクリーンアップ
      ChatHistoryManager.cleanupDuplicateSessions();
      
      // 認証されている場合のみSupabaseから読み込み
      if (session?.user?.id) {
        const sessions = await ChatHistoryManager.loadAllSessions(session.user.id);
        
        // ピン留めされたセッションを上に表示
        const sortedSessions = sessions.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return b.updatedAt - a.updatedAt;
        });
        
        setChatSessions(sortedSessions);
        
        // ペンディング中の同期アクションを実行
        PinFixedChatHistoryManager.syncPendingActions(session.user.id);
      } else {
        // ゲストユーザーの場合
        const localSessions = ChatHistoryManager.getSortedSessions();
        setChatSessions(localSessions);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
      const localSessions = ChatHistoryManager.getSortedSessions();
      setChatSessions(localSessions);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, loading]);

  // チャット履歴更新イベントをリッスン
  useEffect(() => {
    if (!mounted) return;

    const handleChatHistoryUpdate = () => {
      console.log('🔄 [SIDEBAR] Chat history update event received');
      loadChatHistory();
    };

    window.addEventListener('chatHistoryUpdated', handleChatHistoryUpdate);
    
    // 初回読み込み
    loadChatHistory();

    return () => {
      window.removeEventListener('chatHistoryUpdated', handleChatHistoryUpdate);
    };
  }, [mounted, loadChatHistory]);

  /**
   * ピン留めの切り替え（改善版）
   */
  const handleTogglePin = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (pinningSessionId) return; // 既に処理中の場合はスキップ
    
    try {
      setPinningSessionId(sessionId);
      
      // 改善されたピン留め機能を使用
      const success = await PinFixedChatHistoryManager.togglePinSession(
        sessionId,
        session?.user?.id
      );
      
      if (success) {
        console.log('✅ [SIDEBAR] Pin toggled successfully');
        // loadChatHistoryは自動的にイベントリスナーで呼ばれる
      } else {
        throw new Error('Failed to toggle pin');
      }
    } catch (error) {
      console.error('❌ [SIDEBAR] Failed to toggle pin:', error);
      alert('ピン留めの切り替えに失敗しました。もう一度お試しください。');
      // エラー時は手動でリロード
      loadChatHistory();
    } finally {
      setPinningSessionId(null);
    }
  };

  const handleDelete = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('このチャットを削除してもよろしいですか？')) {
      return;
    }
    
    try {
      ChatHistoryManager.deleteChatSession(sessionId);
      loadChatHistory();
    } catch (error) {
      console.error('Failed to delete chat session:', error);
      alert('チャットの削除に失敗しました');
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
      ChatHistoryManager.renameSession(sessionId, editingTitle.trim());
      setEditingSessionId(null);
      setEditingTitle('');
      loadChatHistory();
    } catch (error) {
      console.error('Failed to rename session:', error);
      alert('名前の変更に失敗しました');
    }
  };

  if (!mounted) return null;

  return (
    <>
      {/* サイドバー */}
      <div
        className={`fixed left-0 top-0 h-full bg-gray-50 border-r border-gray-200 transition-all duration-300 ease-in-out z-40 ${
          isOpen ? 'w-80' : 'w-16'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* ヘッダー */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <button
                onClick={onToggle}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                title={isOpen ? "サイドバーを閉じる" : "サイドバーを開く"}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              {isOpen && (
                <button
                  onClick={onNewChat}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>新しいチャット</span>
                </button>
              )}
            </div>
          </div>

          {/* チャットリスト */}
          {isOpen && (
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {chatSessions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">チャット履歴がありません</p>
              ) : (
                chatSessions.map((chatSession) => (
                  <div
                    key={chatSession.id}
                    onClick={() => onSessionSelect(chatSession)}
                    className={`group relative p-3 rounded-lg cursor-pointer transition-all ${
                      currentSessionId === chatSession.id
                        ? 'bg-blue-100 border-blue-300'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center">
                          {/* ピン留めアイコン */}
                          {chatSession.isPinned && (
                            <svg className="w-3 h-3 text-yellow-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                            </svg>
                          )}
                          
                          {/* タイトル編集 */}
                          {editingSessionId === chatSession.id ? (
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onBlur={() => handleSaveRename(chatSession.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveRename(chatSession.id);
                                } else if (e.key === 'Escape') {
                                  setEditingSessionId(null);
                                  setEditingTitle('');
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                              autoFocus
                            />
                          ) : (
                            <h3 className="text-sm font-medium text-gray-900 truncate">
                              {chatSession.title}
                            </h3>
                          )}
                        </div>
                        
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(chatSession.updatedAt).toLocaleString('ja-JP')}
                        </p>
                      </div>
                      
                      {/* アクションボタン */}
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* ピン留めボタン */}
                        <button
                          onClick={(e) => handleTogglePin(chatSession.id, e)}
                          disabled={pinningSessionId === chatSession.id}
                          className={`p-1 rounded transition-colors ${
                            chatSession.isPinned
                              ? 'text-yellow-500 hover:text-yellow-600'
                              : 'text-gray-400 hover:text-gray-600'
                          } ${pinningSessionId === chatSession.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title={chatSession.isPinned ? "ピン留めを解除" : "ピン留め"}
                        >
                          {pinningSessionId === chatSession.id ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                          )}
                        </button>
                        
                        {/* 編集ボタン */}
                        <button
                          onClick={(e) => handleStartRename(chatSession.id, chatSession.title, e)}
                          className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                          title="名前を変更"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        
                        {/* 削除ボタン */}
                        <button
                          onClick={(e) => handleDelete(chatSession.id, e)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                          title="削除"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}