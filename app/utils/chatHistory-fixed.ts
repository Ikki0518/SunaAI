import { ChatSession, ChatMessage } from '@/app/types/chat';

export class FixedChatHistoryManager {
  // UUID生成（既存のものを使用）
  static generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * 新しいセッションを作成（改善版）
   * - 常に新しいセッションを作成（再利用しない）
   * - conversationIdを必ず生成
   */
  static createNewSession(): ChatSession {
    const now = Date.now();
    const sessionId = this.generateUUID();
    const conversationId = this.generateUUID(); // 会話IDも生成
    
    const newSession: ChatSession = {
      id: sessionId,
      title: '新しいチャット',
      messages: [], // 必ず空の配列
      conversationId: conversationId, // 会話IDを設定
      createdAt: now,
      updatedAt: now,
      isPinned: false,
      isManuallyRenamed: false
    };
    
    console.log('➕ [SESSION] Created new session:', {
      sessionId: newSession.id,
      conversationId: newSession.conversationId,
      timestamp: new Date(now).toISOString()
    });
    
    return newSession;
  }

  /**
   * セッションを切り替える際の処理（改善版）
   * - 現在のセッションを保存
   * - 新しいセッションのメッセージをクリア
   * - conversationIdを正しく設定
   */
  static async switchToSession(
    newSession: ChatSession,
    currentSession: ChatSession | null,
    saveCurrentSession: () => Promise<void>
  ): Promise<{
    session: ChatSession;
    messages: ChatMessage[];
    conversationId: string | null;
  }> {
    // 現在のセッションを保存
    if (currentSession && currentSession.messages.length > 0) {
      await saveCurrentSession();
    }
    
    // 新しいセッションの準備
    const cleanSession: ChatSession = {
      ...newSession,
      messages: [] // メッセージは必ずクリア
    };
    
    // conversationIdの確認（なければ生成）
    const conversationId = cleanSession.conversationId || this.generateUUID();
    if (!cleanSession.conversationId) {
      cleanSession.conversationId = conversationId;
    }
    
    console.log('🔄 [SWITCH] Switching to session:', {
      sessionId: cleanSession.id,
      conversationId: conversationId,
      title: cleanSession.title
    });
    
    return {
      session: cleanSession,
      messages: [],
      conversationId: conversationId
    };
  }

  /**
   * メッセージをセッションIDとconversationIdでフィルタリング（改善版）
   */
  static async loadMessagesForSession(
    sessionId: string,
    conversationId: string | undefined,
    userId?: string
  ): Promise<ChatMessage[]> {
    if (!conversationId) {
      console.warn('⚠️ [LOAD] No conversationId provided, returning empty messages');
      return [];
    }
    
    try {
      // APIを通じてメッセージを取得
      const response = await fetch(
        `/api/chat-messages?session_id=${sessionId}&conversation_id=${conversationId}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to load messages: ${response.status}`);
      }
      
      const { messages } = await response.json();
      
      // conversationIdでフィルタリング（二重チェック）
      const filteredMessages = messages.filter((msg: any) => 
        msg.conversation_id === conversationId
      );
      
      console.log('📨 [LOAD] Loaded messages:', {
        sessionId,
        conversationId,
        totalMessages: messages.length,
        filteredMessages: filteredMessages.length
      });
      
      return filteredMessages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        isFavorite: msg.is_favorite || false
      }));
    } catch (error) {
      console.error('❌ [LOAD] Failed to load messages:', error);
      return [];
    }
  }

  /**
   * 新しい会話を開始する際の完全なクリーンアップ（改善版）
   */
  static startNewConversation(): {
    session: ChatSession;
    messages: ChatMessage[];
    conversationId: string;
  } {
    const newSession = this.createNewSession();
    
    return {
      session: newSession,
      messages: [], // 必ず空の配列
      conversationId: newSession.conversationId!
    };
  }
}