import type {
  GrowthReport,
  ReportType,
  WrongQuestionReport,
} from "./reportTypes.ts"

export const REPORT_STORAGE_KEYS: Record<ReportType, string> = {
  "wrong-questions": "deliclaw_report_wrong-questions",
  growth: "deliclaw_report_growth",
}

type AnyReport = WrongQuestionReport | GrowthReport

function isFocusPickShape(x: any): boolean {
  return (
    !!x &&
    typeof x === "object" &&
    !Array.isArray(x) &&
    typeof x.errorCount === "number" &&
    typeof x.examWeightLabel === "string" &&
    Array.isArray(x.knowledgePoints) &&
    typeof x.whyPicked === "string" &&
    typeof x.excerpt === "string" &&
    typeof x.questionDate === "string"
  )
}

function isWrongQuestionReportShape(r: any): r is WrongQuestionReport {
  return (
    !!r &&
    typeof r === "object" &&
    typeof r.topPattern === "string" &&
    isFocusPickShape(r.hero) &&
    Array.isArray(r.backups) &&
    r.backups.every(isFocusPickShape) &&
    !!r.weeklyTrend &&
    typeof r.weeklyTrend === "object" &&
    Array.isArray(r.weeklyTrend.series) &&
    Array.isArray(r.weeklyTrend.seriesBySubject) &&
    typeof r.weeklyTrend.summary === "string" &&
    Array.isArray(r.weakPoints)
  )
}

function isGrowthReportShape(r: any): r is GrowthReport {
  return (
    !!r &&
    typeof r === "object" &&
    typeof r.topInsight === "string" &&
    typeof r.thisWeekAction === "string" &&
    typeof r.focusSubject === "string" &&
    !!r.trajectory &&
    typeof r.trajectory === "object" &&
    Array.isArray(r.scores) &&
    r.scores.every(
      (s: any) =>
        Array.isArray(s.weeklyHomeworkAvg) &&
        s.weeklyHomeworkAvg.length === 4 &&
        Array.isArray(s.weeklyExamAvg) &&
        s.weeklyExamAvg.length === 4 &&
        Array.isArray(s.weeklyErrorCount) &&
        s.weeklyErrorCount.length === 4,
    ) &&
    Array.isArray(r.emotionTrend) &&
    Array.isArray(r.highlights) &&
    !!r.parentAdvice &&
    typeof r.parentAdvice === "object"
  )
}

export function readCachedReport<T extends AnyReport = AnyReport>(type: ReportType): T | null {
  try {
    const raw = localStorage.getItem(REPORT_STORAGE_KEYS[type])
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return null

    // Discard stale or malformed cache entries (e.g. partial writes from earlier code paths).
    const ok =
      type === "wrong-questions"
        ? isWrongQuestionReportShape(parsed)
        : isGrowthReportShape(parsed)
    if (!ok) {
      try {
        localStorage.removeItem(REPORT_STORAGE_KEYS[type])
      } catch {
        // ignore
      }
      return null
    }
    return parsed as T
  } catch {
    return null
  }
}

export function writeCachedReport(type: ReportType, report: AnyReport) {
  try {
    localStorage.setItem(REPORT_STORAGE_KEYS[type], JSON.stringify(report))
  } catch {
    // ignore quota / unavailable
  }
}

export function clearCachedReport(type: ReportType) {
  try {
    localStorage.removeItem(REPORT_STORAGE_KEYS[type])
  } catch {
    // ignore
  }
}
