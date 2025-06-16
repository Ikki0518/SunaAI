"use client"
import { signIn, getSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import SunaLogo from '@/app/components/SunaLogo'

export default function SignIn() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [registrationSuccess, setRegistrationSuccess] = useState(false)
  const [justRegistered, setJustRegistered] = useState(false)

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
    
    if (isSignUp) {
      // 新規登録の場合
      if (!phone || !email || !password) {
        setError("電話番号、メールアドレス、パスワードを入力してください")
        return
      }

      if (password !== confirmPassword) {
        setError("パスワードが一致しません")
        return
      }

      if (password.length < 6) {
        setError("パスワードは6文字以上で入力してください")
        return
      }

      setLoading(true)
      
      try {
        // 新規登録専用APIを使用
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone,
            email,
            password,
          }),
        })

        const data = await response.json()

        if (response.ok) {
          // 新規登録成功
          setRegistrationSuccess(true)
          setJustRegistered(true)
          setIsSignUp(false)
          setPhone("")
          setEmail("")
          setPassword("")
          setConfirmPassword("")
        } else {
          setError(data.error || "新規登録エラーが発生しました")
        }
      } catch (error) {
        setError("新規登録エラーが発生しました")
      } finally {
        setLoading(false)
      }
    } else {
      // ログインの場合
      if (!email || !password) {
        setError("メールアドレスとパスワードを入力してください")
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
          action: 'signin',
          redirect: false,
        })

        if (result?.error) {
          setError(result.error)
        } else if (result?.ok) {
          // 新規登録直後でも通常ログインでも、成功したらチャット画面に移動
          setJustRegistered(false)
          setRegistrationSuccess(false)
          setError("")
          router.push('/')
        }
      } catch (error) {
        setError("ログインエラーが発生しました")
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      
      {/* 管理者用直接アクセスボタン */}
      <div className="fixed bottom-5 right-5 z-[9999999]">
        <a
          href="/admin"
          className="block bg-red-600 text-white px-6 py-3 rounded-lg shadow-2xl hover:bg-red-700 transition-all text-lg font-bold border-2 border-white"
        >
          🚨 管理者ダッシュボード直接アクセス 🚨
        </a>
      </div>
      
      <div className="max-w-md w-full">
        {/* Logo & Title */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <SunaLogo size="md" />
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

          {/* Success Message */}
          {registrationSuccess && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-600 text-sm">
              新規登録が完了しました！メールアドレスとパスワードでログインしてください。
            </div>
          )}

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

            {isSignUp && (
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  電話番号
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50"
                  placeholder="090-1234-5678"
                  required
                />
              </div>
            )}

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

          {/* Divider */}
          <div className="my-8 flex items-center">
            <div className="flex-1 border-t border-gray-200"></div>
            <div className="px-4 text-sm text-gray-500">または</div>
            <div className="flex-1 border-t border-gray-200"></div>
          </div>

          {/* Google Login */}
          <button
            onClick={() => signIn('google', { callbackUrl: '/' })}
            disabled={loading}
            className="w-full bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-medium py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Googleでログイン
          </button>

          {/* Toggle Sign Up / Sign In */}
          <div className="mt-8 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError("")
                setRegistrationSuccess(false)
                setJustRegistered(false)
                setPhone("")
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