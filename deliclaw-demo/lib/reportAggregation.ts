import type { ScoreEntry, WeeklyEmotion } from "./mockScores.ts"
import type { GrowthReport, WrongQuestionReport } from "./reportTypes.ts"

export type FileForOverview = {
  subject: string
  questionType: string
  knowledgePoints: string[]
  canonicalName: string
  description: string
}

export function aggregateFileOverview(
  files: FileForOverview[]
): WrongQuestionReport["overview"] {
  const subjectMap = new Map<string, number>()
  const typeMap = new Map<string, number>()
  for (const f of files) {
    if (f.subject) subjectMap.set(f.subject, (subjectMap.get(f.subject) ?? 0) + 1)
    if (f.questionType) typeMap.set(f.questionType, (typeMap.get(f.questionType) ?? 0) + 1)
  }
  const bySubject = Array.from(subjectMap.entries())
    .map(([subject, count]) => ({ subject, count }))
    .sort((a, b) => b.count - a.count)
  const byQuestionType = Array.from(typeMap.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
  return { total: files.length, bySubject, byQuestionType }
}

function weekIndexFromDate(scoreDate: string, todayIso: string): number | null {
  // Returns 0..3 for the 4 weeks ending today (inclusive), or null if outside.
  const today = new Date(todayIso)
  const score = new Date(scoreDate)
  const daysAgo = Math.floor((today.getTime() - score.getTime()) / (24 * 3600 * 1000))
  if (daysAgo < 0 || daysAgo > 27) return null
  // week 0 = days 0-6 (most recent), week 3 = days 21-27 (oldest of the 4)
  const w = Math.floor(daysAgo / 7)
  return Math.min(3, w)
}

function pct(value: number, max: number): number {
  if (max <= 0) return 0
  return Math.round((value / max) * 1000) / 10 // 1 decimal place
}

export function aggregateScores(
  scores: ScoreEntry[],
  todayIso: string = new Date().toISOString().slice(0, 10)
): GrowthReport["scores"] {
  const bySubject = new Map<string, ScoreEntry[]>()
  for (const s of scores) {
    if (!bySubject.has(s.subject)) bySubject.set(s.subject, [])
    bySubject.get(s.subject)!.push(s)
  }
  const out: GrowthReport["scores"] = []
  for (const [subject, list] of bySubject) {
    const homeworkPcts = list.filter((s) => s.type === "homework").map((s) => pct(s.value, s.max))
    const homeworkAvg =
      homeworkPcts.length === 0
        ? 0
        : Math.round((homeworkPcts.reduce((a, b) => a + b, 0) / homeworkPcts.length) * 10) / 10

    const exams = list.filter((s) => s.type === "exam").sort((a, b) => a.date.localeCompare(b.date))
    const lastExam = exams[exams.length - 1]
    const examLatest = lastExam
      ? { value: lastExam.value, max: lastExam.max, date: lastExam.date }
      : null

    // weeklySeries: index 0 = oldest week, index 3 = newest week (recent right side on chart)
    const buckets: number[][] = [[], [], [], []]
    for (const s of list) {
      const w = weekIndexFromDate(s.date, todayIso)
      if (w === null) continue
      // Translate so index 0 = oldest of last 4 weeks
      const oldestFirst = 3 - w
      buckets[oldestFirst].push(pct(s.value, s.max))
    }
    const weeklySeries: number[] = []
    let lastSeen = homeworkAvg || 0
    for (const bucket of buckets) {
      if (bucket.length === 0) {
        weeklySeries.push(lastSeen)
      } else {
        const avg = Math.round((bucket.reduce((a, b) => a + b, 0) / bucket.length) * 10) / 10
        weeklySeries.push(avg)
        lastSeen = avg
      }
    }

    out.push({ subject, homeworkAvg, examLatest, weeklySeries })
  }
  return out.sort((a, b) => a.subject.localeCompare(b.subject))
}

export function buildEmotionTrendSkeleton(
  history: WeeklyEmotion[]
): GrowthReport["emotionTrend"] {
  return history
    .slice()
    .sort((a, b) => a.week - b.week)
    .map((h) => ({ week: h.week, dominant: h.dominant, summary: "" }))
}

export function countActiveDays(scores: ScoreEntry[]): number {
  return new Set(scores.map((s) => s.date)).size
}
