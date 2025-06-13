import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { userServiceServer } from "./userServiceServer"
import { logSecurityEvent } from "@/app/api/admin/security-events/route"
import {
  recordFailedAttempt,
  resetFailedAttempts,
  isBlocked,
  checkPasswordStrength
} from "./security"
import { notifyNewUserRegistration } from "./emailNotification"
import { googleSheetsService } from "./googleSheets"
import { loginHistoryService } from "./loginHistoryService"

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
      phone: { label: "Phone", type: "tel" },
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
      action: { label: "Action", type: "hidden" } // "signin" or "signup"
    },
    async authorize(credentials, req) {
      console.log('🐛 [AUTH] Authorization attempt:', {
        hasEmail: !!credentials?.email,
        hasPassword: !!credentials?.password,
        email: credentials?.email,
        action: credentials?.action
      });

      if (!credentials?.email || !credentials?.password) {
        console.log('🐛 [AUTH] Missing credentials');
        return null
      }

      const { phone, email, password, action } = credentials

      // 管理者認証を最優先で処理（セキュリティチェックをバイパス）
      const isHardcodedAdmin = (email === 'ikki_y0518@icloud.com' && password === 'ikki0518') ||
                              (email === 'ikkiyamamoto0518@gmail.com' && password === 'ikki0518')
      
      console.log('🐛 [AUTH] Admin check:', {
        email,
        isHardcodedAdmin,
        emailMatch1: email === 'ikki_y0518@icloud.com',
        emailMatch2: email === 'ikkiyamamoto0518@gmail.com',
        passwordMatch: password === 'ikki0518'
      });
      
      if (isHardcodedAdmin) {
        console.log('🐛 [DEBUG] Admin login successful (priority):', email)
        
        const adminUser = {
          id: 'admin-' + Date.now(),
          name: 'いっき',
          email: email
        }
        
        try {
          await trackUser(adminUser.id, adminUser.name, adminUser.email, 'credentials', 'signin');
          loginHistoryService.recordLogin(adminUser.id, adminUser.email, adminUser.name, 'signin');
        } catch (error) {
          console.log('🐛 [INFO] Admin tracking failed (non-critical):', error)
        }
        
        return {
          id: adminUser.id,
          name: adminUser.name,
          email: adminUser.email,
        }
      }

      // IPアドレスベースのブロックチェック（管理者以外）
      const clientIP = req?.headers?.['x-forwarded-for']?.split(',')[0] ||
                      req?.headers?.['x-real-ip'] ||
                      'unknown';
      
      const blockStatus = isBlocked(email);
      if (blockStatus.blocked) {
        await logSecurityEvent(
          'account_locked',
          email,
          `アカウントが一時的にブロックされています (${new Date(blockStatus.blockUntil!).toLocaleString('ja-JP')})`,
          {
            ipAddress: clientIP,
            severity: 'high'
          }
        );
        throw new Error("アカウントが一時的にブロックされています。しばらく時間をおいてから再試行してください。");
      }

      // ログインのみ処理（新規登録は専用APIで処理）
      
      // 通常のユーザー認証
      const user = await userServiceServer.getUserByEmail(email)
      if (!user) {
        // 失敗試行を記録
        const failedAttempt = recordFailedAttempt(email);
        
        // セキュリティイベント: 存在しないユーザーでのログイン試行
        await logSecurityEvent(
          'failed_login',
          email,
          `存在しないメールアドレスでのログイン試行 (試行回数: ${failedAttempt.count})`,
          {
            ipAddress: clientIP,
            severity: failedAttempt.count >= 3 ? 'high' : 'medium'
          }
        );
        
        if (failedAttempt.isBlocked) {
          await logSecurityEvent(
            'account_locked',
            email,
            `複数回の失敗によりアカウントをブロックしました (${new Date(failedAttempt.blockUntil!).toLocaleString('ja-JP')})`,
            {
              ipAddress: clientIP,
              severity: 'high'
            }
          );
        }
        
        throw new Error("メールアドレスまたはパスワードが間違っています")
      }

      const isPasswordValid = await bcrypt.compare(password, user.password)
      if (!isPasswordValid) {
        // 失敗試行を記録
        const failedAttempt = recordFailedAttempt(email);
        
        // セキュリティイベント: パスワード間違い
        await logSecurityEvent(
          'failed_login',
          email,
          `パスワードが間違っています (試行回数: ${failedAttempt.count})`,
          {
            ipAddress: clientIP,
            severity: failedAttempt.count >= 3 ? 'high' : 'medium'
          }
        );
        
        if (failedAttempt.isBlocked) {
          await logSecurityEvent(
            'account_locked',
            email,
            `複数回の失敗によりアカウントをブロックしました (${new Date(failedAttempt.blockUntil!).toLocaleString('ja-JP')})`,
            {
              ipAddress: clientIP,
              severity: 'high'
            }
          );
        }
        
        throw new Error("メールアドレスまたはパスワードが間違っています")
      }

      // 成功時は失敗試行をリセット
      resetFailedAttempts(email);

      // ログインの記録
      await trackUser(user.id, user.name, user.email, 'credentials', 'signin');

      // ローカルログイン履歴に記録
      loginHistoryService.recordLogin(user.id, user.email, user.name, 'signin');

      // Google Sheetsにログインアクティビティを記録（非同期で実行、エラーでも処理を継続）
      googleSheetsService.logActivity({
        email: user.email,
        action: 'ログイン',
        details: `名前: ${user.name}`,
        timestamp: new Date().toISOString()
      }).catch(error => {
        console.error('📊 [SHEETS] ログインアクティビティ記録に失敗:', error);
      });

      console.log('🐛 [AUTH] Regular user login successful:', user.email);
      return {
        id: user.id,
        email: user.email,
        name: user.name,
      }
    },
  })
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
          
          // Google Sheetsにアクティビティを記録（非同期で実行、エラーでも処理を継続）
          googleSheetsService.logActivity({
            email: profile.email,
            action: 'Google OAuth ログイン',
            details: `名前: ${profile.name}`,
            timestamp: new Date().toISOString()
          }).catch(error => {
            console.error('📊 [SHEETS] Google OAuth アクティビティ記録に失敗:', error);
          });
          
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
        session.user.id = token.id as string;
        // ユーザー情報を最新に更新
        if (token.id) {
          try {
            const latestUser = await userServiceServer.getUserByEmail(session.user.email);
            if (latestUser) {
              session.user.name = latestUser.name;
            }
          } catch (error) {
            console.error('Failed to fetch latest user data:', error);
          }
        }
      }
      return session;
    },
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
      }
      return token;
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