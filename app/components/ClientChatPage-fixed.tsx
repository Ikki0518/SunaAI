"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import UserMenu from './UserMenu';
import ChatSidebar from './ChatSidebar';
import SunaLogo from '@/app/components/SunaLogo';
import { ChatSession, ChatMessage } from '@/app/types/chat';
import { ChatHistoryManager } from '@/app/utils/chatHistory';
import { useDeviceDetection } from '@/app/hooks/useDeviceDetection';
import MobileChatPage from './MobileChatPage';

interface Props {
  children: React.ReactNode;
}

export default function ClientChatPageFixed() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { isMobile, mounted: deviceMounted } = useDeviceDetection();
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Auto-scroll function for column-reverse layout
  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      // For column-reverse, scrollTop = 0 is the bottom
      messagesContainerRef.current.scrollTop = 0;
    }
  }, []);

  // Auto-scroll when messages update
  useEffect(() => {
    // Small delay to wait for DOM update
    setTimeout(scrollToBottom, 100);
  }, [messages, scrollToBottom]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !currentSession && status !== "loading") {
      const newSession = ChatHistoryManager.createNewSession();
      setCurrentSession(newSession);
      setMessages([]);
      setConversationId(null);
    }
  }, [mounted, currentSession, status]);

  const saveCurrentSession = useCallback(async () => {
    if (!mounted || !currentSession || messages.length === 0) {
      return;
    }
    
    try {
      const title = currentSession.isManuallyRenamed
        ? currentSession.title
        : (messages.length > 0 ? ChatHistoryManager.generateSessionTitle(messages) : currentSession.title);
      
      const updatedSession: ChatSession = {
        ...currentSession,
        messages,
        conversationId: conversationId || undefined,
        title,
        updatedAt: Date.now(),
      };
    } catch (error) {
      console.error('チャット保存エラー:', error);
    }
  }, [mounted, currentSession, messages, conversationId]);

  useEffect(() => {
    if (messages.length > 0 && mounted && currentSession) {
      const timeoutId = setTimeout(() => {
        saveCurrentSession().then(() => {
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('chatHistoryUpdated'));
          }, 100);
        });
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [messages.length, conversationId, mounted, currentSession, saveCurrentSession]);

  const handleNewChat = async () => {
    if (currentSession && messages.length > 0) {
      try {
        saveCurrentSession();
      } catch (error) {
        console.error('❌ [NEW CHAT] Failed to save current session:', error);
      }
    }
    
    const newSession = ChatHistoryManager.createNewSession();
    setCurrentSession(newSession);
    setMessages([]);
    setConversationId(null);
  };

  const handleSessionSelect = async (chatSession: ChatSession) => {
    saveCurrentSession();
    
    setCurrentSession(chatSession);
    setConversationId(chatSession.conversationId || null);
    
    try {
      let messages = chatSession.messages || [];
      
      if (session?.user?.id && chatSession.id) {
        const supabaseMessages = await ChatHistoryManager.loadMessagesFromSupabase(chatSession.id);
        messages = supabaseMessages;
      }
      
      const uniqueMessages = messages.filter((message, index, array) =>
        array.findIndex(m =>
          m.timestamp === message.timestamp &&
          m.role === message.role &&
          m.content === message.content
        ) === index
      );
      
      setMessages(uniqueMessages);
    } catch (error) {
      console.error('❌ [SESSION SELECT] Failed to load messages:', error);
      setMessages(chatSession.messages || []);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    if (!currentSession) {
      const newSession = ChatHistoryManager.createNewSession();
      setCurrentSession(newSession);
    }
    
    const userMessage = input;
    setInput("");
    const userMsg: ChatMessage = { role: "user", content: userMessage, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          conversationId: conversationId
        }),
      });
      const data = await res.json();
      if (res.ok && data.answer) {
        const botMsg: ChatMessage = { role: "bot", content: data.answer, timestamp: Date.now() };
        setMessages(prev => [...prev, botMsg]);
        if (data.conversationId) {
          setConversationId(data.conversationId);
        }
        
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('chatHistoryUpdated'));
        }, 100);
      } else {
        const errorMsg: ChatMessage = { role: "bot", content: "エラーが発生しました", timestamp: Date.now() };
        setMessages(prev => [...prev, errorMsg]);
      }
    } catch (error) {
      const errorMsg: ChatMessage = { role: "bot", content: "エラーが発生しました", timestamp: Date.now() };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = (index: number) => {
    setMessages(prev => {
      const newMessages = [...prev];
      newMessages[index] = {
        ...newMessages[index],
        isFavorite: !newMessages[index].isFavorite
      };
      
      if (currentSession) {
        const updatedSession = {
          ...currentSession,
          messages: newMessages,
          updatedAt: Date.now()
        };
        setCurrentSession(updatedSession);
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('chatHistoryUpdated'));
        }, 100);
      }
      
      return newMessages;
    });
  };

  const [isComposing, setIsComposing] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = () => {
    setIsComposing(false);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  if (deviceMounted && isMobile) {
    return <MobileChatPage />;
  }

  if (status === "loading" || !mounted) {
    return (
      
        
          
            
            読み込み中...
          
        
      
    );
  }

  if (status === "unauthenticated") {
    return (
      
        
          
            
            認証中...
          
        
      
    );
  }

  return (
    
      
        
          
            
              
                <SunaLogo size="sm"   />
                
                {session?.user && (
                  
                )}
              
              
                <UserMenu />
              
            
          
        

          
            
              
              {messages.length === 0 ? (
                
                  
                    {session?.user?.name ? (
                      
                         さん
                      
                    ) : (
                      
                         
                      
                    )}
                    
                      今日は何についてお話ししましょうか？
                    
                    
                      
                        
                          
                            
                            
                          
                          
                            チャットを始める
                          
                        
                      
                    
                  
                
              ) : (
                
                  {messages.map((msg, idx) => (
                    
                      
                        
                          
                            
                              {msg.role === "user" ? "あなた" : "Suna"}
                            
                            
                              
                                
                              
                            
                            
                              {msg.content}
                            
                          
                        
                      
                    
                  ))}

                  
                  {loading && (
                    
                      
                        
                          Suna
                        
                        
                          
                            
                              
                            
                            
                          
                        
                      
                    
                  )}
                
              
            
          
        

          
            
              
                
                  
                    メッセージを入力してください...
                  
                  
                    送信
                  
                
              
            
          
        
      
      
        
          
        
      
    
  );
}