"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { ChatSession, ChatMessage } from '@/app/types/chat';
import { FixedChatHistoryManager } from '@/app/utils/chatHistory-fixed';
import { ChatHistoryManager } from '@/app/utils/chatHistory';

export default function FixedClientChatPage() {
  const { data: session, status } = useSession();
  
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'connected' | 'disconnected' | 'syncing'>('disconnected');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 初期セッション作成（改善版）
  useEffect(() => {
    if (mounted && !currentSession && status !== "loading") {
      // 新しいセッションを作成（履歴なし）
      const { session: newSession, messages: newMessages, conversationId: newConvId } = 
        FixedChatHistoryManager.startNewConversation();
      
      setCurrentSession(newSession);
      setMessages(newMessages); // 必ず空の配列
      setConversationId(newConvId);
      
      console.log('🎉 [INIT] Started with clean session:', {
        sessionId: newSession.id,
        conversationId: newConvId,
        messageCount: newMessages.length // 必ず0
      });
    }
  }, [mounted, currentSession, status]);

  /**
   * 新しいチャットを開始（改善版）
   * - 現在のセッションを保存
   * - 完全に新しいセッションを作成
   * - メッセージを確実にクリア
   */
  const handleNewChat = async () => {
    console.log('🆕 [NEW CHAT] Starting new conversation...');
    
    // 現在のセッションにメッセージがある場合は保存
    if (currentSession && messages.length > 0) {
      console.log('💾 [NEW CHAT] Saving current session before creating new one...');
      try {
        await saveCurrentSession();
        console.log('✅ [NEW CHAT] Current session saved');
      } catch (error) {
        console.error('❌ [NEW CHAT] Failed to save current session:', error);
      }
    }
    
    // 完全に新しいセッションを作成
    const { session: newSession, messages: newMessages, conversationId: newConvId } = 
      FixedChatHistoryManager.startNewConversation();
    
    // 状態を更新（メッセージは必ず空）
    setCurrentSession(newSession);
    setMessages([]); // 明示的に空の配列を設定
    setConversationId(newConvId);
    setInput(""); // 入力フィールドもクリア
    
    console.log('✅ [NEW CHAT] New conversation started:', {
      sessionId: newSession.id,
      conversationId: newConvId,
      messageCount: 0
    });
    
    // サイドバーを更新
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('chatHistoryUpdated'));
    }, 100);
  };

  /**
   * セッション選択時の処理（改善版）
   * - 現在のセッションを保存
   * - 選択されたセッションのメッセージを正しく読み込む
   * - conversationIdでフィルタリング
   */
  const handleSessionSelect = async (selectedSession: ChatSession) => {
    console.log('📂 [SELECT] Selecting session:', {
      sessionId: selectedSession.id,
      conversationId: selectedSession.conversationId,
      title: selectedSession.title
    });
    
    // 現在のセッションを保存
    if (currentSession && messages.length > 0) {
      await saveCurrentSession();
    }
    
    // セッションを切り替え
    setCurrentSession(selectedSession);
    setConversationId(selectedSession.conversationId || null);
    
    // メッセージを読み込み（conversationIdでフィルタリング）
    try {
      if (selectedSession.conversationId) {
        const loadedMessages = await FixedChatHistoryManager.loadMessagesForSession(
          selectedSession.id,
          selectedSession.conversationId,
          session?.user?.id
        );
        
        console.log('📨 [SELECT] Messages loaded:', {
          count: loadedMessages.length,
          conversationId: selectedSession.conversationId
        });
        
        setMessages(loadedMessages);
      } else {
        // conversationIdがない場合は空のメッセージ
        console.warn('⚠️ [SELECT] No conversationId, using empty messages');
        setMessages([]);
      }
    } catch (error) {
      console.error('❌ [SELECT] Failed to load messages:', error);
      setMessages([]);
    }
  };

  /**
   * メッセージ送信時の処理（改善版）
   * - conversationIdを必ず含める
   */
  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    // conversationIdがない場合は新しく生成
    if (!conversationId) {
      const newConvId = FixedChatHistoryManager.generateUUID();
      setConversationId(newConvId);
      
      if (currentSession) {
        currentSession.conversationId = newConvId;
      }
    }
    
    const userMessage = input;
    setInput("");
    const userMsg: ChatMessage = { 
      role: "user", 
      content: userMessage, 
      timestamp: Date.now() 
    };
    
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          conversationId: conversationId, // 必ずconversationIdを送信
          sessionId: currentSession?.id
        }),
      });
      
      const data = await res.json();
      
      if (res.ok && data.answer) {
        const botMsg: ChatMessage = { 
          role: "bot", 
          content: data.answer, 
          timestamp: Date.now() 
        };
        
        setMessages(prev => [...prev, botMsg]);
        
        // conversationIdを更新（APIから返された場合）
        if (data.conversationId && !conversationId) {
          setConversationId(data.conversationId);
          if (currentSession) {
            currentSession.conversationId = data.conversationId;
          }
        }
      } else {
        const errorMsg: ChatMessage = { 
          role: "bot", 
          content: "エラーが発生しました", 
          timestamp: Date.now() 
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    } catch (error) {
      const errorMsg: ChatMessage = { 
        role: "bot", 
        content: "エラーが発生しました", 
        timestamp: Date.now() 
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * セッション保存処理（改善版）
   * - conversationIdを必ず含める
   */
  const saveCurrentSession = useCallback(async () => {
    if (!mounted || !currentSession || messages.length === 0 || isSaving) {
      return;
    }
    
    setIsSaving(true);
    
    try {
      const updatedSession: ChatSession = {
        ...currentSession,
        messages,
        conversationId: conversationId || undefined,
        updatedAt: Date.now(),
      };
      
      // 保存処理（既存のロジックを使用）
      if (session?.user?.id) {
        // Supabaseに保存
        await ChatHistoryManager.syncChatSession(updatedSession, session.user.id);
      } else {
        // ローカルに保存
        ChatHistoryManager.saveChatSession(updatedSession);
      }
      
      console.log('💾 [SAVE] Session saved with conversationId:', conversationId);
    } finally {
      setIsSaving(false);
    }
  }, [mounted, currentSession, messages, conversationId, session?.user?.id, isSaving]);

  // ... 残りのコンポーネントロジックは既存のものを使用
}