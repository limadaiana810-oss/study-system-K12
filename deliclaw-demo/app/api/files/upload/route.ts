import { NextRequest, NextResponse } from "next/server"
import { openrouterVisionJson, openrouterEmbedding, normalizeVector } from "@/lib/server/openrouter"
import { normalizeStructuredFileIndex, upsertFileIndexEntry } from "@/lib/server/fileIndex"
import { saveBase64ToDisk, uploadsUrlFromRelPath } from "@/lib/server/storage"
import { tryUpsertFile } from "@/lib/server/sqlite"
import { VISION_INDEX_PROMPT } from "@/lib/prompts"

export const runtime = "nodejs"

type VisionResult = {
  subject?: string
  knowledgePoints?: string[]
  questionType?: string
  description?: string
  confidence?: number
}

/**
 * 文件上传 & 索引一次到位：
 * 1. base64 落盘到 data/uploads/<id>.<ext>
 * 2. 多模态模型读图 → 输出 JSON（subject / knowledgePoints / questionType / description）
 * 3. 描述 + 标签拼成 embed 文本 → embedding
 * 4. 写入本地 file-index.json（快速精确查）
 * 5. SQLite 写入一行（只存 file_path，不存 base64）
 * 6. 返回结构化索引结果 + 文件 URL
 *
 * 说明：
 * - vision 调用可能失败或超时；失败时仍保留文件和最小索引，走词法兜底
 * - embedding 失败同理降级
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, fileName, mimeType, base64, uploadedAt } = body || {}

    if (!id || !fileName || !mimeType || !base64 || !uploadedAt) {
      return NextResponse.json(
        { error: "参数缺失：需要 id/fileName/mimeType/base64/uploadedAt" },
        { status: 400 }
      )
    }

    // 1) 落盘
    const { relPath, sizeBytes } = saveBase64ToDisk({ id, base64, mimeType, fileName })

    // 2) 多模态理解（vision → 结构化 JSON）
    const imageDataUrl = `data:${mimeType};base64,${base64}`
    let vision: VisionResult = {}
    try {
      vision = await openrouterVisionJson<VisionResult>({
        model: process.env.OPENROUTER_CHAT_MODEL_VISION || "qwen/qwen3-vl-8b-instruct",
        system: VISION_INDEX_PROMPT,
        userText: `原始文件名：${fileName}\n上传时间：${uploadedAt}\n请按 schema 输出 JSON。`,
        imageDataUrl,
      })
    } catch (e) {
      // vision 失败：仍保留最小索引，不让前端整体流程挂掉
      vision = { description: "（暂未解析）" }
    }

    const indexed = normalizeStructuredFileIndex({
      id,
      originalName: fileName,
      storedPath: relPath,
      subject: vision.subject,
      knowledgePoints: vision.knowledgePoints,
      questionType: vision.questionType,
      indexedAt: uploadedAt,
      description: vision.description,
    })

    upsertFileIndexEntry(indexed)

    // 3) embedding（失败降级为 null，检索走词法）
    const embedText =
      `文件名：${indexed.canonicalName}\n` +
      `学科：${indexed.subject}\n` +
      `题型：${indexed.questionType}\n` +
      `知识点：${indexed.knowledgePoints.join("，")}\n` +
      `描述：${indexed.description}\n`

    let embedding: number[] | undefined
    try {
      const vec = await openrouterEmbedding({
        model: process.env.OPENROUTER_EMBED_MODEL || "qwen/qwen3-embedding-0.6b",
        input: embedText,
      })
      embedding = normalizeVector(vec)
    } catch {
      // ignore
    }

    // 5) 入库
    const sqliteResult = tryUpsertFile({
      id,
      fileName,
      title: indexed.canonicalName,
      mimeType,
      filePath: relPath,
      uploadedAt: indexed.indexedAt,
      description: indexed.description,
      tags: {
        subject: indexed.subject,
        questionType: indexed.questionType,
        knowledgePoints: indexed.knowledgePoints,
        date: indexed.indexedAt,
      },
      tagsRaw: [indexed.canonicalName, indexed.subject, indexed.questionType, ...indexed.knowledgePoints],
      embedding,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    return NextResponse.json({
      ok: true,
      id,
      url: uploadsUrlFromRelPath(relPath),
      canonicalName: indexed.canonicalName,
      description: indexed.description,
      subject: indexed.subject,
      knowledgePoints: indexed.knowledgePoints,
      questionType: indexed.questionType,
      indexedAt: indexed.indexedAt,
      status: indexed.status,
      sizeBytes,
      sqliteStored: sqliteResult.ok,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "upload failed"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
