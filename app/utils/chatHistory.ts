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
      console.log('🐘 [SYNC DEBUG] Attempting Supabase session load for user:', user_id);
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
      console.log('💾 [SYNC] Falling back to local storage...');
      
      // Supabaseエラー時はローカルストレージを使用
      try {
        const localSessions = this.getSortedSessions();
        console.log('💾 [SYNC] Using local sessions as fallback:', localSessions.length);
        return localSessions;
      } catch (localError) {
        console.error('💾 [SYNC] Local fallback also failed:', localError);
        return [];
      }
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
      console.log('🐘 [SYNC DEBUG] Attempting Supabase message load for session:', session_id);
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
      console.log('💾 [SYNC] Falling back to local storage for messages...');
      
      // Supabaseエラー時はローカルストレージからセッションのメッセージを取得
      try {
        const localSessions = this.getSortedSessions();
        const session = localSessions.find(s => s.id === session_id);
        const messages = session?.messages || [];
        console.log('💾 [SYNC] Using local messages as fallback:', messages.length);
        return messages;
      } catch (localError) {
        console.error('💾 [SYNC] Local message fallback also failed:', localError);
        return [];
      }
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

  // 真のデバイス間同期: Supabaseを必須とする
  static async syncChatSession(session: ChatSession, user_id?: string): Promise<void> {
    console.log('🔄 [SYNC DEBUG] Starting chat session sync:', {
      sessionId: session.id,
      userId: user_id,
      messageCount: session.messages?.length || 0,
      hasUserId: !!user_id,
      sessionTitle: session.title
    });
    
    // ユーザーIDがない場合は一時キャッシュのみ（同期なし）
    if (!user_id) {
      console.log('⚠️ [SYNC DEBUG] No user ID - saving to cache only (no cross-device sync)');
      if (typeof window !== 'undefined') {
        localStorage.setItem(this.getLocalStorageKey() + '_temp', JSON.stringify([session]));
      }
      return;
    }

    try {
      console.log('🐘 [SYNC DEBUG] Attempting Supabase sync for cross-device sync...');
      
      // Supabaseに保存（デバイス間同期）
      await this.saveSessionToSupabase(session, user_id);
      console.log('✅ [SYNC DEBUG] Session saved to Supabase successfully');
      
      // メッセージもSupabaseに保存
      console.log('💬 [SYNC DEBUG] Saving messages to Supabase...');
      for (const message of session.messages || []) {
        await this.saveMessageToSupabase(message, session.id, user_id);
      }
      console.log('✅ [SYNC DEBUG] All messages saved to Supabase:', session.messages?.length || 0);
      
      // 成功時のみローカルキャッシュを更新
      if (typeof window !== 'undefined') {
        try {
          const existingCache = localStorage.getItem(this.getLocalStorageKey() + '_cache');
          let sessions = existingCache ? JSON.parse(existingCache) : [];
          const sessionIndex = sessions.findIndex((s: ChatSession) => s.id === session.id);
          
          if (sessionIndex !== -1) {
            sessions[sessionIndex] = session;
          } else {
            sessions.push(session);
          }
          
          localStorage.setItem(this.getLocalStorageKey() + '_cache', JSON.stringify(sessions));
          console.log('💾 [SYNC DEBUG] Local cache updated after successful sync');
        } catch (cacheError) {
          console.error('💾 [SYNC DEBUG] Cache update failed (not critical):', cacheError);
        }
      }
      
      console.log('🎉 [SYNC DEBUG] Cross-device sync completed successfully!');
      
    } catch (error) {
      console.error('❌ [SYNC DEBUG] Supabase sync failed - no cross-device sync:', error);
      
      // Supabaseエラー時は一時データとして保存（デバイス間同期なし）
      console.log('💾 [SYNC DEBUG] Saving to temporary storage (no sync across devices)');
      if (typeof window !== 'undefined') {
        localStorage.setItem(this.getLocalStorageKey() + '_temp', JSON.stringify([session]));
      }
      
      // エラーを再スローして上位で処理
      throw new Error(`デバイス間同期が失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ハイブリッド読み込み: Supabaseを優先、ローカルは一時キャッシュのみ
  static async loadAllSessions(user_id?: string): Promise<ChatSession[]> {
    try {
      console.log('📥 [LOAD DEBUG] Starting session load:', {
        userId: user_id,
        hasUserId: !!user_id
      });
      
      if (user_id) {
        console.log('🐘 [LOAD DEBUG] Attempting to load from Supabase (デバイス間同期)...');
        
        try {
          // Supabaseから読み込み（デバイス間同期）
          const supabaseSessions = await this.loadSessionsFromSupabase(user_id);
          console.log('📊 [LOAD DEBUG] Supabase sessions loaded:', supabaseSessions.length);
          
          // 各セッションのメッセージも読み込み
          for (const session of supabaseSessions) {
            console.log('💬 [LOAD DEBUG] Loading messages for session:', session.id);
            session.messages = await this.loadMessagesFromSupabase(session.id);
          }
          
          console.log('✅ [LOAD DEBUG] Using Supabase data for cross-device sync');
          // Supabaseのデータをローカルキャッシュに保存（高速化用）
          if (typeof window !== 'undefined') {
            localStorage.setItem(this.getLocalStorageKey() + '_cache', JSON.stringify(supabaseSessions));
          }
          return supabaseSessions;
          
        } catch (supabaseError) {
          console.error('❌ [LOAD DEBUG] Supabase load failed:', supabaseError);
          console.log('⚠️ [LOAD DEBUG] デバイス間同期ができません。Supabase接続を確認してください');
          
          // Supabaseエラー時は一時的にキャッシュを使用（非推奨だが一時対応）
          try {
            const cached = localStorage.getItem(this.getLocalStorageKey() + '_cache');
            if (cached) {
              const cachedSessions = JSON.parse(cached);
              console.log('💾 [LOAD DEBUG] Using cached data temporarily:', cachedSessions.length);
              return cachedSessions;
            }
          } catch (cacheError) {
            console.error('💾 [LOAD DEBUG] Cache read failed:', cacheError);
          }
          
          // 最後の手段として空配列
          console.log('⚠️ [LOAD DEBUG] No data available - returning empty sessions');
          return [];
        }
      } else {
        console.log('⚠️ [LOAD DEBUG] ログインしていません。デバイス間同期を利用するにはログインが必要です');
        
        // 未ログイン時は一時的にローカルキャッシュを使用
        try {
          const cached = localStorage.getItem(this.getLocalStorageKey() + '_cache');
          if (cached) {
            const cachedSessions = JSON.parse(cached);
            console.log('💾 [LOAD DEBUG] Using cached data for guest mode:', cachedSessions.length);
            return cachedSessions;
          }
        } catch (cacheError) {
          console.error('💾 [LOAD DEBUG] Cache read failed:', cacheError);
        }
        
        return [];
      }
    } catch (error) {
      console.error('🚨 [LOAD DEBUG] Critical error in session loading:', error);
      return [];
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