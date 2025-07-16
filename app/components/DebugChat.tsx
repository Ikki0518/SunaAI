// DebugChat.tsx
import React, { useState, useEffect, useRef } from 'react';

// メッセージの型定義
type Message = {
  id: number;
  text: string;
  sender: 'ai' | 'user';
};

export default function DebugChat() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: 'これはAIからの最初のメッセージです。', sender: 'ai' },
  ]);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const handleSendMessage = () => {
    const newMessage: Message = {
      id: messages.length + 1,
      text: `これはユーザーからの${messages.length + 1}番目のメッセージです。`,
      sender: 'user',
    };
    setMessages(prevMessages => [...prevMessages, newMessage]);
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <>
      <style>{`
        .chat-window-debug {
          border: 2px solid red;
          border-radius: 8px;
          width: 450px;
          height: 600px;
          display: flex;
          flex-direction: column;
          margin: 20px;
        }
        .chat-container-debug {
          flex-grow: 1;
          padding: 10px;
          overflow-y: auto;
          display: flex;
          flex-direction: column-reverse;
        }
        .message-wrapper-debug {
          display: flex;
          flex-direction: column;
        }
        .message-bubble-debug {
          max-width: 75%;
          padding: 10px 14px;
          border-radius: 20px;
          margin-bottom: 10px;
          word-wrap: break-word;
        }
        .ai-bubble-debug {
          background-color: #f0f0f0;
          color: black;
          align-self: flex-start;
        }
        .user-bubble-debug {
          background-color: #007aff;
          color: white;
          align-self: flex-end;
        }
      `}</style>
      
      <div className="chat-window-debug">
        <div className="chat-container-debug" ref={chatContainerRef}>
          <div className="message-wrapper-debug">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`message-bubble-debug ${msg.sender === 'ai' ? 'ai-bubble-debug' : 'user-bubble-debug'}`}
              >
                {msg.text}
              </div>
            ))}
          </div>
        </div>
        <button onClick={handleSendMessage} style={{ padding: '10px' }}>
          テストメッセージ送信
        </button>
      </div>
    </>
  );
}