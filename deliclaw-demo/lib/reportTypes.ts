export type FocusPick = {
  knowledgePoint: string
  subject: string
  occurrences: number
  priority: "高" | "中"
  diagnosis: string
  tasks: { id: string; text: string }[]
  expectedOutcome: string
  fileRefs: string[]
}

export type WeeklyTrendPoint = {
  week: 1 | 2 | 3 | 4
  count: number
}

export type WeeklyTrend = {
  series: WeeklyTrendPoint[]
  summary: string
}

export type WrongQuestionReport = {
  generatedAt: string
  windowDays: 30
  overview: {
    total: number
    bySubject: { subject: string; count: number }[]
    byQuestionType: { type: string; count: number }[]
  }
  focusPicks: FocusPick[]
  weeklyTrend: WeeklyTrend
  weakPoints: {
    knowledgePoint: string
    subject: string
    occurrences: number
    diagnosis: string
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
