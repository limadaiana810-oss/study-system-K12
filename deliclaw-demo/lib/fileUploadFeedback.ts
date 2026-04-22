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

const CLASSIFICATION_ONLY_PATTERN = /分类|整理|归类|归档|收纳|入库|保存|记录/
const PROBLEM_SOLVING_PATTERN = /怎么做|如何做|讲解|解析|答案|步骤|计算|求解|解题|做一下|错在哪|为什么|订正|改正/

export function isFileClassificationOnlyRequest(text: string): boolean {
  const normalized = (text || "").trim()
  if (!normalized) return true
  if (PROBLEM_SOLVING_PATTERN.test(normalized)) return false
  return CLASSIFICATION_ONLY_PATTERN.test(normalized)
}

function usableUploadText(value: string | undefined) {
  const normalized = (value || "").trim()
  if (!normalized || normalized === "unknown" || normalized === "（暂未解析）") return ""
  return normalized
}

export function buildUploadClassificationReply(fileName: string, upload: UploadIndexResponse): string {
  const subject = usableUploadText(upload.subject)
  const questionType = usableUploadText(upload.questionType)
  const knowledge = uniqueStrings(upload.knowledgePoints || []).filter((item) => usableUploadText(item))
  const classification = [
    subject,
    questionType,
    knowledge.length > 0 ? knowledge.join("、") : undefined,
  ].filter(Boolean).join(" / ")

  const description = usableUploadText(upload.description)
  const fileLabel = fileName.trim() ? `「${fileName.trim()}」` : "这个文件"
  const statusPrefix = upload.status === "partial" ? "已先按现有信息分类" : "已分类"
  const classificationText = classification || "暂未识别出稳定分类"
  const descriptionText = description ? `内容理解：${description}` : "内容理解：这次没有识别出足够稳定的文字或图像信息。"

  return `${fileLabel}${statusPrefix}为：${classificationText}。\n${descriptionText}`
}
