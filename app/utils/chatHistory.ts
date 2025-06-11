import { ChatSession, ChatMessage } from '@/app/types/chat';

export class ChatHistoryManager {
  private static getStorageKey(userId: string): string {
    return `chat_history_${userId}`;
  }

  static async saveChatSession(userId: string, session: ChatSession): Promise<void> {
    // 一時的にローカルストレージのみ使用
    this.saveToLocalStorage(userId, session);
  }

  static async loadChatSessions(userId: string): Promise<ChatSession[]> {
    // 一時的にローカルストレージのみ使用
    return this.loadFromLocalStorage(userId);
  }

  static async deleteChatSession(userId: string, sessionId: string): Promise<void> {
    // 一時的にローカルストレージのみ使用
    this.deleteFromLocalStorage(userId, sessionId);
  }

  static generateSessionTitle(messages: ChatMessage[]): string {
    if (messages.length === 0) return '新しいチャット';
    
    const firstUserMessage = messages.find(msg => msg.role === 'user');
    if (!firstUserMessage) return '新しいチャット';
    
    // 最初のユーザーメッセージから20文字でタイトルを生成
    const title = firstUserMessage.content.trim().substring(0, 20);
    return title + (firstUserMessage.content.length > 20 ? '...' : '');
  }

  static createNewSession(userId: string): ChatSession {
    return {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: '新しいチャット',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      userId,
    };
  }

  // ローカルストレージのフォールバック関数
  private static saveToLocalStorage(userId: string, session: ChatSession): void {
    try {
      const key = this.getStorageKey(userId);
      const existing = localStorage.getItem(key);
      const sessions: ChatSession[] = existing ? JSON.parse(existing) : [];
      
      const index = sessions.findIndex(s => s.id === session.id);
      if (index >= 0) {
        sessions[index] = session;
      } else {
        sessions.push(session);
      }
      
      localStorage.setItem(key, JSON.stringify(sessions));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }

  private static loadFromLocalStorage(userId: string): ChatSession[] {
    try {
      const key = this.getStorageKey(userId);
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      return [];
    }
  }

  private static deleteFromLocalStorage(userId: string, sessionId: string): void {
    try {
      const key = this.getStorageKey(userId);
      const existing = localStorage.getItem(key);
      if (!existing) return;
      
      const sessions: ChatSession[] = JSON.parse(existing);
      const filtered = sessions.filter(s => s.id !== sessionId);
      localStorage.setItem(key, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to delete from localStorage:', error);
    }
  }
}