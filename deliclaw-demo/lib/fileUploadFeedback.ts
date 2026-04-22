import type { MemoryEntry, TurnInsightFileStatus } from "../types/index.ts"

export type UploadIndexResponse = {
  canonicalName?: string
  description?: string
  subject?: string
  knowledgePoints?: string[]
  questionType?: string
  indexedAt?: string
  status?: "ready" | "partial"
  sqliteStored?: boolean
}

export type FileUnderstandingView = {
  originalName: string
  canonicalName?: string
  description: string
  tags: string[]
  status: TurnInsightFileStatus
}

function uniqueStrings(values: Array<string | undefined>) {
  return values
    .map((value) => (value || "").trim())
    .filter((value, index, array) => value.length > 0 && array.indexOf(value) === index)
}

export function buildProcessingFileUnderstanding(originalName: string): FileUnderstandingView {
  return {
    originalName,
    description: "正在识别文件内容，并写入本地文件索引。",
    tags: [],
    status: "indexing",
  }
}

export function buildFileMemoryDeltaFromUpload(fileName: string, upload: UploadIndexResponse): MemoryEntry {
  const tags = uniqueStrings([
    upload.subject,
    upload.questionType,
    ...(upload.knowledgePoints || []),
  ])

  return {
    fileTags: tags,
    fileDescription: upload.description,
    fileIndex: [
      {
        fileName,
        tags,
        uploadedAt: upload.indexedAt,
        description: upload.description,
      },
    ],
  }
}
