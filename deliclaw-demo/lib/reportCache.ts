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

export function readCachedReport<T extends AnyReport = AnyReport>(type: ReportType): T | null {
  try {
    const raw = localStorage.getItem(REPORT_STORAGE_KEYS[type])
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return null
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
