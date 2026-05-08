import type {
  MemoryEntry,
  FactualMemory,
  InferredMemory,
  FileIndexEntry,
  InferredCandidate,
  MemoryExtractionResult,
  EmotionSnapshot,
  PsychologicalState,
} from "@/types"

// Backtick strings avoid smart-quote encoding issues with Chinese content.
// \u5e73\u9759=平静  \u597d\u5947=好奇  \u9ad8\u5174=高兴
// \u6109\u60a6=愉悦  \u6ee1\u8db3=满足  \u7126\u8651=焦虑
// \u751f\u6c14=生气  \u75b2\u60eb=疲惫  \u6cae\u4e27=沮丧
const EMOTION_DATA: ReadonlyArray<{ name: string; valence: number; color: string }> = [
  { name: `\u5e73\u9759`, valence:  0.3, color: `#60A5FA` },
  { name: `\u597d\u5947`, valence:  0.6, color: `#8B5CF6` },
  { name: `\u9ad8\u5174`, valence:  0.8, color: `#34D399` },
  { name: `\u5f00\u5fc3`, valence:  0.9, color: `#10B981` }, // \u5f00\u5fc3
  { name: `\u6109\u60a6`, valence:  0.8, color: `#34D399` },
  { name: `\u6ee1\u8db3`, valence:  1.0, color: `#14B8A6` },
  { name: `\u7126\u8651`, valence: -0.7, color: `#F59E0B` },
  { name: `\u751f\u6c14`, valence: -0.8, color: `#F97316` },
  { name: `\u75b2\u60eb`, valence: -0.4, color: `#94A3B8` },
  { name: `\u6cae\u4e27`, valence: -1.0, color: `#EF4444` },
]

const VALID_EMOTIONS = new Set(EMOTION_DATA.map(e => e.name))
const VALENCE: Record<string, number> = Object.fromEntries(EMOTION_DATA.map(e => [e.name, e.valence]))
export const EMOTION_VALENCE: Record<string, number> = VALENCE
export const EMOTION_COLOR: Record<string, string> = Object.fromEntries(EMOTION_DATA.map(e => [e.name, e.color]))

function parseEmotionSnapshot(raw: any): EmotionSnapshot | undefined {
  if (!raw || typeof raw !== "object") return undefined
  const emotion = typeof raw.emotion === "string" ? raw.emotion.trim() : ""
  if (!VALID_EMOTIONS.has(emotion)) return undefined
  const weight = typeof raw.weight === "number" && raw.weight >= 0 && raw.weight <= 1 ? raw.weight : 0.3
  const evidenceTrimmed = typeof raw.evidence === "string" ? raw.evidence.trim() : ""
  const evidence = evidenceTrimmed || undefined
  return { emotion, weight, evidence, timestamp: new Date().toISOString() }
}

function computePsychState(snapshots: EmotionSnapshot[]): PsychologicalState {
  const CALM = `\u5e73\u9759`
  if (snapshots.length === 0) return { snapshots: [], dominant: CALM, compositeScore: 0.5 }

  const recent = snapshots.slice(-5)
  const dominant = recent.reduce((a, b) => a.weight >= b.weight ? a : b)

  let totalWeight = 0
  let weightedSum = 0
  for (const s of snapshots) {
    const v = VALENCE[s.emotion] ?? 0
    weightedSum += v * s.weight
    totalWeight += s.weight
  }
  const raw = totalWeight > 0 ? weightedSum / totalWeight : 0
  const compositeScore = Math.max(0, Math.min(1, (raw + 1) / 2))

  return { snapshots, dominant: dominant.emotion, compositeScore }
}

export function extractMemory(text: string): MemoryExtractionResult | null {
  const match = text.match(/<memory>([\s\S]*?)<\/memory>/)
  if (!match) return null
  try {
    const parsed: any = JSON.parse(sanitizeLikelyJson(match[1].trim()))
    if (!parsed || Object.keys(parsed).length === 0) return null

    const delta: MemoryEntry = {
      factual: parsed.factual,
      fileTags: parsed.fileTags,
      actions: parsed.actions,
      fileDescription: parsed.fileDescription,
      fileIndex: parsed.fileIndex,
    }

    const inferredCandidates = normalizeCandidates(parsed.inferredCandidates)
    const emotionSnapshot = parseEmotionSnapshot(parsed.emotionSnapshot)

    const hasDelta = hasMemoryData(delta)
    const hasCandidates = inferredCandidates.length > 0
    if (!hasDelta && !hasCandidates && !emotionSnapshot) return null

    return { delta, inferredCandidates, emotionSnapshot }
  } catch {
    return null
  }
}

/**
 * 尽量容错 LLM 输出的“近似 JSON”：
 * - 将智能引号替换为标准引号，避免 JSON.parse 失败导致 fileIndex/记忆完全丢失
 * - 不尝试做激进的 JSON 修复（避免误解析），仅做最常见的字符级替换
 */
function sanitizeLikelyJson(raw: string): string {
  return raw
    // smart quotes → ASCII quotes
    .replace(/[“”]/g, `"`)
    .replace(/[‘’]/g, `'`)
    // full-width punctuation occasionally appears in model output
    .replace(/，/g, ",")
    .replace(/：/g, ":")
}

export function stripMemoryTags(text: string): string {
  return text.replace(/<memory>[\s\S]*?<\/memory>/g, "").trim()
}

