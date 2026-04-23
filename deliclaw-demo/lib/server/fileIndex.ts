import fs from "node:fs"
import path from "node:path"

export type FileIndexStatus = "ready" | "partial"

export type LocalFileIndexEntry = {
  id: string
  originalName: string
  storedPath: string
  canonicalName: string
  subject: string
  knowledgePoints: string[]
  questionType: string
  indexedAt: string
  description: string
  status: FileIndexStatus
}

export type LocalFileIndexDocument = {
  version: 1
  files: LocalFileIndexEntry[]
}

type StructuredFileIndexInput = {
  id: string
  originalName: string
  storedPath: string
  subject?: string
  knowledgePoints?: string[]
  questionType?: string
  indexedAt?: string
  description?: string
}

const FILE_INDEX_NAME = "file-index.json"
const FALLBACK_SUBJECT = "其他资料"
const FALLBACK_QUESTION_TYPE = "资料文件"
const FALLBACK_KNOWLEDGE_POINT = "已归档"
const INVALID_CLASSIFICATION_VALUES = new Set([
  "",
  "unknown",
  "unknow",
  "undefined",
  "null",
  "none",
  "n/a",
  "未分类",
  "待分类",
  "无法分类",
  "待识别",
])

function dataRoot(rootDir: string) {
  const dir = path.join(rootDir, "data")
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

function fileIndexPath(rootDir: string) {
  return path.join(dataRoot(rootDir), FILE_INDEX_NAME)
}

function isDisplayableLabel(value: string | undefined) {
  const normalized = (value || "").trim().replace(/\s+/g, " ")
  if (!normalized) return false
  return !INVALID_CLASSIFICATION_VALUES.has(normalized.toLowerCase())
}

function normalizeText(value: string | undefined, fallback: string) {
  const normalized = (value || "").trim().replace(/\s+/g, " ")
  return isDisplayableLabel(normalized) ? normalized : fallback
}

function normalizeDescription(value: string | undefined) {
  const normalized = (value || "").trim().replace(/\s+/g, " ")
  if (!normalized) return "（暂未解析）"
  return normalized.slice(0, 100)
}

function inferTypeTag(fileName: string | undefined) {
  const ext = path.extname(fileName || "").toLowerCase()
  if ([".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".bmp"].includes(ext)) return "图片资料"
  if ([".pdf", ".doc", ".docx", ".txt", ".md", ".ppt", ".pptx", ".xls", ".xlsx", ".csv"].includes(ext)) return "文档资料"
  if ([".mp3", ".wav", ".m4a", ".aac", ".flac"].includes(ext)) return "音频资料"
  if ([".mp4", ".mov", ".avi", ".mkv", ".webm"].includes(ext)) return "视频资料"
  return ""
}

function inferNameTag(fileName: string | undefined) {
  const base = path.basename(fileName || "", path.extname(fileName || ""))
  const normalized = base
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  if (!isDisplayableLabel(normalized)) return ""
  if (/^(img|image|dsc|screenshot|screen shot|wx|mmexport)?\s*\d+$/i.test(normalized)) return ""
  return normalized.slice(0, 24)
}

function pushUnique(values: string[], value: string | undefined) {
  const normalized = (value || "").trim().replace(/\s+/g, " ")
  if (!isDisplayableLabel(normalized) || values.includes(normalized)) return
  values.push(normalized)
}

function buildKnowledgeFallbacks(input: {
  originalName?: string
  storedPath?: string
  indexedAt?: string
}) {
  const fallbackTags: string[] = []
  pushUnique(fallbackTags, inferNameTag(input.originalName))
  pushUnique(fallbackTags, inferTypeTag(input.originalName) || inferTypeTag(input.storedPath))
  pushUnique(fallbackTags, input.indexedAt ? formatIndexedAt(input.indexedAt) : "")
  pushUnique(fallbackTags, FALLBACK_KNOWLEDGE_POINT)
  return fallbackTags
}

function normalizeKnowledgePoints(
  values: string[] | undefined,
  input: { originalName?: string; storedPath?: string; indexedAt?: string }
) {
  const seen = new Set<string>()
  const normalized: string[] = []

  for (const item of values || []) {
    const value = item.trim().replace(/\s+/g, " ")
    if (!isDisplayableLabel(value) || seen.has(value)) continue
    seen.add(value)
    normalized.push(value)
  }

  return normalized.length > 0 ? normalized : buildKnowledgeFallbacks(input)
}

function formatIndexedAt(input: string | undefined) {
  const date = input ? new Date(input) : new Date()
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10)
  return date.toISOString().slice(0, 10)
}

export function buildCanonicalName(params: {
  subject: string
  knowledgePoints: string[]
  questionType: string
  indexedAt: string
}) {
  const firstKnowledgePoint = params.knowledgePoints[0] || FALLBACK_KNOWLEDGE_POINT
  return [params.subject, firstKnowledgePoint, params.questionType, params.indexedAt].join("-")
}

export function normalizeFileClassification(input: {
  originalName?: string
  storedPath?: string
  subject?: string
  knowledgePoints?: string[]
  questionType?: string
  indexedAt?: string
}) {
  return {
    subject: normalizeText(input.subject, FALLBACK_SUBJECT),
    knowledgePoints: normalizeKnowledgePoints(input.knowledgePoints, input),
    questionType: normalizeText(input.questionType, FALLBACK_QUESTION_TYPE),
  }
}

export function normalizeStructuredFileIndex(input: StructuredFileIndexInput): LocalFileIndexEntry {
  const indexedAt = formatIndexedAt(input.indexedAt)
  const classification = normalizeFileClassification({
    originalName: input.originalName,
    storedPath: input.storedPath,
    subject: input.subject,
    knowledgePoints: input.knowledgePoints,
    questionType: input.questionType,
    indexedAt,
  })
  const { subject, knowledgePoints, questionType } = classification
  const description = normalizeDescription(input.description)
  const canonicalName = buildCanonicalName({ subject, knowledgePoints, questionType, indexedAt })

  return {
    id: input.id,
    originalName: input.originalName.trim(),
    storedPath: input.storedPath.trim(),
    canonicalName,
    subject,
    knowledgePoints,
    questionType,
    indexedAt,
    description,
    status: "ready",
  }
}

export function readFileIndex(rootDir = process.cwd()): LocalFileIndexDocument {
  const indexPath = fileIndexPath(rootDir)
  if (!fs.existsSync(indexPath)) {
    return { version: 1, files: [] }
  }

  try {
    const raw = fs.readFileSync(indexPath, "utf8")
    const parsed = JSON.parse(raw) as Partial<LocalFileIndexDocument>
    if (parsed.version !== 1 || !Array.isArray(parsed.files)) {
      return { version: 1, files: [] }
    }
    return {
      version: 1,
      files: parsed.files
        .map((entry) => normalizePersistedFileIndexEntry(entry))
        .filter((entry): entry is LocalFileIndexEntry => entry !== null),
    }
  } catch {
    return { version: 1, files: [] }
  }
}

function normalizePersistedFileIndexEntry(entry: Partial<LocalFileIndexEntry>) {
  if (!entry.id || !entry.originalName || !entry.storedPath) return null
  return normalizeStructuredFileIndex({
    id: entry.id,
    originalName: entry.originalName,
    storedPath: entry.storedPath,
    subject: entry.subject,
    knowledgePoints: entry.knowledgePoints,
    questionType: entry.questionType,
    indexedAt: entry.indexedAt,
    description: entry.description,
  })
}

export function upsertFileIndexEntry(entry: LocalFileIndexEntry, rootDir = process.cwd()): LocalFileIndexDocument {
  const doc = readFileIndex(rootDir)
  const nextFiles = doc.files.filter((item) => item.id !== entry.id)
  nextFiles.unshift(entry)

  const nextDoc: LocalFileIndexDocument = {
    version: 1,
    files: nextFiles,
  }

  fs.writeFileSync(fileIndexPath(rootDir), JSON.stringify(nextDoc, null, 2) + "\n", "utf8")
  return nextDoc
}

export function removeFileIndexEntry(id: string, rootDir = process.cwd()): LocalFileIndexDocument {
  const doc = readFileIndex(rootDir)
  const nextFiles = doc.files.filter((item) => item.id !== id)

  const nextDoc: LocalFileIndexDocument = {
    version: 1,
    files: nextFiles,
  }

  fs.writeFileSync(fileIndexPath(rootDir), JSON.stringify(nextDoc, null, 2) + "\n", "utf8")
  return nextDoc
}
