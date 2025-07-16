import { useEffect, useRef } from 'react';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/app/lib/supabase';
import { ChatSession } from '@/app/types/chat';

// Supabaseのテーブル型定義
interface ChatSessionRecord {
  id: string;
  user_id: string;
  title: string;
  conversation_id?: string;
  is_pinned: boolean;
  is_manually_renamed?: boolean;
  created_at: string;
  updated_at: string;
}

interface ChatMessageRecord {
  id: string;
  session_id: string;
  user_id: string;
  role: 'user' | 'bot';
  content: string;
  timestamp: number;
  is_favorite?: boolean;
  created_at: string;
}

interface UseRealtimeSyncOptions {
  userId: string;
  onSessionUpdate: (session: ChatSession) => void;
  onSessionDelete: (sessionId: string) => void;
}

export function useRealtimeSync({ userId, onSessionUpdate, onSessionDelete }: UseRealtimeSyncOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  
  useEffect(() => {
    if (!supabase || !userId) return;
    
    // リアルタイムチャンネルを作成
    const channel = supabase
      .channel(`chat_sessions:user_id=eq.${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_sessions',
          filter: `user_id=eq.${userId}`
        },
        async (payload: RealtimePostgresChangesPayload<ChatSessionRecord>) => {
          console.log('🔄 [REALTIME] Change received:', payload);
          
          switch (payload.eventType) {
            case 'INSERT':
            case 'UPDATE':
              // セッションが追加または更新された
              if (payload.new) {
                const session = payload.new;
                
                // メッセージを別途取得
                try {
                  const response = await fetch(`/api/chat-messages?session_id=${session.id}`);
                  if (response.ok) {
                    const { messages } = await response.json();
                    
                    const fullSession: ChatSession = {
                      id: session.id,
                      title: session.title,
                      messages: messages.map((msg: any) => ({
                        role: msg.role,
                        content: msg.content,
                        timestamp: msg.timestamp,
                        isFavorite: msg.is_favorite || false
                      })),
                      conversationId: session.conversation_id,
                      createdAt: new Date(session.created_at).getTime(),
                      updatedAt: new Date(session.updated_at).getTime(),
                      isPinned: session.is_pinned || false,
                      isManuallyRenamed: session.is_manually_renamed || false
                    };
                    
                    onSessionUpdate(fullSession);
                  }
                } catch (error) {
                  console.error('❌ [REALTIME] Failed to fetch messages:', error);
                }
              }
              break;
              
            case 'DELETE':
              // セッションが削除された
              if (payload.old && payload.old.id) {
                onSessionDelete(payload.old.id as string);
              }
              break;
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `user_id=eq.${userId}`
        },
        async (payload: RealtimePostgresChangesPayload<ChatMessageRecord>) => {
          console.log('🔄 [REALTIME] Message change received:', payload);
          
          // メッセージが変更された場合、関連するセッションを更新
          if (payload.new && 'session_id' in payload.new) {
            const sessionId = payload.new.session_id;
            
            try {
              // セッション全体を再取得
              const sessionResponse = await fetch(`/api/chat-sessions/${sessionId}`);
              if (sessionResponse.ok) {
                const { session } = await sessionResponse.json();
                
                // メッセージも取得
                const messagesResponse = await fetch(`/api/chat-messages?session_id=${sessionId}`);
                if (messagesResponse.ok) {
                  const { messages } = await messagesResponse.json();
                  
                  const fullSession: ChatSession = {
                    ...session,
                    messages: messages.map((msg: any) => ({
                      role: msg.role,
                      content: msg.content,
                      timestamp: msg.timestamp,
                      isFavorite: msg.is_favorite || false
                    }))
                  };
                  
                  onSessionUpdate(fullSession);
                }
              }
            } catch (error) {
              console.error('❌ [REALTIME] Failed to update session:', error);
            }
          }
        }
      );
    
    // チャンネルを購読
    channel.subscribe((status: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR') => {
      console.log('📡 [REALTIME] Subscription status:', status);
    });
    
    channelRef.current = channel;
    
    // クリーンアップ
    return () => {
      if (channelRef.current) {
        console.log('🔌 [REALTIME] Unsubscribing from channel');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, onSessionUpdate, onSessionDelete]);
  
  return {
    isConnected: channelRef.current !== null
  };
}