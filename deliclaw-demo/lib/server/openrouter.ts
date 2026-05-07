type ChatMessage = { role: "system" | "user" | "assistant"; content: any }

function mustKey(): string {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) throw new Error("未配置 OPENROUTER_API_KEY")
  return key
}

export async function openrouterChatJson<T>(params: {
  model: string
  system: string
  user: string
  timeoutMs?: number
  responseFormat?: "json_object"
}): Promise<T> {
  const key = mustKey()
  const { model, system, user, timeoutMs = 20000, responseFormat } = params

  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const messages: ChatMessage[] = [
      { role: "system", content: system },
      { role: "user", content: user },
    ]

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "DeliClaw Demo",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.1,
        ...(responseFormat ? { response_format: { type: responseFormat } } : {}),
      }),
      signal: ctrl.signal,
    })
    if (!res.ok) throw new Error(await res.text())

    const json: any = await res.json()
    const text = json?.choices?.[0]?.message?.content ?? ""
    if (!text) throw new Error("tagger 返回空内容")

    // 容错：去掉代码块包裹
    const cleaned = String(text).trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "")
    return JSON.parse(cleaned) as T
  } finally {
    clearTimeout(t)
  }
}

/**
 * 多模态 + 严格 JSON 输出（用于 /api/files/upload 的 vision 索引）。
 * 调用方提供 imageDataUrl（形如 "data:image/jpeg;base64,xxxx"），系统提示要求输出 JSON。
 */
export async function openrouterVisionJson<T>(params: {
  model: string
  system: string
  userText: string
  imageDataUrl: string
  timeoutMs?: number
}): Promise<T> {
  const key = mustKey()
  const { model, system, userText, imageDataUrl, timeoutMs = 30000 } = params

  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const messages: ChatMessage[] = [
      { role: "system", content: system },
      {
        role: "user",
        content: [
          { type: "text", text: userText },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ],
      },
    ]

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "DeliClaw Demo",
      },
      body: JSON.stringify({ model, messages, temperature: 0.1 }),
      signal: ctrl.signal,
    })
    if (!res.ok) throw new Error(await res.text())

    const json: any = await res.json()
    const text = json?.choices?.[0]?.message?.content ?? ""
    if (!text) throw new Error("vision 返回空内容")

    // 容错：去掉代码块包裹，以及偶发的前后说明
    let cleaned = String(text).trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "")
    // 如果模型啰嗦，截取第一段 {...}
    const firstBrace = cleaned.indexOf("{")
    const lastBrace = cleaned.lastIndexOf("}")
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1)
    }
    return JSON.parse(cleaned) as T
  } finally {
    clearTimeout(t)
  }
}

export async function openrouterEmbedding(params: { model: string; input: string; timeoutMs?: number }): Promise<number[]> {
  const key = mustKey()
  const { model, input, timeoutMs = 20000 } = params

  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "DeliClaw Demo",
      },
      body: JSON.stringify({ model, input }),
      signal: ctrl.signal,
    })
    if (!res.ok) throw new Error(await res.text())
    const json: any = await res.json()
    const vec = json?.data?.[0]?.embedding
    if (!Array.isArray(vec) || vec.length === 0) throw new Error("embedding 返回为空")
    return vec as number[]
  } finally {
    clearTimeout(t)
  }
}

export function normalizeVector(v: number[]): number[] {
  let sum = 0
  for (const x of v) sum += x * x
  const norm = Math.sqrt(sum) || 1
  return v.map((x) => x / norm)
}

export function cosineSim(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length)
  let s = 0
  for (let i = 0; i < n; i++) s += a[i] * b[i]
  return s
}
