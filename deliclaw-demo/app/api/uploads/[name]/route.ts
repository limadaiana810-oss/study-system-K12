import { NextRequest, NextResponse } from "next/server"
import { readUploadFile } from "@/lib/server/storage"

export const runtime = "nodejs"

/**
 * 受 proxy 保护的文件读取端点。
 * 浏览器 <img src="/api/uploads/<name>.jpg"> 直接访问。
 * DEMO_ACCESS_TOKEN 下通过 cookie 放行（proxy.ts 里已加 cookie 支持）。
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params
  if (!name) return new NextResponse("bad request", { status: 400 })

  const loaded = readUploadFile(name)
  if (!loaded) return new NextResponse("not found", { status: 404 })

  return new NextResponse(new Uint8Array(loaded.buf), {
    headers: {
      "Content-Type": loaded.mimeType,
      "Cache-Control": "public, max-age=3600",
    },
  })
}
