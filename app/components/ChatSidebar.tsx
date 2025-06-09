"use client";

import { ChatSession } from '../types/chat';

interface ChatSidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onNewChat: () => void;
  onDeleteSession: (sessionId: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function ChatSidebar({
  sessions,
  currentSessionId,
  onSessionSelect,
  onNewChat,
  onDeleteSession,
  isOpen,
  onToggle,
}: ChatSidebarProps) {
  return (
    <div className={`
      fixed top-0 h-full w-80 bg-white border-r border-gray-200 shadow-lg flex flex-col z-40
      transition-transform duration-300 ease-in-out
      ${isOpen ? 'translate-x-0' : '-translate-x-80'}
    `}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Suna</h2>
            <button
              onClick={onToggle}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="サイドバーを閉じる"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <button
            onClick={onNewChat}
            className="w-full mt-3 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>新しいチャット</span>
          </button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto">
          {sessions.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <p className="text-sm">まだチャットがありません</p>
            </div>
          ) : (
            <div className="p-2">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`
                    group relative mb-1 p-3 rounded-lg cursor-pointer
                    transition-colors duration-200
                    ${session.id === currentSessionId 
                      ? 'bg-blue-50 border border-blue-200' 
                      : 'hover:bg-gray-50'
                    }
                  `}
                  onClick={() => onSessionSelect(session.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className={`
                        text-sm font-medium truncate
                        ${session.id === currentSessionId ? 'text-blue-900' : 'text-gray-900'}
                      `}>
                        {session.title}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(session.updatedAt).toLocaleDateString('ja-JP', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {session.messages.length}件のメッセージ
                      </p>
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSession(session.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-all duration-200 text-gray-400 hover:text-red-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
                <div className="p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 text-center">
            Suna
          </div>
        </div>
      </div>
    );
  }