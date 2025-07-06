import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    // 認証が必要なルートにアクセスしているが、認証されていない場合
    if (!req.nextauth.token) {
      console.log('🚫 [MIDDLEWARE] Unauthenticated access detected, redirecting to signin');
      return NextResponse.redirect(new URL('/auth/signin', req.url))
    }
    
    // 認証されている場合はそのまま続行
    return NextResponse.next()
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
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - logo-suna.png (logo file)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|logo-suna.png).*)',
  ],
}