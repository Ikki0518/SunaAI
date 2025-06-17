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
    try {
      await saveSupabaseChatSession({
        id: session.id,
        user_id,
        title: session.title,
        conversation_id: session.conversationId,
        is_pinned: session.isPinned || false,
        created_at: new Date(session.createdAt).toISOString(),
        updated_at: new Date(session.updatedAt).toISOString()
      });
      console.log('🐘 [SYNC] Session saved to Supabase:', session.id);
    } catch (error) {
      console.error('🐘 [SYNC] Failed to save session to Supabase:', error);
      throw error;
    }
  }

  // Supabaseからユーザーのチャットセッション一覧を取得
  static async loadSessionsFromSupabase(user_id: string): Promise<ChatSession[]> {
    try {
      const supabaseSessions = await getSupabaseChatSessions(user_id);
      console.log('🐘 [SYNC] Loaded sessions from Supabase:', supabaseSessions.length);
      
      // Supabaseの形式から ChatSession 形式に変換
      const sessions: ChatSession[] = supabaseSessions.map((session: any) => ({
        id: session.id,
        title: session.title,
        messages: [], // 後で個別に読み込み
        conversationId: session.conversation_id,
        createdAt: new Date(session.created_at).getTime(),
        updatedAt: new Date(session.updated_at).getTime(),
        isPinned: session.is_pinned || false
      }));
      
      return sessions;
    } catch (error) {
      console.error('🐘 [SYNC] Failed to load sessions from Supabase:', error);
      return [];
    }
  }

  // Supabaseにチャットメッセージを保存
  static async saveMessageToSupabase(message: ChatMessage, session_id: string, user_id: string) {
    try {
      await saveSupabaseChatMessage({
        session_id,
        user_id,
        role: message.role,
        content: message.content,
        timestamp: message.timestamp,
        created_at: new Date(message.timestamp).toISOString()
      });
      console.log('🐘 [SYNC] Message saved to Supabase');
    } catch (error) {
      console.error('🐘 [SYNC] Failed to save message to Supabase:', error);
      throw error;
    }
  }

  // Supabaseからチャットセッションのメッセージ一覧を取得
  static async loadMessagesFromSupabase(session_id: string): Promise<ChatMessage[]> {
    try {
      const supabaseMessages = await getSupabaseChatMessages(session_id);
      console.log('🐘 [SYNC] Loaded messages from Supabase:', supabaseMessages.length);
      
      // Supabaseの形式から ChatMessage 形式に変換
      const messages: ChatMessage[] = supabaseMessages.map((message: any) => ({
        role: message.role,
        content: message.content,
        timestamp: message.timestamp
      }));
      
      return messages;
    } catch (error) {
      console.error('🐘 [SYNC] Failed to load messages from Supabase:', error);
      return [];
    }
  }

  // 🔄 ローカルストレージでリアルタイム同期（擬似同期）
  static broadcastChatUpdate(session: ChatSession) {
    try {
      // ローカルストレージに保存
      this.saveChatSession(session);
      
      // カスタムイベントを発行してタブ間で同期
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('chatHistoryUpdated', {
          detail: { session, timestamp: Date.now() }
        }));
        
        console.log('📡 [LOCAL SYNC] Chat session broadcasted:', session.id);
      }
    } catch (error) {
      console.error('📡 [LOCAL SYNC] Failed to broadcast update:', error);
    }
  }

  // 🔄 ローカル同期イベントリスナーの設定
  static setupLocalSyncListener(callback: () => void) {
    if (typeof window === 'undefined') return;

    const handleChatUpdate = (event: CustomEvent) => {
      console.log('📡 [LOCAL SYNC] Received chat update:', event.detail);
      callback();
    };

    window.addEventListener('chatHistoryUpdated', handleChatUpdate as EventListener);
    
    return () => {
      window.removeEventListener('chatHistoryUpdated', handleChatUpdate as EventListener);
    };
  }

  // ハイブリッド同期: Supabaseとローカルストレージの両方を使用
  static async syncChatSession(session: ChatSession, user_id?: string): Promise<void> {
    try {
      console.log('🐘 [SYNC] Starting chat session sync:', {
        sessionId: session.id,
        userId: user_id,
        messageCount: session.messages?.length || 0
      });
      
      // ローカルストレージに保存 + ブロードキャスト
      this.broadcastChatUpdate(session);
      console.log('💾 [SYNC] Local save completed');
      
      // ユーザーIDがある場合はSupabaseにも保存
      if (user_id) {
        await this.saveSessionToSupabase(session, user_id);
        console.log('🐘 [SYNC] Session saved to Supabase');
        
        // メッセージもSupabaseに保存
        for (const message of session.messages || []) {
          await this.saveMessageToSupabase(message, session.id, user_id);
        }
        console.log('💬 [SYNC] Messages saved to Supabase:', session.messages?.length || 0);
      } else {
        console.log('⚠️ [SYNC] No user ID provided, using local sync only');
      }
    } catch (error) {
      console.error('🐘 [SYNC] Failed to sync chat session:', error);
      // エラーが発生してもローカル保存は続行
      this.broadcastChatUpdate(session);
    }
  }

  // ハイブリッド読み込み: Supabaseから読み込み、失敗時はローカル
  static async loadAllSessions(user_id?: string): Promise<ChatSession[]> {
    try {
      if (user_id) {
        // まずSupabaseから読み込み
        const supabaseSessions = await this.loadSessionsFromSupabase(user_id);
        
        // 各セッションのメッセージも読み込み
        for (const session of supabaseSessions) {
          session.messages = await this.loadMessagesFromSupabase(session.id);
        }
        
        if (supabaseSessions.length > 0) {
          // Supabaseのデータをローカルストレージにも保存（オフライン対応）
          localStorage.setItem(this.getLocalStorageKey(), JSON.stringify(supabaseSessions));
          return supabaseSessions;
        }
      }
      
      // Supabaseが失敗またはuser_idがない場合はローカルから読み込み
      const localSessions = this.getSortedSessions();
      console.log('💾 [LOCAL SYNC] Using local sessions:', localSessions.length);
      return localSessions;
    } catch (error) {
      console.error('🐘 [SYNC] Failed to load sessions, falling back to local:', error);
      return this.getSortedSessions();
    }
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
      
      // 削除もブロードキャスト
      window.dispatchEvent(new CustomEvent('chatHistoryUpdated', {
        detail: { action: 'delete', sessionId, timestamp: Date.now() }
      }));
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
        
        // ピン留め変更もブロードキャスト
        window.dispatchEvent(new CustomEvent('chatHistoryUpdated', {
          detail: { action: 'pin', sessionId, isPinned: sessions[sessionIndex].isPinned, timestamp: Date.now() }
        }));
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
        
        // リネームもブロードキャスト
        window.dispatchEvent(new CustomEvent('chatHistoryUpdated', {
          detail: { action: 'rename', sessionId, newTitle, timestamp: Date.now() }
        }));
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