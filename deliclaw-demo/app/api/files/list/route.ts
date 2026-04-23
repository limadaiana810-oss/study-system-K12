import { NextResponse } from "next/server"
import { assignDemoSourceChannels } from "@/lib/fileSourceChannel"
import { normalizeFileClassification } from "@/lib/server/fileIndex"
import { listFiles } from "@/lib/server/sqlite"
import { uploadsUrlFromRelPath } from "@/lib/server/storage"

export const runtime = "nodejs"

export async function GET() {
  try {
    const rows = listFiles()
    const sourceChannels = assignDemoSourceChannels(rows)
    const files = rows.map((row, index) => {
      const tags = JSON.parse(row.tags_json || "{}") as {
        subject?: string
        questionType?: string
        knowledgePoints?: string[]
        date?: string
      }
      const classification = normalizeFileClassification({
        originalName: row.fileName,
        storedPath: row.filePath,
        subject: tags.subject,
        questionType: tags.questionType,
        knowledgePoints: tags.knowledgePoints,
        indexedAt: tags.date || row.uploadedAt,
      })
      return {
        id: row.id,
        fileName: row.fileName,
        title: row.title,
        mimeType: row.mimeType,
        url: uploadsUrlFromRelPath(row.filePath),
        uploadedAt: row.uploadedAt,
        description: row.description,
        sourceChannel: sourceChannels[index],
        subject: classification.subject,
        questionType: classification.questionType,
        knowledgePoints: classification.knowledgePoints,
      }
    })

    return NextResponse.json({ files })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "list failed"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
