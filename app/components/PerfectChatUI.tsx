'use client';

import React, { useState, useEffect, useRef } from 'react';

// メッセージの型定義
interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

/**
 * 完璧に動作するチャットUIコンポーネント
 * - flex-direction: column-reverseを使用して新しいメッセージを下部に表示
 * - 自動スクロール機能付き
 * - データは配列の末尾に追加（reverseは使用しない）
 */
const PerfectChatUI: React.FC = () => {
  // メッセージのstate管理
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'こんにちは！私はAIアシスタントです。',
      sender: 'ai',
      timestamp: new Date(),
    },
    {
      id: '2',
      content: 'はじめまして！よろしくお願いします。',
      sender: 'user',
      timestamp: new Date(),
    },
  ]);

  // スクロールコンテナへの参照
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 自動スクロール関数
  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      // column-reverseの場合、scrollTop = 0が最下部
      scrollContainerRef.current.scrollTop = 0;
    }
  };

  // メッセージが追加されたら自動スクロール
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // テストメッセージを追加する関数
  const addTestMessage = () => {
    const isUserMessage = messages.length % 2 === 0;
    const newMessage: Message = {
      id: Date.now().toString(),
      content: isUserMessage 
        ? `ユーザーからのテストメッセージ #${messages.length + 1}`
        : `AIからの返信メッセージ #${messages.length + 1}`,
      sender: isUserMessage ? 'user' : 'ai',
      timestamp: new Date(),
    };

    // 配列の末尾に新しいメッセージを追加
    setMessages(prevMessages => [...prevMessages, newMessage]);
  };

  return (
    <div style={styles.container}>
      {/* チャットヘッダー */}
      <div style={styles.header}>
        <h2 style={styles.headerTitle}>Perfect Chat UI</h2>
        <p style={styles.headerSubtitle}>flex-direction: column-reverse を使用</p>
      </div>

      {/* メッセージ表示エリア */}
      <div 
        ref={scrollContainerRef}
        style={styles.messagesContainer}
      >
        {/* メッセージリスト */}
        <div style={styles.messagesList}>
          {messages.map((message) => (
            <div
              key={message.id}
              style={{
                ...styles.messageWrapper,
                ...(message.sender === 'user' ? styles.userMessageWrapper : {}),
              }}
            >
              <div
                style={{
                  ...styles.messageBubble,
                  ...(message.sender === 'user' 
                    ? styles.userMessageBubble 
                    : styles.aiMessageBubble),
                }}
              >
                <p style={styles.messageContent}>{message.content}</p>
                <span style={styles.messageTime}>
                  {message.timestamp.toLocaleTimeString('ja-JP', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* コントロールエリア */}
      <div style={styles.controls}>
        <button 
          onClick={addTestMessage}
          style={styles.sendButton}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#0056b3';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#007bff';
          }}
        >
          テストメッセージを送信
        </button>
      </div>
    </div>
  );
};

// CSS-in-JSスタイル定義
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '600px',
    width: '100%',
    maxWidth: '800px',
    margin: '0 auto',
    backgroundColor: '#f5f5f5',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  header: {
    backgroundColor: '#007bff',
    color: 'white',
    padding: '16px 24px',
    borderBottom: '1px solid #0056b3',
  },
  headerTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 'bold',
  },
  headerSubtitle: {
    margin: '4px 0 0 0',
    fontSize: '14px',
    opacity: 0.9,
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column-reverse', // 重要: column-reverseを使用
  },
  messagesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  messageWrapper: {
    display: 'flex',
    justifyContent: 'flex-start',
    width: '100%',
  },
  userMessageWrapper: {
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '70%',
    padding: '12px 16px',
    borderRadius: '16px',
    position: 'relative' as const,
    wordBreak: 'break-word' as const,
  },
  userMessageBubble: {
    backgroundColor: '#007bff',
    color: 'white',
    borderBottomRightRadius: '4px',
  },
  aiMessageBubble: {
    backgroundColor: 'white',
    color: '#333',
    borderBottomLeftRadius: '4px',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
  },
  messageContent: {
    margin: 0,
    fontSize: '15px',
    lineHeight: 1.5,
  },
  messageTime: {
    display: 'block',
    fontSize: '12px',
    marginTop: '4px',
    opacity: 0.7,
  },
  controls: {
    padding: '16px',
    backgroundColor: 'white',
    borderTop: '1px solid #e0e0e0',
    display: 'flex',
    justifyContent: 'center',
  },
  sendButton: {
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
};

export default PerfectChatUI;