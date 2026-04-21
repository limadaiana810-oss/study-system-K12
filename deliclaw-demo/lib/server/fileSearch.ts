import type { LocalFileIndexEntry } from "./fileIndex.ts"
import { guessMimeTypeFromName, uploadsUrlFromRelPath } from "./storage.ts"

export type SearchResult = {
  id: string
  fileName: string
  title: string | null
  mimeType: string
  url: string
  uploadedAt: string
  description: string
  tags: {
    subject?: string
    questionType?: string
    knowledgePoints?: string[]
    date?: string
  }
  tagsRaw: string[]
  score: number
  source: "local" | "semantic"
}

export type SqliteSearchRow = {
  id: string
  fileName: string
  title: string | null
  mimeType: string
  filePath: string
  uploadedAt: string
  description: string
  tags_json: string
  tags_raw_json: string | null
  embedding_json: string | null
}

function normalizeQueryText(text: string) {
  return (text || "")
    .trim()
    .toLowerCase()
    .replace(/[\s，,。.!！?？:：;；()（）【】\[\]{}<>《》"“”'‘’]/g, "")
}

function includesLoose(hay: string, needle: string) {
  return (hay || "").toLowerCase().includes((needle || "").toLowerCase())
}

function cosineDot(a: number[], b: number[]) {
  const n = Math.min(a.length, b.length)
  let sum = 0
  for (let i = 0; i < n; i++) sum += a[i] * b[i]
  return sum
}

function scoreField(query: string, value: string, strongWeight: number, weakWeight: number) {
  const q = normalizeQueryText(query)
  const v = normalizeQueryText(value)
  if (!q || !v) return 0
  if (q === v) return strongWeight
  if (q.includes(v) || v.includes(q)) return weakWeight
  return 0
}

function scoreLocalEntry(query: string, entry: LocalFileIndexEntry) {
  let score = 0
  score += scoreField(query, entry.subject, 2.2, 2.0)
  score += scoreField(query, entry.questionType, 1.2, 1.0)
  score += scoreField(query, entry.canonicalName, 1.8, 1.4)
  score += scoreField(query, entry.originalName, 1.4, 1.0)
  score += scoreField(query, entry.description, 0.9, 0.6)

  for (const item of entry.knowledgePoints) {
    score += scoreField(query, item, 2.1, 1.8)
  }

  return score
}

function buildLocalResult(entry: LocalFileIndexEntry, score: number): SearchResult {
  return {
    id: entry.id,
    fileName: entry.originalName,
    title: entry.canonicalName,
    mimeType: guessMimeTypeFromName(entry.storedPath),
    url: uploadsUrlFromRelPath(entry.storedPath),
    uploadedAt: entry.indexedAt,
    description: entry.description,
    tags: {
      subject: entry.subject,
      questionType: entry.questionType,
      knowledgePoints: entry.knowledgePoints,
      date: entry.indexedAt,
    },
    tagsRaw: [entry.canonicalName, entry.subject, entry.questionType, ...entry.knowledgePoints].filter(Boolean),
    score,
    source: "local",
  }
}

export function searchLocalFileIndex(query: string, entries: LocalFileIndexEntry[], topK = 6): SearchResult[] {
  return entries
    .map((entry) => ({ entry, score: scoreLocalEntry(query, entry) }))
    .filter((item) => item.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((item) => buildLocalResult(item.entry, item.score))
}

export function scoreSqliteSearchRows(params: {
  query: string
  rows: SqliteSearchRow[]
  queryVector: number[] | null
  topK?: number
  excludeIds?: Set<string>
}): SearchResult[] {
  const { query, rows, queryVector, topK = 6, excludeIds = new Set<string>() } = params

  return rows
    .filter((row) => !excludeIds.has(row.id))
    .map((row) => {
      const tags = JSON.parse(row.tags_json || "{}") as {
        subject?: string
        questionType?: string
        knowledgePoints?: string[]
        date?: string
      }
      const tagsRaw: string[] = row.tags_raw_json ? JSON.parse(row.tags_raw_json) : []
      const embedding: number[] | null = row.embedding_json ? JSON.parse(row.embedding_json) : null

      const lexical =
        (includesLoose(row.fileName, query) ? 1.2 : 0) +
        (row.title && includesLoose(row.title, query) ? 1.2 : 0) +
        (includesLoose(row.description, query) ? 0.9 : 0) +
        (tags.subject && includesLoose(tags.subject, query) ? 1.0 : 0) +
        (tags.questionType && includesLoose(tags.questionType, query) ? 1.0 : 0) +
        (Array.isArray(tags.knowledgePoints) &&
        tags.knowledgePoints.some((item) => includesLoose(query, item) || includesLoose(item, query))
          ? 1.0
          : 0) +
        (tagsRaw.some((item) => includesLoose(query, item) || includesLoose(item, query)) ? 0.6 : 0)

      const semantic = queryVector && embedding ? cosineDot(queryVector, embedding) : 0
      const score = semantic * 1.6 + lexical

      return {
        id: row.id,
        fileName: row.fileName,
        title: row.title,
        mimeType: row.mimeType,
        url: uploadsUrlFromRelPath(row.filePath),
        uploadedAt: row.uploadedAt,
        description: row.description,
        tags,
        tagsRaw,
        score,
        source: "semantic" as const,
      }
    })
    .filter((item) => item.score > 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}

export function mergeSearchResults(primary: SearchResult[], secondary: SearchResult[], topK = 6): SearchResult[] {
  const merged: SearchResult[] = []
  const seen = new Set<string>()

  for (const item of [...primary, ...secondary]) {
    if (seen.has(item.id)) continue
    seen.add(item.id)
    merged.push(item)
    if (merged.length >= topK) break
  }

  return merged
}
