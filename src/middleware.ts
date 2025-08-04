import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl
  
  // Allow access to auth pages and API routes
  if (
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/api/') ||
    pathname === '/'
  ) {
    return NextResponse.next()
  }

  // Protect other routes - redirect to sign in if not authenticated
  if (!req.auth) {
    return NextResponse.redirect(
      new URL(`/auth/signin?callbackUrl=${encodeURIComponent(pathname)}`, req.url)
    )
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
}
