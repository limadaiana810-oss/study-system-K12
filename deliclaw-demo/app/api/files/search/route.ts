import { NextRequest, NextResponse } from "next/server"
import { readFileIndex } from "@/lib/server/fileIndex"
import { mergeSearchResults, scoreSqliteSearchRows, searchLocalFileIndex } from "@/lib/server/fileSearch"
import type { SearchResult } from "@/lib/server/fileSearch"
import { listFiles } from "@/lib/server/sqlite"
import { normalizeVector, openrouterEmbedding } from "@/lib/server/openrouter"

export const runtime = "nodejs"

/**
 * 检索策略（A）：
 * 1. 先查本地 file-index.json，处理 canonicalName / 学科 / 题型 / 知识点 等快速命中
 * 2. 结果不足时，再查 SQLite 做词法 + 语义补召回
 * 3. 按 id 去重，保留本地索引结果的优先级
 */
export async function POST(req: NextRequest) {
  try {
    const { query, topK = 6 } = await req.json()
    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "缺少 query" }, { status: 400 })
    }

    const localDoc = readFileIndex()
    const localHits = searchLocalFileIndex(query, localDoc.files, topK)
    if (localHits.length >= topK) {
      return NextResponse.json({ ok: true, results: localHits })
    }

    const remaining = Math.max(topK - localHits.length, 0)
    if (remaining === 0) {
      return NextResponse.json({ ok: true, results: localHits })
    }

    const excludeIds = new Set(localHits.map((item) => item.id))
    let semanticHits: SearchResult[] = []

    try {
      const rows = listFiles()

      // 没有 embedding 也能工作：退化为 title / description / tags 的词法匹配
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

      semanticHits = scoreSqliteSearchRows({
        query,
        rows,
        queryVector: qVec,
        topK: remaining,
        excludeIds,
      })
    } catch {
      semanticHits = []
    }

    return NextResponse.json({
      ok: true,
      results: mergeSearchResults(localHits, semanticHits, topK),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "search failed"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
