"use client"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function AdminAccessPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "loading") return

    if (!session) {
      router.push('/auth/signin')
      return
    }

    const userEmail = session.user?.email?.toLowerCase().trim()
    const adminEmails = ['ikki_y0518@icloud.com', 'ikkiyamamoto0518@gmail.com']
    
    console.log('🐛 [ADMIN ACCESS] User email:', userEmail)
    console.log('🐛 [ADMIN ACCESS] Admin emails:', adminEmails)
    console.log('🐛 [ADMIN ACCESS] Is admin:', adminEmails.includes(userEmail || ''))

    if (adminEmails.includes(userEmail || '')) {
      // 管理者の場合、管理者ダッシュボードにリダイレクト
      router.push('/admin')
    } else {
      setLoading(false)
    }
  }, [session, status, router])

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">管理者権限を確認中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-red-800 mb-4">アクセス拒否</h1>
          <p className="text-red-600 mb-6">
            このページにアクセスするには管理者権限が必要です。
          </p>
          <div className="bg-white border border-red-200 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-bold text-red-800 mb-2">デバッグ情報:</h3>
            <p className="text-sm text-gray-600">ユーザー: {session?.user?.email}</p>
            <p className="text-sm text-gray-600">権限: 一般ユーザー</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-500 text-white px-6 py-3 rounded-xl hover:bg-blue-600 transition-colors"
          >
            チャット画面に戻る
          </button>
        </div>
      </div>
    </div>
  )
}