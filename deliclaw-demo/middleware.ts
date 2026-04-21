import { NextRequest, NextResponse } from "next/server"

/**
 * 最小访问控制（用于"内网穿透/公网分享"场景）：
 * - 设置 DEMO_ACCESS_TOKEN 后，所有页面与 API 都需要携带 token 才能访问
 * - 支持三种方式：
 *   1) URL query:  ?token=xxxxx
 *   2) Header:     x-demo-token: xxxxx
 *   3) Cookie:     deliclaw_token=xxxxx（首次 query 通过后由后端种下）
 *
 * Cookie 是必须的：浏览器 <img src="/api/uploads/xxx"> 不会带 query 或自定义 header，
 * 只有 cookie 能让这种子资源请求顺利通过鉴权。
 *
 * 说明：
 * - 若未设置 DEMO_ACCESS_TOKEN，则不做拦截（保持本地开发体验）
 */

const COOKIE_NAME = "deliclaw_token"
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 天

export function middleware(req: NextRequest) {
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
  // 首次通过 query 带上 token 时，种 cookie，让后续子资源（图片等）无需再带 token
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
  // 不拦截 Next 静态资源，避免页面资源 401 导致白屏
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
