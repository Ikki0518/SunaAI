'use client';

import dynamic from 'next/dynamic';

// SSRを無効にしてクライアントサイドのみでレンダリング
const ClientChatPage = dynamic(() => import('./components/ClientChatPage-column-reverse'), {
  ssr: false,
  loading: () => (
    <div className="h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-500">読み込み中...</p>
      </div>
    </div>
  )
});

export default function ChatPage() {
  return <ClientChatPage />;
}