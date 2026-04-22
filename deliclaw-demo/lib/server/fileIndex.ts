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
const UNKNOWN = "unknown"

function dataRoot(rootDir: string) {
  const dir = path.join(rootDir, "data")
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

function fileIndexPath(rootDir: string) {
  return path.join(dataRoot(rootDir), FILE_INDEX_NAME)
}

function normalizeText(value: string | undefined, fallback = UNKNOWN) {
  const normalized = (value || "").trim().replace(/\s+/g, " ")
  return normalized || fallback
}

function normalizeDescription(value: string | undefined) {
  const normalized = (value || "").trim().replace(/\s+/g, " ")
  if (!normalized) return "（暂未解析）"
  return normalized.slice(0, 100)
}

function normalizeKnowledgePoints(values: string[] | undefined) {
  const seen = new Set<string>()
  const normalized: string[] = []

  for (const item of values || []) {
    const value = item.trim().replace(/\s+/g, " ")
    if (!value || seen.has(value)) continue
    seen.add(value)
    normalized.push(value)
  }

  return normalized
}

function formatIndexedAt(input: string | undefined) {
  const date = input ? new Date(input) : new Date()
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10)
  return date.toISOString().slice(0, 10)
}

function inferStatus(params: {
  subject: string
  knowledgePoints: string[]
  questionType: string
}) {
  const isPartial =
    params.subject === UNKNOWN ||
    params.questionType === UNKNOWN ||
    params.knowledgePoints.length === 0

  return isPartial ? "partial" : "ready"
}

export function buildCanonicalName(params: {
  subject: string
  knowledgePoints: string[]
  questionType: string
  indexedAt: string
}) {
  const firstKnowledgePoint = params.knowledgePoints[0] || UNKNOWN
  return [params.subject, firstKnowledgePoint, params.questionType, params.indexedAt].join("-")
}

export function normalizeStructuredFileIndex(input: StructuredFileIndexInput): LocalFileIndexEntry {
  const subject = normalizeText(input.subject)
  const knowledgePoints = normalizeKnowledgePoints(input.knowledgePoints)
  const questionType = normalizeText(input.questionType)
  const indexedAt = formatIndexedAt(input.indexedAt)
  const description = normalizeDescription(input.description)
  const canonicalName = buildCanonicalName({ subject, knowledgePoints, questionType, indexedAt })
  const status = inferStatus({ subject, knowledgePoints, questionType })

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
    status,
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
    return { version: 1, files: parsed.files }
  } catch {
    return { version: 1, files: [] }
  }
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
