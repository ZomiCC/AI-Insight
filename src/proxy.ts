import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function proxy(request: NextRequest) {
  const session = await auth()
  const isLoggedIn = !!session?.user
  const isDashboardRoute = request.nextUrl.pathname.startsWith("/dashboard")
  const isApiProtected =
    request.nextUrl.pathname.startsWith("/api/favorites")

  if ((isDashboardRoute || isApiProtected) && !isLoggedIn) {
    const signInUrl = new URL("/login", request.url)
    signInUrl.searchParams.set("callbackUrl", request.url)
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/favorites/:path*"],
}
