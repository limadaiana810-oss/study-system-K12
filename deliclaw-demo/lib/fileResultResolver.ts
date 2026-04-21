import type { FileResultTag } from "../types/index.ts"

export type SearchLikeResult = {
  fileName?: string
  title?: string | null
  uploadedAt?: string
}

export function buildFileResultQuery(ref: FileResultTag): string {
  const fileName = ref.fileName?.trim()
  if (fileName) return fileName

  const canonicalName = ref.canonicalName?.trim()
  if (canonicalName) return canonicalName

  const tags = (ref.tags || []).filter(Boolean)
  return tags.join(" ")
}

export function pickResolvedSearchResult<T extends SearchLikeResult>(ref: FileResultTag, results: T[]): T | undefined {
  const fileName = ref.fileName?.trim()
  if (fileName) {
    const exactFile = results.find((item) => item.fileName === fileName)
    if (exactFile) return exactFile
  }

  const canonicalName = ref.canonicalName?.trim()
  if (canonicalName) {
    const exactTitle = results.find((item) => item.title === canonicalName)
    if (exactTitle) return exactTitle
  }

  if (ref.uploadedAt) {
    const sameDate = results.find((item) => item.uploadedAt === ref.uploadedAt)
    if (sameDate) return sameDate
  }

  return results[0]
}
