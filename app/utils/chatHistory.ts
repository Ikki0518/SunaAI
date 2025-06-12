import { ChatSession, ChatMessage } from '@/app/types/chat';

export class ChatHistoryManager {
  private static getStorageKey(): string {
    return 'dify_chat_sessions';
  }

  // SSR安全チェック
  private static isClient(): boolean {
    return typeof window !== 'undefined';
  }

  static saveChatSession(session: ChatSession): void {
    if (!this.isClient()) return;

    try {
      const sessions = this.loadChatSessions();
      const existingIndex = sessions.findIndex(s => s.id === session.id);
      
      if (existingIndex >= 0) {
        sessions[existingIndex] = { ...session, updatedAt: Date.now() };
      } else {
        sessions.push({ ...session, updatedAt: Date.now() });
      }

      // 最大50セッションまで保持
      const sortedSessions = sessions.sort((a, b) => b.updatedAt - a.updatedAt);
      const limitedSessions = sortedSessions.slice(0, 50);

      localStorage.setItem(this.getStorageKey(), JSON.stringify(limitedSessions));
    } catch (error) {
      console.error('Failed to save chat session:', error);
    }
  }

  static loadChatSessions(): ChatSession[] {
    if (!this.isClient()) return [];

    try {
      const data = localStorage.getItem(this.getStorageKey());
      if (!data) return [];
      
      const sessions = JSON.parse(data) as ChatSession[];
      return Array.isArray(sessions) ? sessions : [];
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
      return [];
    }
  }

  static deleteChatSession(sessionId: string): void {
    if (!this.isClient()) return;

    try {
      const sessions = this.loadChatSessions();
      const filteredSessions = sessions.filter(s => s.id !== sessionId);
      localStorage.setItem(this.getStorageKey(), JSON.stringify(filteredSessions));
    } catch (error) {
      console.error('Failed to delete chat session:', error);
    }
  }

  static generateSessionTitle(messages: ChatMessage[]): string {
    if (messages.length === 0) return '新しいチャット';
    
    const firstUserMessage = messages.find(msg => msg.role === 'user');
    if (!firstUserMessage) return '新しいチャット';
    
    const title = firstUserMessage.content.trim().substring(0, 30);
    return title + (firstUserMessage.content.length > 30 ? '...' : '');
  }

  static createNewSession(): ChatSession {
    return {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: '新しいチャット',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isPinned: false,
    };
  }

  static togglePinSession(sessionId: string): void {
    if (!this.isClient()) return;

    try {
      const sessions = this.loadChatSessions();
      const sessionIndex = sessions.findIndex(s => s.id === sessionId);
      
      if (sessionIndex >= 0) {
        sessions[sessionIndex].isPinned = !sessions[sessionIndex].isPinned;
        sessions[sessionIndex].updatedAt = Date.now();
        localStorage.setItem(this.getStorageKey(), JSON.stringify(sessions));
      }
    } catch (error) {
      console.error('Failed to toggle pin session:', error);
    }
  }

  static renameSession(sessionId: string, newTitle: string): void {
    if (!this.isClient()) return;

    try {
      const sessions = this.loadChatSessions();
      const sessionIndex = sessions.findIndex(s => s.id === sessionId);
      
      if (sessionIndex >= 0) {
        sessions[sessionIndex].title = newTitle.trim() || '無題のチャット';
        sessions[sessionIndex].updatedAt = Date.now();
        localStorage.setItem(this.getStorageKey(), JSON.stringify(sessions));
      }
    } catch (error) {
      console.error('Failed to rename session:', error);
    }
  }

  static getSortedSessions(): ChatSession[] {
    const sessions = this.loadChatSessions();
    
    // ピン留めされたセッションを上に、その後は更新日時順
    return sessions.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.updatedAt - a.updatedAt;
    });
  }

  static clearAllSessions(): void {
    if (!this.isClient()) return;
    
    try {
      localStorage.removeItem(this.getStorageKey());
    } catch (error) {
      console.error('Failed to clear chat sessions:', error);
    }
  }
}