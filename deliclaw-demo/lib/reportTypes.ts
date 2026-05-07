export type TodayPick = {
  taskId: string         // relates to focusPicks[i].tasks[j].id (used for scroll jump)
  taskText: string       // "5 分钟，重做 4/12 那道二次函数"
  durationMinutes: number // 5
  whyLine: string        // "上次你把 h = -2 写成了 2"
  fileRef: string        // old wrong-question file name (optional preview)
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
  gapSignal: string        // ⚠ line: specific knowledge point + occurrence count (NEW in V4)
  todayPick: TodayPick     // "现在做这一件" hero action card (NEW in V4)
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
