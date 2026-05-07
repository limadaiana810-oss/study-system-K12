export type WrongQuestionReport = {
  generatedAt: string
  windowDays: 30
  overview: {
    total: number
    bySubject: { subject: string; count: number }[]
    byQuestionType: { type: string; count: number }[]
  }
  weakPoints: {
    knowledgePoint: string
    subject: string
    occurrences: number
    diagnosis: string
  }[]
  errorPatterns: {
    pattern: string
    evidence: string
    fileRefs: string[]
  }[]
  actionPlan: {
    priority: "高" | "中" | "低"
    action: string
    estimatedGain: string
    targetWeakPoint?: string
  }[]
}

export type GrowthReport = {
  generatedAt: string
  windowDays: 30
  trajectory: {
    filesUploaded: number
    subjectsCovered: string[]
    activeDays: number
  }
  scores: {
    subject: string
    homeworkAvg: number
    examLatest: { value: number; max: number; date: string } | null
    weeklySeries: number[]
  }[]
  emotionTrend: {
    week: 1 | 2 | 3 | 4
    dominant: string
    summary: string
  }[]
  highlights: string[]
  parentAdvice: {
    strengthen: string[]
    remind: string[]
    encourage: string[]
  }
}

export type ReportType = "wrong-questions" | "growth"

export type ReportEnvelope =
  | { ok: true; report: WrongQuestionReport }
  | { ok: true; report: GrowthReport }
  | { ok: false; error: string }
