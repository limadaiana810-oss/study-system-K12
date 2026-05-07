import { NextResponse } from "next/server"
import type { MemoryEntry } from "@/types"
import { openrouterChatJson } from "@/lib/server/openrouter"
import {
  aggregateFileOverview,
  aggregateScores,
  buildEmotionTrendSkeleton,
  countActiveDays,
} from "@/lib/reportAggregation"
import type { FileForOverview } from "@/lib/reportAggregation"
import { getScoresForWindow, MOCK_EMOTION_HISTORY } from "@/lib/mockScores"
import {
  WRONG_QUESTION_REPORT_PROMPT,
  GROWTH_REPORT_PROMPT,
} from "@/lib/reportPrompts"
import type {
  GrowthReport,
  ReportType,
  WrongQuestionReport,
} from "@/lib/reportTypes"
import { listFiles } from "@/lib/server/sqlite"

const TEXT_MODEL = process.env.OPENROUTER_CHAT_MODEL_TEXT ?? "qwen/qwen3.6-plus"

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

type SqliteFileTags = {
  subject?: string
  questionType?: string
  knowledgePoints?: string[]
  date?: string
}

function readFilesForOverview(): FileForOverview[] {
  try {
    const rows = listFiles()
    return rows.map((r) => {
      let tags: SqliteFileTags = {}
      try {
        tags = JSON.parse(r.tags_json || "{}") as SqliteFileTags
      } catch {
        tags = {}
      }
      return {
        subject: tags.subject ?? "",
        questionType: tags.questionType ?? "",
        knowledgePoints: Array.isArray(tags.knowledgePoints) ? tags.knowledgePoints : [],
        canonicalName: r.title || r.fileName,
        description: r.description ?? "",
      }
    })
  } catch (err) {
    console.error("[reports] readFilesForOverview failed:", err)
    return []
  }
}

async function buildWrongQuestionReport(): Promise<WrongQuestionReport> {
  const files = readFilesForOverview()
  const overview = aggregateFileOverview(files)

  const userPayload = JSON.stringify({
    overview,
    files: files.map((f) => ({
      canonicalName: f.canonicalName,
      subject: f.subject,
      questionType: f.questionType,
      knowledgePoints: f.knowledgePoints,
      description: f.description,
    })),
  })

  type LlmOut = {
    weakPoints: WrongQuestionReport["weakPoints"]
    errorPatterns: WrongQuestionReport["errorPatterns"]
    actionPlan: WrongQuestionReport["actionPlan"]
  }
  const llm = await openrouterChatJson<LlmOut>({
    model: TEXT_MODEL,
    system: WRONG_QUESTION_REPORT_PROMPT,
    user: userPayload,
    responseFormat: "json_object",
  })

  const safeErrorPatterns = (Array.isArray(llm.errorPatterns) ? llm.errorPatterns : []).map(
    (ep) => ({
      pattern: typeof ep?.pattern === "string" ? ep.pattern : "",
      evidence: typeof ep?.evidence === "string" ? ep.evidence : "",
      fileRefs: Array.isArray(ep?.fileRefs) ? ep.fileRefs.filter((r: unknown): r is string => typeof r === "string") : [],
    })
  )

  return {
    generatedAt: new Date().toISOString(),
    windowDays: 30,
    overview,
    weakPoints: Array.isArray(llm.weakPoints) ? llm.weakPoints : [],
    errorPatterns: safeErrorPatterns,
    actionPlan: Array.isArray(llm.actionPlan) ? llm.actionPlan : [],
  }
}

async function buildGrowthReport(memorySnapshot: MemoryEntry): Promise<GrowthReport> {
  const today = todayIso()
  const files = readFilesForOverview()
  const scoresWindow = getScoresForWindow(30)
  const scores = aggregateScores(scoresWindow, today)
  const emotionSkeleton = buildEmotionTrendSkeleton(MOCK_EMOTION_HISTORY)

  const trajectory = {
    filesUploaded: files.length,
    subjectsCovered: Array.from(new Set(files.map((f) => f.subject).filter(Boolean))),
    activeDays: countActiveDays(scoresWindow),
  }

  const userPayload = JSON.stringify({
    trajectory,
    scores,
    emotionTrend: emotionSkeleton.map((e) => ({ week: e.week, dominant: e.dominant })),
    memory: {
      factual: memorySnapshot.factual ?? {},
      inferred: memorySnapshot.inferred ?? {},
    },
  })

  type LlmOut = {
    emotionTrendSummaries: string[]
    highlights: string[]
    parentAdvice: GrowthReport["parentAdvice"]
  }
  const llm = await openrouterChatJson<LlmOut>({
    model: TEXT_MODEL,
    system: GROWTH_REPORT_PROMPT,
    user: userPayload,
    responseFormat: "json_object",
  })

  const summaries = Array.isArray(llm.emotionTrendSummaries) ? llm.emotionTrendSummaries : []
  const emotionTrend = emotionSkeleton.map((e, i) => ({
    ...e,
    summary: typeof summaries[i] === "string" ? summaries[i] : "",
  }))

  return {
    generatedAt: new Date().toISOString(),
    windowDays: 30,
    trajectory,
    scores,
    emotionTrend,
    highlights: Array.isArray(llm.highlights) ? llm.highlights : [],
    parentAdvice: {
      strengthen: Array.isArray(llm.parentAdvice?.strengthen) ? llm.parentAdvice.strengthen : [],
      remind: Array.isArray(llm.parentAdvice?.remind) ? llm.parentAdvice.remind : [],
      encourage: Array.isArray(llm.parentAdvice?.encourage) ? llm.parentAdvice.encourage : [],
    },
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ type: string }> }
): Promise<Response> {
  const { type } = await context.params
  const reportType = type as ReportType

  let body: any = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }
  const memorySnapshot: MemoryEntry =
    body && typeof body === "object" && body.memorySnapshot ? body.memorySnapshot : {}

  try {
    if (reportType === "wrong-questions") {
      const report = await buildWrongQuestionReport()
      return NextResponse.json({ ok: true, report })
    }
    if (reportType === "growth") {
      const report = await buildGrowthReport(memorySnapshot)
      return NextResponse.json({ ok: true, report })
    }
    return NextResponse.json({ ok: false, error: "unknown_report_type" }, { status: 400 })
  } catch (err) {
    console.error(`[reports/${reportType}] build failed:`, err)
    const msg = err instanceof Error ? err.message : "report_build_failed"
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
