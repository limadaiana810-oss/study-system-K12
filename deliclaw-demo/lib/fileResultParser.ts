import type { FileResultTag } from "@/types"

function normalizeFileResultTag(raw: unknown): FileResultTag | null {
  if (!raw || typeof raw !== "object") return null

  const record = raw as Record<string, unknown>
  const fileName = typeof record.fileName === "string" ? record.fileName.trim() : ""
  const canonicalName = typeof record.canonicalName === "string" ? record.canonicalName.trim() : ""
  if (!fileName && !canonicalName) return null

  const uploadedAt = typeof record.uploadedAt === "string" ? record.uploadedAt.trim() : ""
  const tags = Array.isArray(record.tags)
    ? record.tags.filter((item): item is string => typeof item === "string" && !!item.trim()).map((item) => item.trim())
    : []

  const normalized: FileResultTag = {}
  if (fileName) normalized.fileName = fileName
  if (canonicalName) normalized.canonicalName = canonicalName
  if (uploadedAt) normalized.uploadedAt = uploadedAt
  if (tags.length > 0) normalized.tags = tags
  return normalized
}

export function extractFileResults(text: string): FileResultTag[] {
  const regex = /<file-result>([\s\S]*?)<\/file-result>/g
  const results: FileResultTag[] = []
  let match

  while ((match = regex.exec(text)) !== null) {
    try {
      const normalized = normalizeFileResultTag(JSON.parse(match[1].trim()))
      if (normalized) results.push(normalized)
    } catch {
      // ignore malformed tags
    }
  }
  return results
}

export function stripFileResultTags(text: string): string {
  return text.replace(/<file-result>[\s\S]*?<\/file-result>/g, "").trim()
}