export function mergeMemory(prev: MemoryEntry, next: MemoryEntry, emotionSnapshot?: EmotionSnapshot): MemoryEntry {
  const base: MemoryEntry = {
    factual: mergeFactual(prev.factual, next.factual),
    inferred: mergeInferred(prev.inferred, next.inferred),
    fileTags: mergeArray(prev.fileTags, next.fileTags),
    actions: mergeArray(prev.actions, next.actions),
    fileDescription: next.fileDescription || prev.fileDescription,
    fileIndex: mergeFileIndex(prev.fileIndex, next.fileIndex),
  }

  if (!emotionSnapshot) {
    return { ...base, psychState: prev.psychState }
  }

  const prevSnapshots = prev.psychState?.snapshots ?? []
  const newSnapshots = [...prevSnapshots, emotionSnapshot].slice(-10)
  return { ...base, psychState: computePsychState(newSnapshots) }
}

function mergeFactual(a?: FactualMemory, b?: FactualMemory): FactualMemory | undefined {
  if (!a && !b) return undefined
  return { ...a, ...b }
}

function mergeInferred(a?: InferredMemory, b?: InferredMemory): InferredMemory | undefined {
  if (!a && !b) return undefined
  return {
    ...a,
    ...b,
    preferences: mergeArray(a?.preferences, b?.preferences),
  }
}

function mergeArray(a?: string[], b?: string[]): string[] | undefined {
  if (!a && !b) return undefined
  const merged = [...(a || []), ...(b || [])]
  return [...new Set(merged)]
}

function mergeFileIndex(a?: FileIndexEntry[], b?: FileIndexEntry[]): FileIndexEntry[] | undefined {
  if (!a && !b) return undefined

  const byName = new Map<string, FileIndexEntry>()
  for (const item of a || []) {
    if (!item?.fileName) continue
    byName.set(item.fileName, { ...item, tags: [...new Set(item.tags || [])] })
  }
  for (const item of b || []) {
    if (!item?.fileName) continue
    const prev = byName.get(item.fileName)
    byName.set(item.fileName, {
      ...(prev || {}),
      ...item,
      tags: [...new Set([...(prev?.tags || []), ...(item.tags || [])])],
    })
  }
  return [...byName.values()]
}

export function hasMemoryData(m: MemoryEntry): boolean {
  return !!(
    m.factual && Object.values(m.factual).some(Boolean) ||
    m.inferred && Object.values(m.inferred).some(v => v && (Array.isArray(v) ? v.length > 0 : true)) ||
    m.fileTags?.length ||
    m.actions?.length ||
    m.fileIndex?.length
  )
}

function candidateSignature(c: Pick<InferredCandidate, "field" | "op" | "value">): string {
  const value = Array.isArray(c.value) ? c.value.join("|") : c.value
  return `${c.field}__${c.op}__${value}`
}

export function normalizeCandidates(raw: any): InferredCandidate[] {
  if (!Array.isArray(raw)) return []

  const out: InferredCandidate[] = []
  for (const item of raw) {
    const field = typeof item?.field === "string" ? item.field.trim() : ""
    const op = item?.op === "add" ? "add" : "set"
    const evidence = typeof item?.evidence === "string" ? item.evidence.trim() : ""

    if (!field) continue
    if (!evidence) continue

    const valueRaw = item?.value
    const value =
      typeof valueRaw === "string"
        ? valueRaw.trim()
        : Array.isArray(valueRaw)
          ? valueRaw.filter((v) => typeof v === "string" && v.trim()).map((v) => v.trim())
          : ""

    if (typeof value === "string" && !value) continue
    if (Array.isArray(value) && value.length === 0) continue

    let confidence: number | undefined = undefined
    if (typeof item?.confidence === "number" && Number.isFinite(item.confidence)) {
      if (item.confidence >= 0 && item.confidence <= 1) confidence = item.confidence
    }

    out.push({
      id: typeof item?.id === "string" && item.id ? item.id : crypto.randomUUID(),
      field,
      op,
      value,
      evidence,
      confidence,
      createdAt: typeof item?.createdAt === "string" && item.createdAt ? item.createdAt : new Date().toISOString(),
      source: "llm",
    })
  }
  const seen = new Set<string>()
  return out.filter((c) => {
    const sig = candidateSignature(c)
    if (seen.has(sig)) return false
    seen.add(sig)
    return true
  })
}

export function dedupeCandidates(existing: InferredCandidate[], incoming: InferredCandidate[]): InferredCandidate[] {
  const seen = new Set(existing.map(candidateSignature))
  const out = [...existing]
  for (const c of incoming) {
    const sig = candidateSignature(c)
    if (seen.has(sig)) continue
    seen.add(sig)
    out.push(c)
  }
  return out
}

export function applyInferredCandidate(memory: MemoryEntry, c: InferredCandidate): MemoryEntry {
  const inferred: InferredMemory = { ...(memory.inferred || {}) }
  const effectiveValue = c.editedValue ?? c.value

  if (c.field === "preferences") {
    const items = Array.isArray(effectiveValue) ? effectiveValue : [effectiveValue]
    const merged = [...new Set([...(inferred.preferences || []), ...items])]
    inferred.preferences = merged
    return { ...memory, inferred }
  }

  if (typeof effectiveValue === "string") {
    ;(inferred as any)[c.field] = effectiveValue
    return { ...memory, inferred }
  }

  const prev = (inferred as any)[c.field]
  const prevArr = Array.isArray(prev) ? prev : []
  const merged = [...new Set([...prevArr, ...effectiveValue])]
  ;(inferred as any)[c.field] = merged
  return { ...memory, inferred }
}
