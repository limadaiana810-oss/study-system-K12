import { NextRequest, NextResponse } from "next/server"

const COOKIE_NAME = "deliclaw_token"
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7

export function proxy(req: NextRequest) {
  const expected = process.env.DEMO_ACCESS_TOKEN
  if (!expected) return NextResponse.next()

  if (req.method === "OPTIONS") return NextResponse.next()

  const tokenFromQuery = req.nextUrl.searchParams.get("token")
  const tokenFromHeader = req.headers.get("x-demo-token")
  const tokenFromCookie = req.cookies.get(COOKIE_NAME)?.value

  const ok =
    tokenFromQuery === expected ||
    tokenFromHeader === expected ||
    tokenFromCookie === expected

  if (!ok) {
    return new NextResponse("Unauthorized", {
      status: 401,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "WWW-Authenticate": 'Bearer realm="DeliClaw Demo"',
      },
    })
  }

  const res = NextResponse.next()
  if (tokenFromQuery === expected && tokenFromCookie !== expected) {
    res.cookies.set(COOKIE_NAME, tokenFromQuery, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    })
  }
  return res
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
