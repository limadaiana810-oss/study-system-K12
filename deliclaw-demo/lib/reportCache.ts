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

function isWrongQuestionReportShape(r: any): r is WrongQuestionReport {
  return (
    !!r &&
    typeof r === "object" &&
    !!r.overview &&
    typeof r.overview === "object" &&
    Array.isArray(r.overview.bySubject) &&
    Array.isArray(r.overview.byQuestionType) &&
    Array.isArray(r.focusPicks) &&
    !!r.weeklyTrend &&
    typeof r.weeklyTrend === "object" &&
    Array.isArray(r.weeklyTrend.series) &&
    typeof r.weeklyTrend.summary === "string" &&
    Array.isArray(r.weakPoints)
  )
}

function isGrowthReportShape(r: any): r is GrowthReport {
  return (
    !!r &&
    typeof r === "object" &&
    !!r.trajectory &&
    typeof r.trajectory === "object" &&
    Array.isArray(r.scores) &&
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
