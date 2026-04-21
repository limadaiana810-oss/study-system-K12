import type { FileResultTag } from "@/types"

export function extractFileResults(text: string): FileResultTag[] {
  const regex = /<file-result>([\s\S]*?)<\/file-result>/g
  const results: FileResultTag[] = []
  let match

  while ((match = regex.exec(text)) !== null) {
    try {
      results.push(JSON.parse(match[1].trim()))
    } catch {
      // ignore malformed tags
    }
  }
  return results
}

export function stripFileResultTags(text: string): string {
  return text.replace(/<file-result>[\s\S]*?<\/file-result>/g, "").trim()
}
