import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { userServiceServer } from "./userServiceServer"

// 環境変数チェック関数
function getEnvVar(key: string, fallback?: string): string {
  const value = process.env[key];
  // 本番環境では詳細なログを控える
  if (process.env.NODE_ENV === 'development') {
    console.log(`🐛 [DEBUG] Environment variable ${key}:`, value ? `SET (${value.length} chars)` : 'NOT SET');
  }
  if (!value && !fallback) {
    console.warn(`🐛 [WARNING] Environment variable ${key} is not set`);
    return '';
  }
  return value || fallback || '';
}

// ユーザー記録関数
async function trackUser(userId: string, name: string, email: string, provider: string, action: 'signup' | 'signin', image?: string) {
  try {
    const baseUrl = getEnvVar('NEXTAUTH_URL', 'http://localhost:3000');
    if (process.env.NODE_ENV === 'development') {
      console.log('🐛 [DEBUG] Tracking user:', { userId, name, email, provider, action, baseUrl });
    }
    
    const response = await fetch(`${baseUrl}/api/user-tracking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        name,
        email,
        provider,
        action,
        timestamp: new Date().toISOString(),
        image
      })
    });
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🐛 [DEBUG] User tracking response:', response.status, response.statusText);
    }
    
    // エラーでも処理を続行（ユーザートラッキングは補助機能）
    if (!response.ok && process.env.NODE_ENV === 'development') {
      console.warn('🐛 [WARNING] User tracking failed but continuing authentication');
    }
  } catch (error) {
    // ユーザートラッキングの失敗は認証プロセスを停止させない
    if (process.env.NODE_ENV === 'development') {
      console.error('🐛 [INFO] User tracking failed (non-critical):', error);
    }
  }
}

// プロバイダー配列を動的に構築
const providers: any[] = [
  CredentialsProvider({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
      action: { label: "Action", type: "hidden" } // "signin" or "signup"
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        return null
      }

      const { email, password, action } = credentials

      if (action === "signup") {
        // 新規登録
        const existingUser = await userServiceServer.getUserByEmail(email)
        if (existingUser) {
          throw new Error("このメールアドレスは既に登録されています")
        }

        const hashedPassword = await bcrypt.hash(password, 12)
        const user = await userServiceServer.createUser({
          email,
          password: hashedPassword,
          name: email.split("@")[0], // メールの@より前を名前とする
        })

        // 新規登録の記録
        await trackUser(user.id, user.name, user.email, 'credentials', 'signup');

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      } else {
        // ログイン
        const user = await userServiceServer.getUserByEmail(email)
        if (!user) {
          throw new Error("メールアドレスまたはパスワードが間違っています")
        }

        const isPasswordValid = await bcrypt.compare(password, user.password)
        if (!isPasswordValid) {
          throw new Error("メールアドレスまたはパスワードが間違っています")
        }

        // ログインの記録
        await trackUser(user.id, user.name, user.email, 'credentials', 'signin');

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      }
    },
  }),
];

// Google OAuthプロバイダーを条件付きで追加
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

// 両方の環境変数が設定されている場合のみGoogleプロバイダーを追加
if (googleClientId && googleClientSecret && googleClientId !== '' && googleClientSecret !== '') {
  console.log('Google OAuth enabled');
  
  // 動的インポートでGoogleProviderを読み込み
  try {
    const GoogleProvider = require("next-auth/providers/google").default;
    providers.push(
      GoogleProvider({
        clientId: googleClientId,
        clientSecret: googleClientSecret,
        async profile(profile: any) {
          // Googleアカウントでのサインイン記録
          await trackUser(profile.sub, profile.name, profile.email, 'google', 'signin', profile.picture);
          
          return {
            id: profile.sub,
            name: profile.name,
            email: profile.email,
            image: profile.picture,
          }
        },
      })
    );
  } catch (error) {
    console.error('Failed to load Google OAuth provider:', error);
  }
} else {
  console.log('Google OAuth disabled - missing credentials');
}

export const authOptions = {
  providers,
  callbacks: {
    async session({ session, token }: any) {
      if (token) {
        session.user.id = token.id as string
      }
      return session
    },
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id
      }
      return token
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: "jwt" as const,
  },
  secret: getEnvVar('NEXTAUTH_SECRET', 'fallback-secret-key'),
}

// auth関数をNext.js 15対応で作成
export async function auth() {
  // この関数は簡易版として実装
  // 実際の認証はNextAuthハンドラーで処理
  return null
} 