import { ChatSession, ChatMessage } from '@/app/types/chat';

export class ChatHistoryManager {
  // Supabaseにチャットセッションを保存
  static async saveSessionToSupabase(session: ChatSession, user_id: string) {
    try {
      const response = await fetch('/api/chat-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chatSession: session }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      console.log('🐘 [SYNC] Session saved to Supabase via API');
    } catch (error) {
      console.error('🐘 [SYNC] Failed to save session to Supabase:', error);
      throw error;
    }
  }

  // API経由でSupabaseからユーザーのチャットセッション一覧を取得
  static async loadSessionsFromSupabase(user_id: string): Promise<ChatSession[]> {
    try {
      console.log('🚀 [API DEBUG] Starting loadSessionsFromSupabase with user_id:', user_id?.slice(0, 8) + '...');
      console.log('🚀 [API DEBUG] About to fetch /api/chat-sessions...');
      
      const response = await fetch('/api/chat-sessions', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('🚀 [API DEBUG] Fetch completed, response status:', response.status, response.statusText);
      console.log('🚀 [API DEBUG] Response ok:', response.ok);

      if (!response.ok) {
        console.error('🚀 [API DEBUG] Response not ok, reading error data...');
        const errorText = await response.text();
        console.error('🚀 [API DEBUG] Error response text:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (parseError) {
          console.error('🚀 [API DEBUG] Could not parse error as JSON:', parseError);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      console.log('🚀 [API DEBUG] About to parse response as JSON...');
      const responseData = await response.json();
      console.log('🚀 [API DEBUG] Response data type:', typeof responseData);
      console.log('🚀 [API DEBUG] Response data keys:', Object.keys(responseData));
      console.log('🚀 [API DEBUG] Response data:', JSON.stringify(responseData, null, 2));
      
      const { sessions: supabaseSessions } = responseData;
      
      if (!supabaseSessions) {
        console.error('❌ [API DEBUG] No sessions field in response data');
        throw new Error('Response does not contain sessions field');
      }
      
      if (!Array.isArray(supabaseSessions)) {
        console.error('❌ [API DEBUG] Sessions field is not an array:', typeof supabaseSessions);
        throw new Error('Sessions field is not an array');
      }
      
      console.log('🐘 [SYNC] Loaded sessions from Supabase via API:', supabaseSessions.length);
      
      // Supabaseの形式から ChatSession 形式に変換
      const sessions: ChatSession[] = supabaseSessions.map((session: any) => {
        // タイムスタンプの安全な変換
        let createdAt = Date.now();
        let updatedAt = Date.now();

        try {
          if (session.created_at) {
            const createdDate = new Date(session.created_at);
            if (!isNaN(createdDate.getTime())) {
              createdAt = createdDate.getTime();
            }
          }
        } catch (error) {
          console.warn('⚠️ [SYNC] Invalid created_at timestamp for session:', session.id, session.created_at);
        }

        try {
          if (session.updated_at) {
            const updatedDate = new Date(session.updated_at);
            if (!isNaN(updatedDate.getTime())) {
              updatedAt = updatedDate.getTime();
            }
          }
        } catch (error) {
          console.warn('⚠️ [SYNC] Invalid updated_at timestamp for session:', session.id, session.updated_at);
        }

        return {
          id: session.id,
          title: session.title || '無題のチャット',
          messages: [], // 後で個別に読み込み
          conversationId: session.conversation_id,
          createdAt,
          updatedAt,
          isPinned: session.is_pinned || false
        };
      });
      
      console.log('✅ [API DEBUG] Successfully converted sessions:', sessions.length);
      return sessions;
    } catch (error) {
      console.error('❌ [API DEBUG] Comprehensive error details:');
      console.error('❌ [API DEBUG] Error type:', typeof error);
      console.error('❌ [API DEBUG] Error instance:', error instanceof Error);
      console.error('❌ [API DEBUG] Error constructor:', error?.constructor?.name);
      console.error('❌ [API DEBUG] Error message:', error instanceof Error ? error.message : String(error));
      console.error('❌ [API DEBUG] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('❌ [API DEBUG] Full error object:', error);
      
      // テーブルが存在しない場合の特別なエラーハンドリング
      if (error instanceof Error) {
        if (error.message.includes('relation') && error.message.includes('does not exist')) {
          console.warn('⚠️ [SYNC] Supabaseテーブルが存在しません。管理者にお問い合わせください。');
          throw new Error('Supabaseテーブルが未作成です。管理者にテーブル作成を依頼してください。');
        }
        
        if (error.message.includes('permission') || error.message.includes('access')) {
          console.warn('⚠️ [SYNC] Supabaseアクセス権限がありません。');
          throw new Error('データベースへのアクセス権限がありません。');
        }
      }
      
      throw error;
    }
  }

  // API経由でSupabaseにチャットメッセージを保存
  static async saveMessageToSupabase(message: ChatMessage, session_id: string, user_id: string) {
    try {
      console.log('💾 [DEBUG] Saving message to Supabase:', {
        session_id,
        role: message.role,
        content: message.content.substring(0, 20) + '...',
        timestamp: message.timestamp
      });
      
      const response = await fetch('/api/chat-messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, session_id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      console.log('🐘 [SYNC] Message saved to Supabase via API');
    } catch (error) {
      console.error('🐘 [SYNC] Failed to save message to Supabase:', error);
      throw error;
    }
  }

  // API経由でSupabaseからチャットセッションのメッセージ一覧を取得
  static async loadMessagesFromSupabase(session_id: string): Promise<ChatMessage[]> {
    try {
      console.log('🐘 [SYNC DEBUG] Attempting Supabase message load via API for session:', session_id);
      
      const response = await fetch(`/api/chat-messages?session_id=${encodeURIComponent(session_id)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const { messages: supabaseMessages } = await response.json();
      console.log('🐘 [SYNC] Loaded messages from Supabase via API:', supabaseMessages.length);
      
      // Supabaseの形式から ChatMessage 形式に変換
      const messages: ChatMessage[] = supabaseMessages.map((message: any) => ({
        role: message.role,
        content: message.content,
        timestamp: message.timestamp,
        isFavorite: message.is_favorite || false
      }));
      
      return messages;
    } catch (error) {
      console.error('🐘 [SYNC] Failed to load messages from Supabase:', error);
      
      // テーブルが存在しない場合の特別なエラーハンドリング  
      if (error instanceof Error) {
        if (error.message.includes('relation') && error.message.includes('does not exist')) {
          console.warn('⚠️ [SYNC] Supabaseメッセージテーブルが存在しません。');
          return []; // メッセージが読み込めない場合は空配列を返す
        }
        
        if (error.message.includes('permission') || error.message.includes('access')) {
          console.warn('⚠️ [SYNC] Supabaseメッセージアクセス権限がありません。');
          return []; // 権限エラーの場合も空配列を返す
        }
      }
      
      // その他のエラーの場合は空配列を返す（セッション読み込みは継続）
      console.warn('⚠️ [SYNC] Using empty messages due to error:', error instanceof Error ? error.message : String(error));
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

  // 真のデバイス間同期: Supabaseを必須とする
  static async syncChatSession(session: ChatSession, user_id?: string): Promise<void> {
    console.log('🔄 [SYNC DEBUG] Starting chat session sync:', {
      sessionId: session.id,
      userId: user_id,
      messageCount: session.messages?.length || 0,
      hasUserId: !!user_id,
      sessionTitle: session.title,
      isManuallyRenamed: session.isManuallyRenamed
    });
    
    // ユーザーIDがない場合はローカルストレージのみに保存
    if (!user_id) {
      console.log('⚠️ [SYNC DEBUG] No user ID - saving to local storage only');
      
      // ローカルストレージに保存
      this.saveChatSession(session);
      
      // ローカルイベントをブロードキャスト（タブ間同期）
      this.broadcastChatUpdate(session);
      
      console.log('✅ [SYNC DEBUG] Guest session saved to local storage');
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
      console.error('❌ [SYNC DEBUG] Supabase sync failed - falling back to local storage:', error);
      
      // Supabaseエラー時はローカルストレージに保存（フォールバック）
      console.log('💾 [SYNC DEBUG] Saving to local storage as fallback');
      if (typeof window !== 'undefined') {
        try {
          // キャッシュに保存
          const existingCache = localStorage.getItem(this.getLocalStorageKey() + '_cache');
          let sessions = existingCache ? JSON.parse(existingCache) : [];
          const sessionIndex = sessions.findIndex((s: ChatSession) => s.id === session.id);
          
          if (sessionIndex !== -1) {
            sessions[sessionIndex] = session;
          } else {
            sessions.push(session);
          }
          
          localStorage.setItem(this.getLocalStorageKey() + '_cache', JSON.stringify(sessions));
          
          // 旧形式のローカルストレージにも保存（互換性維持）
          localStorage.setItem(this.getLocalStorageKey(), JSON.stringify(sessions));
          
          console.log('💾 [SYNC DEBUG] Successfully saved to local storage');
        } catch (localError) {
          console.error('💾 [SYNC DEBUG] Failed to save to local storage:', localError);
        }
      }
      
      // エラーは上位に投げないで、ローカル保存成功とする
      console.log('⚠️ [SYNC DEBUG] チャットはローカルに保存されました（デバイス間同期は無効）');
    }
  }

  // 統合されたセッション読み込みメソッド
  static async loadAllSessions(user_id?: string): Promise<ChatSession[]> {
    // ゲストモードの場合は即座にローカルストレージから読み込み
    if (!user_id) {
      console.log('👤 [LOAD] Guest mode - using local storage only');
      return this.loadFromLocalStorage('guest');
    }

    try {
      console.log('🎯 [LOAD] User authenticated - attempting Supabase load...');
      
      // メインのSupabaseからの読み込み試行
      const supabaseSessions = await this.loadSessionsFromSupabase(user_id);
      console.log('✅ [LOAD] Supabase sessions loaded successfully:', supabaseSessions.length);
      
      // 各セッションのメッセージを読み込み（最初の5つのセッションのみ）
      const sessionsToLoadMessages = supabaseSessions.slice(0, 5);
      const sessionsWithoutMessages = supabaseSessions.slice(5);
      
      const sessionsWithMessages = await Promise.all(
        sessionsToLoadMessages.map(async (session) => {
          try {
            const messages = await this.loadMessagesFromSupabase(session.id);
            return {
              ...session,
              messages
            };
          } catch (messageError) {
            console.warn('⚠️ [LOAD] Failed to load messages for session:', session.id, messageError);
            return session; // メッセージが読み込めなくてもセッションは残す
          }
        })
      );
      
      // 残りのセッションは空のメッセージ配列で初期化
      const allSessions = [
        ...sessionsWithMessages,
        ...sessionsWithoutMessages.map(session => ({
          ...session,
          messages: []
        }))
      ];
      
      console.log('✅ [LOAD] Sessions loaded:',
        `${sessionsToLoadMessages.length} with messages, ${sessionsWithoutMessages.length} without`);
      
      // 重複セッションを除去
      const deduplicatedSessions = this.deduplicateSessionsByTitle(allSessions);
      console.log('🧹 [LOAD] Deduplicated sessions:', allSessions.length, '→', deduplicatedSessions.length);
      
      // ローカルキャッシュに保存
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(this.getLocalStorageKey() + '_cache', JSON.stringify(deduplicatedSessions));
        } catch (cacheError) {
          console.warn('⚠️ [LOAD] Cache save failed:', cacheError);
        }
      }
      return deduplicatedSessions;
      
    } catch (supabaseError) {
      console.error('❌ [LOAD] Supabase load failed, falling back to local storage');
      console.error('Error:', supabaseError instanceof Error ? supabaseError.message : String(supabaseError));
      
      // エラー時はローカルストレージにフォールバック
      return this.loadFromLocalStorage('fallback');
    }
  }

  // ローカルストレージからデータを読み込む統一メソッド
  private static loadFromLocalStorage(mode: 'guest' | 'fallback'): ChatSession[] {
    if (typeof window === 'undefined') return [];
    
    try {
      // 1. キャッシュから試行
      const cached = localStorage.getItem(this.getLocalStorageKey() + '_cache');
      if (cached) {
        const cachedSessions = JSON.parse(cached);
        console.log('💾 [LOAD] Using cached data:', cachedSessions.length, 'sessions');
        return cachedSessions;
      }
      
      // 2. 旧形式のローカルストレージから試行
      const legacy = localStorage.getItem(this.getLocalStorageKey());
      if (legacy) {
        const legacySessions = JSON.parse(legacy);
        console.log('💾 [LOAD] Using legacy data:', legacySessions.length, 'sessions');
        return legacySessions;
      }
      
      console.log('💾 [LOAD] No local data found');
      return [];
      
    } catch (localError) {
      console.error('❌ [LOAD] Local storage read failed:', localError);
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
        sessions[sessionIndex].isManuallyRenamed = true; // 手動変更フラグを設定
        localStorage.setItem(this.getLocalStorageKey(), JSON.stringify(sessions));
        
        console.log('✏️ [RENAME] Session renamed manually:', sessionId, newTitle);
        
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

  // UUID生成用のヘルパー関数
  private static generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // 新しいセッションを作成
  static createNewSession(): ChatSession {
    const now = Date.now();
    const existingSessions = this.getSortedSessions();
    
    // 30秒以内に作成された空の「新しいチャット」セッションがある場合、それを再利用
    const recentEmptySession = existingSessions.find(session =>
      session.title === '新しいチャット' &&
      (now - session.createdAt) < 30000 && // 30秒以内
      (!session.messages || session.messages.length === 0) // メッセージが空
    );
    
    if (recentEmptySession) {
      console.log('🔄 [SESSION] Reusing recent empty session:', recentEmptySession.id);
      return recentEmptySession;
    }
    
    const newSession = {
      id: this.generateUUID(), // UUID形式のIDを生成
      title: '新しいチャット',
      messages: [],
      createdAt: now,
      updatedAt: now,
      isPinned: false
    };
    
    console.log('➕ [SESSION] Creating new session:', newSession.id);
    return newSession;
  }

  // メッセージからセッションタイトルを生成
  static generateSessionTitle(messages: ChatMessage[]): string {
    console.log('🏷️ [TITLE] Generating title from messages:', messages.length);
    
    if (messages.length === 0) return '新しいチャット';
    
    // ユーザーメッセージを全て取得
    const userMessages = messages.filter(m => m.role === 'user');
    console.log('🏷️ [TITLE] User messages found:', userMessages.length);
    
    if (userMessages.length === 0) return '新しいチャット';
    
    // 最初のメッセージが「こんにちは」などの挨拶の場合、2個目・3個目のメッセージを優先
    let titleMessage = userMessages[0];
    
    if (userMessages.length > 1) {
      const greetings = ['こんにちは', 'おはよう', 'こんばんは', 'やあ', 'ハロー', 'hello', 'hi'];
      const firstMessageLower = userMessages[0].content.toLowerCase().trim();
      
      if (greetings.some(greeting => firstMessageLower.includes(greeting))) {
        console.log('🏷️ [TITLE] First message is greeting, using second message');
        titleMessage = userMessages[1];
      }
    }
    
    // 最初の30文字を取得し、改行を除去
    const title = titleMessage.content
      .replace(/\n/g, ' ')
      .substring(0, 30);
    
    console.log('🏷️ [TITLE] Generated title:', title);
    return title.length < titleMessage.content.length ? title + '...' : title;
  }

  // チャットセッションを保存（メッセージを含む）
  static saveChatSession(session: ChatSession): void {
    try {
      if (typeof window === 'undefined') return;
      
      console.log('💾 [SAVE DEBUG] Starting session save:', {
        sessionId: session.id,
        title: session.title,
        messageCount: session.messages?.length || 0,
        timestamp: new Date().toLocaleTimeString()
      });
      
      const sessions = this.getSortedSessions();
      const existingIndex = sessions.findIndex(s => s.id === session.id);
      
      console.log('💾 [SAVE DEBUG] Current sessions count:', sessions.length);
      console.log('💾 [SAVE DEBUG] Existing session index:', existingIndex);
      
      // 重複タイトルチェック - 同じタイトルのセッションがある場合は統合
      if (existingIndex === -1) {
        const duplicateByTitle = sessions.findIndex(s =>
          s.title === session.title &&
          s.title !== '新しいチャット' &&
          Math.abs(s.createdAt - session.createdAt) < 60000 // 1分以内に作成されたもの
        );
        
        if (duplicateByTitle !== -1) {
          console.log('⚠️ [SAVE DEBUG] Duplicate title detected, merging sessions:', session.title);
          // 既存のセッションにメッセージをマージ
          const existingSession = sessions[duplicateByTitle];
          existingSession.messages = session.messages;
          existingSession.updatedAt = session.updatedAt;
          existingSession.conversationId = session.conversationId;
          localStorage.setItem(this.getLocalStorageKey(), JSON.stringify(sessions));
          console.log('✅ [SAVE DEBUG] Sessions merged successfully');
          return;
        }
      }
      
      if (existingIndex !== -1) {
        console.log('🔄 [SAVE DEBUG] Updating existing session');
        sessions[existingIndex] = session;
      } else {
        console.log('➕ [SAVE DEBUG] Adding new session');
        sessions.push(session);
      }
      
      localStorage.setItem(this.getLocalStorageKey(), JSON.stringify(sessions));
      console.log('✅ [SAVE DEBUG] Session saved successfully, total sessions:', sessions.length);
    } catch (error) {
      console.error('❌ [SAVE DEBUG] Failed to save chat session:', error);
      throw error;
    }
  }

  // タイトルによる重複セッション除去
  static deduplicateSessionsByTitle(sessions: ChatSession[]): ChatSession[] {
    const sessionGroups = new Map<string, ChatSession[]>();
    
    // タイトルでグループ化
    sessions.forEach(session => {
      const title = session.title || 'Untitled';
      if (!sessionGroups.has(title)) {
        sessionGroups.set(title, []);
      }
      sessionGroups.get(title)!.push(session);
    });
    
    const deduplicatedSessions: ChatSession[] = [];
    
    sessionGroups.forEach((group, title) => {
      if (group.length > 1) {
        console.log('🔍 [DEDUPE] Found duplicates for title:', title, 'count:', group.length);
        
        // 最も多くのメッセージを持つセッションを選択
        const bestSession = group.reduce((best, current) => {
          const bestMsgCount = best.messages?.length || 0;
          const currentMsgCount = current.messages?.length || 0;
          const bestCreatedAt = best.createdAt || 0;
          const currentCreatedAt = current.createdAt || 0;
          
          // メッセージ数が多い方を優先、同じ場合は新しい方を優先
          if (currentMsgCount > bestMsgCount) {
            return current;
          } else if (currentMsgCount === bestMsgCount && currentCreatedAt > bestCreatedAt) {
            return current;
          }
          return best;
        });
        
        console.log('✅ [DEDUPE] Selected session for', title, '- messages:', bestSession.messages?.length || 0, 'id:', bestSession.id);
        deduplicatedSessions.push(bestSession);
      } else {
        deduplicatedSessions.push(group[0]);
      }
    });
    
    // 作成日時でソート
    return deduplicatedSessions.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  // 重複セッションをクリーンアップする
  static cleanupDuplicateSessions(): void {
    try {
      if (typeof window === 'undefined') return;
      
      const sessions = this.getSortedSessions();
      console.log('🧹 [CLEANUP] Starting cleanup, total sessions:', sessions.length);
      
      // タイトルとタイムスタンプでグループ化
      const sessionGroups = new Map<string, ChatSession[]>();
      
      sessions.forEach(session => {
        const key = `${session.title}_${Math.floor(session.createdAt / 60000)}`; // 1分単位でグループ化
        if (!sessionGroups.has(key)) {
          sessionGroups.set(key, []);
        }
        sessionGroups.get(key)!.push(session);
      });
      
      const cleanedSessions: ChatSession[] = [];
      
      sessionGroups.forEach((group, key) => {
        if (group.length > 1) {
          console.log('🧹 [CLEANUP] Found duplicate group:', key, 'count:', group.length);
          // 最新のセッション（最も多くのメッセージを持つ）を保持
          const bestSession = group.reduce((best, current) => {
            const bestMsgCount = best.messages?.length || 0;
            const currentMsgCount = current.messages?.length || 0;
            return currentMsgCount > bestMsgCount ? current : best;
          });
          cleanedSessions.push(bestSession);
          console.log('🧹 [CLEANUP] Keeping session:', bestSession.id, 'with', bestSession.messages?.length || 0, 'messages');
        } else {
          cleanedSessions.push(group[0]);
        }
      });
      
      if (cleanedSessions.length < sessions.length) {
        localStorage.setItem(this.getLocalStorageKey(), JSON.stringify(cleanedSessions));
        console.log('🧹 [CLEANUP] Cleanup completed. Removed', sessions.length - cleanedSessions.length, 'duplicates');
        console.log('🧹 [CLEANUP] Final session count:', cleanedSessions.length);
      } else {
        console.log('🧹 [CLEANUP] No duplicates found');
      }
    } catch (error) {
      console.error('❌ [CLEANUP] Cleanup failed:', error);
    }
  }
}