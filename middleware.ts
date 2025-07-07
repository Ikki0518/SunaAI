import { withAuth } from "next-auth/middleware"

export default withAuth(
  // middleware関数 - 認証が必要なページでのみ実行される
  function middleware(req) {
    // 認証されている場合はそのまま続行
    return;
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        // 認証不要のパス
        const publicPaths = [
          '/auth/signin',
          '/auth/signup',
          '/api/auth',
          '/api/register',
          '/favicon.ico',
          '/_next',
          '/logo-suna.png'
        ];
        
        // 公開パスの場合は認証不要
        if (publicPaths.some(path => pathname.startsWith(path))) {
          return true;
        }
        
        // その他のパスは認証が必要
        // falseを返すと自動的に /auth/signin にリダイレクト
        return !!token;
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth.js routes)
     * - auth/signin (signin page)
     * - auth/signup (signup page)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - logo-suna.png (logo file)
     */
    '/((?!api/auth|auth/signin|auth/signup|_next/static|_next/image|favicon.ico|logo-suna.png).*)',
  ],
}