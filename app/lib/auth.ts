import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { getSupabaseUserByEmail, insertSupabaseLoginHistory } from "./supabase"
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

export const authOptions = {
  session: {
    strategy: "jwt" as const,
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signin',
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        phone: { label: "Phone", type: "tel" },
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        action: { label: "Action", type: "hidden" }
      },
      async authorize(credentials, req) {
        const { email, password } = credentials || {};
        if (!email || !password) return null;

        // Supabaseのusersテーブルのみ参照
        let user = await getSupabaseUserByEmail(email);

        if (!user) {
          // 失敗試行を記録
          const failedAttempt = recordFailedAttempt(email);
          if (failedAttempt.isBlocked) {
            await logSecurityEvent(
              'account_locked',
              email,
              `アカウントが一時的にブロックされています (${new Date(failedAttempt.blockUntil!).toLocaleString('ja-JP')})`,
              {
                ipAddress: req?.headers?.['x-forwarded-for']?.split(',')[0] || req?.headers?.['x-real-ip'] || 'unknown',
                severity: 'high'
              }
            );
            throw new Error("アカウントが一時的にブロックされています。しばらく時間をおいてから再試行してください。");
          }
          return null;
        }

        const isPasswordValid = await bcrypt.compare(password, user.password)
        if (!isPasswordValid) {
          // 失敗試行を記録
          const failedAttempt = recordFailedAttempt(email);
          await logSecurityEvent(
            'failed_login',
            email,
            `パスワードが間違っています (試行回数: ${failedAttempt.count})`,
            {
              ipAddress: req?.headers?.['x-forwarded-for']?.split(',')[0] || req?.headers?.['x-real-ip'] || 'unknown',
              severity: failedAttempt.count >= 3 ? 'high' : 'medium'
            }
          );
          if (failedAttempt.isBlocked) {
            await logSecurityEvent(
              'account_locked',
              email,
              `複数回の失敗によりアカウントをブロックしました (${new Date(failedAttempt.blockUntil!).toLocaleString('ja-JP')})`,
              {
                ipAddress: req?.headers?.['x-forwarded-for']?.split(',')[0] || req?.headers?.['x-real-ip'] || 'unknown',
                severity: 'high'
              }
            );
          }
          throw new Error("メールアドレスまたはパスワードが間違っています")
        }

        // ログイン履歴をSupabaseに記録
        try {
          await insertSupabaseLoginHistory({
            user_id: user.id,
            user_email: user.email,
            action: 'signin'
          });
        } catch (e) {
          console.error('🐘 [DEBUG] Supabase login history insert error:', e);
        }

        // ローカルログイン履歴にも記録
        try {
          const now = new Date();
          const loginRecord = {
            userId: user.id,
            email: user.email,
            name: user.name,
            action: 'signin' as const,
            timestamp: now.toISOString(),
            date: now.toISOString().split('T')[0], // 現在の日付を確実に設定
            userAgent: req?.headers?.['user-agent'] || '',
            ipAddress: req?.headers?.['x-forwarded-for']?.split(',')[0] || req?.headers?.['x-real-ip'] || 'unknown'
          };
          
          await loginHistoryService.addRecord(loginRecord);
          console.log('✅ [AUTH] ローカルログイン履歴記録完了:', {
            email: user.email,
            action: 'signin',
            date: loginRecord.date,
            timestamp: loginRecord.timestamp
          });
        } catch (e) {
          console.error('❌ [AUTH] ローカルログイン履歴記録エラー:', e);
        }

        // 成功時は失敗試行をリセット
        resetFailedAttempts(email);

        // セッション用のユーザー情報を返す
        return {
          id: user.id,
          name: user.name,
          email: user.email,
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }: { token: any, user: any, trigger?: any, session?: any }) {
      // 初回ログイン時にuser情報をtokenに保存
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
      }
      
      // update() が呼ばれた時の処理
      if (trigger === "update" && session?.name) {
        token.name = session.name;
        console.log('🔄 [JWT CALLBACK] Token updated via update():', { newName: session.name });
      } else if (token.email && trigger !== "update") {
        // 通常のセッション更新時のみ最新のユーザー情報を取得
        try {
          const latestUser = await getSupabaseUserByEmail(token.email);
          if (latestUser) {
            token.id = latestUser.id;
            token.name = latestUser.name; // 最新の名前を取得
            token.email = latestUser.email;
          }
        } catch (error) {
          console.error('🔄 [JWT CALLBACK] Failed to fetch latest user info:', error);
        }
      }
      return token;
    },
    async session({ session, token, user }: { session: any, token: any, user: any }) {
      // Supabaseのuser.idをセッションに必ずセット
      if (session.user && token) {
        session.user.id = token.id || token.sub;
        session.user.name = token.name;
        session.user.email = token.email;
      }
      return session;
    },
    // ...他のコールバック
  }
}