import { ChatSession, ChatMessage } from '@/app/types/chat';
import {
  saveSupabaseChatSession,
  getSupabaseChatSessions,
  saveSupabaseChatMessage,
  getSupabaseChatMessages
} from '@/app/lib/supabase';

export class ChatHistoryManager {
  // Supabaseにチャットセッションを保存
  static async saveSessionToSupabase(session: ChatSession, user_id: string) {
    await saveSupabaseChatSession({
      ...session,
      user_id,
      created_at: new Date(session.createdAt).toISOString()
    });
  }

  // Supabaseからユーザーのチャットセッション一覧を取得
  static async loadSessionsFromSupabase(user_id: string): Promise<ChatSession[]> {
    return await getSupabaseChatSessions(user_id);
  }

  // Supabaseにチャットメッセージを保存
  static async saveMessageToSupabase(message: ChatMessage, session_id: string, user_id: string) {
    await saveSupabaseChatMessage({
      ...message,
      session_id,
      user_id,
      created_at: new Date(message.timestamp).toISOString()
    });
  }

  // Supabaseからチャットセッションのメッセージ一覧を取得
  static async loadMessagesFromSupabase(session_id: string): Promise<ChatMessage[]> {
    return await getSupabaseChatMessages(session_id);
  }

  // ローカルストレージベースのメソッド（フォールバック用）
  private static getLocalStorageKey() {
    return 'chatHistory';
  }

  // ローカルストレージからチャットセッション一覧を取得
  static getSortedSessions(): ChatSession[] {
    try {
      if (typeof window === 'undefined') return [];
      
      const stored = localStorage.getItem(this.getLocalStorageKey());
      if (!stored) return [];
      
      const sessions: ChatSession[] = JSON.parse(stored);
      
      // ピン留めされたものを先頭に、その後は更新日時順
      return sessions.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.updatedAt - a.updatedAt;
      });
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
      return [];
    }
  }

  // チャットセッションを削除
  static deleteChatSession(sessionId: string): void {
    try {
      if (typeof window === 'undefined') return;
      
      const sessions = this.getSortedSessions();
      const filteredSessions = sessions.filter(s => s.id !== sessionId);
      
      localStorage.setItem(this.getLocalStorageKey(), JSON.stringify(filteredSessions));
    } catch (error) {
      console.error('Failed to delete chat session:', error);
      throw error;
    }
  }

  // ピン留めの切り替え
  static togglePinSession(sessionId: string): void {
    try {
      if (typeof window === 'undefined') return;
      
      const sessions = this.getSortedSessions();
      const sessionIndex = sessions.findIndex(s => s.id === sessionId);
      
      if (sessionIndex !== -1) {
        sessions[sessionIndex].isPinned = !sessions[sessionIndex].isPinned;
        localStorage.setItem(this.getLocalStorageKey(), JSON.stringify(sessions));
      }
    } catch (error) {
      console.error('Failed to toggle pin session:', error);
      throw error;
    }
  }

  // セッション名を変更
  static renameSession(sessionId: string, newTitle: string): void {
    try {
      if (typeof window === 'undefined') return;
      
      const sessions = this.getSortedSessions();
      const sessionIndex = sessions.findIndex(s => s.id === sessionId);
      
      if (sessionIndex !== -1) {
        sessions[sessionIndex].title = newTitle;
        sessions[sessionIndex].updatedAt = Date.now();
        localStorage.setItem(this.getLocalStorageKey(), JSON.stringify(sessions));
      }
    } catch (error) {
      console.error('Failed to rename session:', error);
      throw error;
    }
  }

  // セッションを保存（ローカル）
  static saveSession(session: ChatSession): void {
    try {
      if (typeof window === 'undefined') return;
      
      const sessions = this.getSortedSessions();
      const existingIndex = sessions.findIndex(s => s.id === session.id);
      
      if (existingIndex !== -1) {
        sessions[existingIndex] = session;
      } else {
        sessions.push(session);
      }
      
      localStorage.setItem(this.getLocalStorageKey(), JSON.stringify(sessions));
    } catch (error) {
      console.error('Failed to save session:', error);
      throw error;
    }
  }

  // 新しいセッションを作成
  static createNewSession(): ChatSession {
    const now = Date.now();
    return {
      id: `session_${now}`,
      title: '新しいチャット',
      messages: [],
      createdAt: now,
      updatedAt: now,
      isPinned: false
    };
  }

  // メッセージからセッションタイトルを生成
  static generateSessionTitle(messages: ChatMessage[]): string {
    if (messages.length === 0) return '新しいチャット';
    
    const firstUserMessage = messages.find(m => m.role === 'user');
    if (!firstUserMessage) return '新しいチャット';
    
    // 最初の30文字を取得し、改行を除去
    const title = firstUserMessage.content
      .replace(/\n/g, ' ')
      .substring(0, 30);
    
    return title.length < firstUserMessage.content.length ? title + '...' : title;
  }

  // チャットセッションを保存（メッセージを含む）
  static saveChatSession(session: ChatSession): void {
    try {
      if (typeof window === 'undefined') return;
      
      const sessions = this.getSortedSessions();
      const existingIndex = sessions.findIndex(s => s.id === session.id);
      
      if (existingIndex !== -1) {
        sessions[existingIndex] = session;
      } else {
        sessions.push(session);
      }
      
      localStorage.setItem(this.getLocalStorageKey(), JSON.stringify(sessions));
    } catch (error) {
      console.error('Failed to save chat session:', error);
      throw error;
    }
  }
}