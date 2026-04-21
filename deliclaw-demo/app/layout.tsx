import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "DeliClaw — 智能文件管理助手",
  description: "AI 自动分类文件，一句话找到任何文件",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // 某些浏览器扩展（如沉浸式翻译等）会在 React hydration 前注入属性，
    // 导致“server-rendered HTML 与 client properties 不一致”的警告。
    // 这里选择抑制 html/body 节点的 hydration mismatch 警告，避免开发/演示时被噪声淹没。
    <html lang="zh-CN" className="h-full" suppressHydrationWarning>
      <body className="h-full overflow-hidden" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
