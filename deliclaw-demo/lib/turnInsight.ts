import type { MemoryExtractionResult, TurnInsight, TurnInsightFileStatus } from "@/types"

type BuildTurnInsightInput = {
  turnId: string
  userText: string
  extracted: MemoryExtractionResult
  updatedAt?: string
}

type UploadUnderstandingInput = {
  originalName: string
  canonicalName?: string
  description?: string
  subject?: string
  knowledgePoints?: string[]
  questionType?: string
  status?: TurnInsightFileStatus
}

const FACT_LABELS: Record<string, string> = {
  name: "姓名",
  age: "年龄",
  grade: "年级",
  school: "学校",
  position: "职位",
  recentGoal: "近期目标",
}

const INFERRED_LABELS: Record<string, string> = {
  sleepPattern: "作息习惯",
  mood: "情绪状态",
  preferences: "爱好",
}

function uniqueStrings(values: Array<string | undefined>) {
  return values
    .map((value) => (value || "").trim())
    .filter((value, index, array) => value.length > 0 && array.indexOf(value) === index)
}

function stringifyValue(value: string | string[]) {
  return Array.isArray(value) ? value.join("，") : value
}

export function buildTurnInsightFromMemory(input: BuildTurnInsightInput, existing?: TurnInsight): TurnInsight {
  const factual = input.extracted.delta.factual || {}

  return {
    turnId: input.turnId,
    userText: input.userText,
    capturedItems: existing?.capturedItems,
    factualAdded: Object.entries(factual)
      .filter(([, value]) => !!value)
      .map(([key, value]) => ({
        label: FACT_LABELS[key] || key,
        value: String(value),
      })),
    inferredPending: input.extracted.inferredCandidates.map((candidate) => ({
      id: candidate.id,
      field: candidate.field,
      label: INFERRED_LABELS[candidate.field] || candidate.field,
      value: stringifyValue(candidate.value),
      evidence: candidate.evidence,
      status: "pending" as const,
    })),
    emotion: input.extracted.emotionSnapshot
      ? {
          emotion: input.extracted.emotionSnapshot.emotion,
          evidence: input.extracted.emotionSnapshot.evidence,
          weight: input.extracted.emotionSnapshot.weight,
        }
      : existing?.emotion,
    fileUnderstanding: existing?.fileUnderstanding,
    updatedAt: input.updatedAt || new Date().toISOString(),
  }
}

export function attachFileUnderstanding(insight: TurnInsight, file: UploadUnderstandingInput): TurnInsight {
  return {
    ...insight,
    fileUnderstanding: {
      originalName: file.originalName,
      canonicalName: file.canonicalName,
      description: (file.description || "（暂未解析）").trim(),
      tags: uniqueStrings([file.subject, file.questionType, ...(file.knowledgePoints || [])]),
      status: file.status || "partial",
    },
    updatedAt: new Date().toISOString(),
  }
}

export function markFileUnderstandingFailed(insight: TurnInsight, originalName: string): TurnInsight {
  return {
    ...insight,
    fileUnderstanding: {
      originalName,
      description: "文件未入库",
      tags: [],
      status: "failed",
    },
    updatedAt: new Date().toISOString(),
  }
}
