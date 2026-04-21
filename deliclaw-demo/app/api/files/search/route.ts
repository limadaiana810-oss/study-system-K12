import { NextRequest, NextResponse } from "next/server"
import { cosineSim, normalizeVector, openrouterEmbedding } from "@/lib/server/openrouter"
import { listFiles } from "@/lib/server/sqlite"
import { uploadsUrlFromRelPath } from "@/lib/server/storage"

export const runtime = "nodejs"

function includesLoose(hay: string, needle: string) {
  return (hay || "").toLowerCase().includes((needle || "").toLowerCase())
}

/**
 * 语义 + 词法混合检索（不经过 LLM，追求秒级响应）：
 * 1. 对 query 做 embedding，和每条记录的 embedding 算 cosine
 * 2. 同时对 fileName / description / title / tags 做模糊词法匹配
 * 3. 分数 = semantic * 1.6 + lexical；阈值过滤后 topK 返回
 *
 * 返回 URL 而不是 base64，前端直接 <img src> 即可，响应体很小。
 */
export async function POST(req: NextRequest) {
  try {
    const { query, topK = 6 } = await req.json()
    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "缺少 query" }, { status: 400 })
    }

    const rows = listFiles()

    // 没有 embedding 也能工作：退化为 tags/description/fileName/title 的模糊匹配
    let qVec: number[] | null = null
    try {
      const vec = await openrouterEmbedding({
        model: process.env.OPENROUTER_EMBED_MODEL || "qwen/qwen3-embedding-0.6b",
        input: query,
      })
      qVec = normalizeVector(vec)
    } catch {
      qVec = null
    }

    const scored = rows
      .map((r) => {
        const tags = JSON.parse(r.tags_json || "{}") as {
          subject?: string
          questionType?: string
          knowledgePoints?: string[]
          date?: string
        }
        const tagsRaw: string[] = r.tags_raw_json ? JSON.parse(r.tags_raw_json) : []
        const embedding: number[] | null = r.embedding_json ? JSON.parse(r.embedding_json) : null

        const lexical =
          (includesLoose(r.fileName, query) ? 1.2 : 0) +
          (r.title && includesLoose(r.title, query) ? 1.2 : 0) +
          (includesLoose(r.description, query) ? 0.9 : 0) +
          (tags.subject && includesLoose(tags.subject, query) ? 1.0 : 0) +
          (tags.questionType && includesLoose(tags.questionType, query) ? 1.0 : 0) +
          (Array.isArray(tags.knowledgePoints) &&
          tags.knowledgePoints.some((k: string) => includesLoose(query, k) || includesLoose(k, query))
            ? 1.0
            : 0) +
          (tagsRaw.length && tagsRaw.some((t) => includesLoose(query, t) || includesLoose(t, query)) ? 0.6 : 0)

        const semantic = qVec && embedding ? cosineSim(qVec, embedding) : 0

        const score = semantic * 1.6 + lexical

        return {
          id: r.id,
          fileName: r.fileName,
          title: r.title,
          mimeType: r.mimeType,
          url: uploadsUrlFromRelPath(r.filePath),
          uploadedAt: r.uploadedAt,
          description: r.description,
          tags,
          tagsRaw,
          score,
        }
      })
      .filter((x) => x.score > 0.5)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)

    return NextResponse.json({ ok: true, results: scored })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "search failed"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
