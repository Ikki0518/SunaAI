"use client"
import { signIn, getSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function SignIn() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    // 既にログインしている場合はリダイレクト
    getSession().then((session) => {
      if (session) {
        router.push('/')
      }
    })
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    
    if (!email || !password) {
      setError("メールアドレスとパスワードを入力してください")
      return
    }

    if (isSignUp && password !== confirmPassword) {
      setError("パスワードが一致しません")
      return
    }

    if (password.length < 6) {
      setError("パスワードは6文字以上で入力してください")
      return
    }

    setLoading(true)
    
    try {
      const result = await signIn('credentials', {
        email,
        password,
        action: isSignUp ? 'signup' : 'signin',
        redirect: false,
      })

      if (result?.error) {
        setError(result.error)
      } else if (result?.ok) {
        router.push('/')
      }
    } catch (error) {
      setError("ログインエラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo & Title */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            {/* Sunaロゴ - ログイン画面用（大きめサイズ） */}
            <svg width="140" height="70" viewBox="0 0 140 70" className="flex-shrink-0">
              {/* 大きな円（右上、明るいターコイズブルー） */}
              <circle cx="105" cy="25" r="16" fill="#67E8F9" opacity="0.85"/>
              
              {/* 中くらいの円（左中央、濃いブルー） */}
              <circle cx="85" cy="35" r="10" fill="#2563EB" opacity="0.9"/>
              
              {/* 小さな円（右下、薄いターコイズ） */}
              <circle cx="98" cy="45" r="6" fill="#A7F3D0" opacity="0.75"/>
              
              {/* テキスト "suna" - 太字、濃いネイビー */}
              <text x="0" y="50" fontSize="32" fontWeight="700" fill="#1E293B" fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" letterSpacing="-1.5px">
                suna
              </text>
            </svg>
          </div>
          <p className="text-gray-500 text-lg">AIアシスタントとの新しい対話体験</p>
        </div>

        {/* Login Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-normal text-gray-800 mb-3">
              {isSignUp ? "新規登録" : "ログイン"}
            </h2>
            <p className="text-gray-500">
              {isSignUp
                ? "アカウントを作成して始めましょう"
                : "メールアドレスとパスワードでログイン"
              }
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                パスワード
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50"
                placeholder="6文字以上のパスワード"
                required
              />
            </div>

            {isSignUp && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  パスワード確認
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50"
                  placeholder="パスワードを再入力"
                  required
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-medium py-4 px-6 rounded-xl transition-all duration-200 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  処理中...
                </div>
              ) : (
                isSignUp ? "アカウント作成" : "ログイン"
              )}
            </button>
          </form>

          {/* Toggle Sign Up / Sign In */}
          <div className="mt-8 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError("")
                setEmail("")
                setPassword("")
                setConfirmPassword("")
              }}
              className="text-blue-500 hover:text-blue-600 font-medium transition-colors"
            >
              {isSignUp
                ? "既にアカウントをお持ちですか？ログイン"
                : "アカウントをお持ちでない方は新規登録"
              }
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-400">
            {isSignUp ? "登録" : "ログイン"}することで、利用規約とプライバシーポリシーに同意したことになります
          </p>
        </div>
      </div>
    </div>
  )
}