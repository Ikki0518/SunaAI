import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { userServiceServer } from "./userServiceServer"

// ユーザー記録関数
async function trackUser(userId: string, name: string, email: string, provider: string, action: 'signup' | 'signin', image?: string) {
  try {
    await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/user-tracking`, {
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
  } catch (error) {
    console.error('User tracking failed:', error);
  }
}

export const authOptions = {
  providers: [
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
  ],
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
}

export const { handlers, signIn, signOut, auth } = NextAuth(authOptions) 