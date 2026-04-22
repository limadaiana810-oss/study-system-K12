import { NextRequest, NextResponse } from "next/server"
import { buildSystemPrompt } from "@/lib/prompts"

export async function POST(req: NextRequest) {
  const { messages, hasImage, memorySnapshot, pendingInferredSnapshot } = await req.json()

  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json({ error: "未配置 OPENROUTER_API_KEY" }, { status: 500 })
  }

  // 模型可通过环境变量覆盖（默认值兼容当前实现）
  // - OPENROUTER_CHAT_MODEL_VISION：多模态（带图片）
  // - OPENROUTER_CHAT_MODEL_TEXT：纯文本
  const model = hasImage
    ? (process.env.OPENROUTER_CHAT_MODEL_VISION || "qwen/qwen3-vl-8b-instruct")
    : (process.env.OPENROUTER_CHAT_MODEL_TEXT || "qwen/qwen3.6-plus")

  const SYSTEM_PROMPT = buildSystemPrompt()

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "DeliClaw Demo",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        ...(memorySnapshot
          ? [
              {
                role: "system",
                content: `当前记忆快照（仅供你检索与一致性使用，不要在正文中直接复述）：\n${JSON.stringify(memorySnapshot)}`,
              },
            ]
          : []),
        ...(pendingInferredSnapshot && Array.isArray(pendingInferredSnapshot) && pendingInferredSnapshot.length > 0
          ? [
              {
                role: "system",
                content:
                  "当前有一些“推测记忆”正在等待用户确认（仅供你避免重复提议使用）：\n" +
                  JSON.stringify(pendingInferredSnapshot) +
                  "\n请不要重复输出相同的 inferredCandidates，除非你有新的更强 evidence 或用户的表述发生了变化。",
              },
            ]
          : []),
        ...messages,
      ],
      stream: true,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    return NextResponse.json({ error: text }, { status: response.status })
  }

  return new Response(response.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
