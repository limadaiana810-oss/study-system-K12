import { NextResponse } from "next/server"
import { listFiles } from "@/lib/server/sqlite"
import { uploadsUrlFromRelPath } from "@/lib/server/storage"

export const runtime = "nodejs"

export async function GET() {
  try {
    const rows = listFiles()
    const files = rows.map((row) => {
      const tags = JSON.parse(row.tags_json || "{}") as {
        subject?: string
        questionType?: string
        knowledgePoints?: string[]
        date?: string
      }
      return {
        id: row.id,
        fileName: row.fileName,
        title: row.title,
        mimeType: row.mimeType,
        url: uploadsUrlFromRelPath(row.filePath),
        uploadedAt: row.uploadedAt,
        description: row.description,
        subject: tags.subject || "未分类",
        questionType: tags.questionType || "未分类",
        knowledgePoints: tags.knowledgePoints || [],
      }
    })

    return NextResponse.json({ files })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "list failed"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
