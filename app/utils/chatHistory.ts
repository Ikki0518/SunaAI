import { ChatHistory, ChatSession, Message } from '../types/chat';

export const chatHistoryUtils = {
  // サーバーから履歴を取得
  async getHistory(): Promise<ChatHistory> {
    try {
      const response = await fetch('/api/chat-history');
      if (response.ok) {
        return await response.json();
      } else if (response.status === 401) {
        // 未認証の場合はローカルストレージから取得
        return this.getLocalHistory();
      } else {
        console.error('Failed to fetch chat history from server');
        return this.getLocalHistory();
      }
    } catch (error) {
      console.error('Error fetching chat history:', error);
      return this.getLocalHistory();
    }
  },

  // ローカルストレージから履歴を取得（フォールバック用）
  getLocalHistory(): ChatHistory {
    if (typeof window === 'undefined') {
      return { sessions: [], currentSessionId: null };
    }
    
    try {
      const stored = localStorage.getItem('suna_chat_history');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to parse local chat history:', error);
    }
    
    return { sessions: [], currentSessionId: null };
  },

  // 履歴をサーバーに保存
  async saveHistory(history: ChatHistory): Promise<boolean> {
    try {
      const response = await fetch('/api/chat-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(history),
      });

      if (response.ok) {
        return true;
      } else if (response.status === 401) {
        // 未認証の場合はローカルストレージに保存
        this.saveLocalHistory(history);
        return true;
      } else {
        console.error('Failed to save chat history to server');
        this.saveLocalHistory(history);
        return false;
      }
    } catch (error) {
      console.error('Error saving chat history:', error);
      this.saveLocalHistory(history);
      return false;
    }
  },

  // ローカルストレージに保存（フォールバック用）
  saveLocalHistory(history: ChatHistory): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem('suna_chat_history', JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save local chat history:', error);
    }
  },

  // 新しいセッションを作成
  createNewSession(): ChatSession {
    const now = Date.now();
    return {
      id: `session_${now}`,
      title: '新しいチャット',
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
  },

  // セッションを履歴に追加
  addSession(history: ChatHistory, session: ChatSession): ChatHistory {
    return {
      ...history,
      sessions: [session, ...history.sessions],
      currentSessionId: session.id,
    };
  },

  // 現在のセッションを取得
  getCurrentSession(history: ChatHistory): ChatSession | null {
    if (!history.currentSessionId) return null;
    return history.sessions.find(s => s.id === history.currentSessionId) || null;
  },

  // 現在のセッションを設定
  setCurrentSession(history: ChatHistory, sessionId: string): ChatHistory {
    return {
      ...history,
      currentSessionId: sessionId,
    };
  },

  // セッションにメッセージを追加
  addMessageToSession(session: ChatSession, message: Message): ChatSession {
    const updatedSession = {
      ...session,
      messages: [...session.messages, message],
      updatedAt: Date.now(),
    };

    // タイトルが「新しいチャット」の場合、最初のメッセージからタイトルを生成
    if (updatedSession.title === '新しいチャット' && message.role === 'user') {
      updatedSession.title = message.content.length > 30 
        ? message.content.substring(0, 30) + '...'
        : message.content;
    }

    return updatedSession;
  },

  // セッションを更新（サーバーに保存）
  async updateSession(history: ChatHistory, sessionId: string, updatedSession: ChatSession): Promise<ChatHistory> {
    const newHistory = {
      ...history,
      sessions: history.sessions.map(s => 
        s.id === sessionId ? updatedSession : s
      ),
    };

    try {
      const response = await fetch('/api/chat-history', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId, updatedSession }),
      });

      if (!response.ok && response.status !== 401) {
        console.error('Failed to update session on server');
      }
    } catch (error) {
      console.error('Error updating session:', error);
    }

    // サーバーへの保存が失敗してもローカルの状態は更新
    await this.saveHistory(newHistory);
    return newHistory;
  },

  // セッションを削除
  async deleteSession(history: ChatHistory, sessionId: string): Promise<ChatHistory> {
    const newSessions = history.sessions.filter(s => s.id !== sessionId);
    const newCurrentSessionId = history.currentSessionId === sessionId 
      ? (newSessions.length > 0 ? newSessions[0].id : null)
      : history.currentSessionId;

    const newHistory = {
      sessions: newSessions,
      currentSessionId: newCurrentSessionId,
    };

    try {
      const response = await fetch(`/api/chat-history?sessionId=${sessionId}`, {
        method: 'DELETE',
      });

      if (!response.ok && response.status !== 401) {
        console.error('Failed to delete session on server');
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    }

    // サーバーへの削除が失敗してもローカルの状態は更新
    await this.saveHistory(newHistory);
    return newHistory;
  },

  // ローカルストレージからサーバーに移行（初回ログイン時などに使用）
  async migrateLocalToServer(): Promise<void> {
    try {
      const localHistory = this.getLocalHistory();
      if (localHistory.sessions.length > 0) {
        await this.saveHistory(localHistory);
        // 移行後はローカルストレージをクリア
        if (typeof window !== 'undefined') {
          localStorage.removeItem('suna_chat_history');
        }
      }
    } catch (error) {
      console.error('Failed to migrate local history to server:', error);
    }
  },
};