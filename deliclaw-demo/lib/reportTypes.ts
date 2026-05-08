export type TodayPick = {
  taskId: string
  taskText: string
  durationMinutes: number
  whyLine: string
  fileRef: string
}

export type FocusTask = {
  id: string
  text: string
  durationMinutes: number
  isReDo: boolean
}

export type FocusPick = {
  knowledgePoint: string
  subject: string
  goal: string
  stepDiagnosis: string
  tasks: FocusTask[]
  closingLine: string
  fileRefs: string[]
  errorCount: number
  examWeightLabel: string
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
  progressSignal: string
  gapSignal: string
  todayPick: TodayPick
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
