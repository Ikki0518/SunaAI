"use client"
import { useSession } from "next-auth/react"

export default function TestAdminPage() {
  const { data: session } = useSession()

  return (
    <div className="min-h-screen bg-red-500 text-white p-8">
      <h1 className="text-4xl font-bold mb-8">🚨 管理者テストページ</h1>
      
      <div className="bg-white text-black p-6 rounded-lg mb-8">
        <h2 className="text-2xl font-bold mb-4">セッション情報</h2>
        <p><strong>ユーザー:</strong> {session?.user?.email || 'ログインしていません'}</p>
        <p><strong>名前:</strong> {session?.user?.name || 'なし'}</p>
        <p><strong>セッション状態:</strong> {session ? 'ログイン済み' : 'ログインしていません'}</p>
      </div>

      <div className="space-y-4">
        <a 
          href="/admin" 
          className="block w-full py-4 px-6 bg-blue-600 text-white text-center font-bold rounded-lg hover:bg-blue-700"
        >
          🔧 管理者ダッシュボードへ
        </a>
        
        <a 
          href="/" 
          className="block w-full py-4 px-6 bg-gray-600 text-white text-center font-bold rounded-lg hover:bg-gray-700"
        >
          ← チャット画面に戻る
        </a>
      </div>

      <div className="mt-8 bg-yellow-400 text-black p-4 rounded-lg">
        <h3 className="font-bold mb-2">直接アクセス用URL:</h3>
        <p className="break-all">https://suna-ai-nine.vercel.app/admin</p>
      </div>
    </div>
  )
}