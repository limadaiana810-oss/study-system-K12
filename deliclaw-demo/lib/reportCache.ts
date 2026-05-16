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
  if (!r || typeof r !== "object") return false
  if (!r.errorAnalysis || typeof r.errorAnalysis !== "object") return false
  if (!Array.isArray(r.errorAnalysis.todayWins)) return false
  if (!isFocusPickShape(r.errorAnalysis.keyError)) return false

  if (!r.learningGuidance || typeof r.learningGuidance !== "object") return false
  if (typeof r.learningGuidance.unawareGap !== "string") return false
  if (!Array.isArray(r.learningGuidance.studyMethods)) return false
  for (const m of r.learningGuidance.studyMethods) {
    if (!m || typeof m !== "object") return false
    if (typeof m.name !== "string") return false
    if (typeof m.researcher !== "string") return false
    if (typeof m.finding !== "string") return false
    if (typeof m.action !== "string") return false
  }

  if (!r.studentObservation || typeof r.studentObservation !== "object") return false
  if (!Array.isArray(r.studentObservation.moments)) return false
  if (typeof r.studentObservation.closingLine !== "string") return false
  for (const m of r.studentObservation.moments) {
    if (!m || typeof m !== "object") return false
    if (typeof m.timestamp !== "string") return false
    if (typeof m.observation !== "string") return false
  }

  return true
}

function isGrowthReportShape(r: any): r is GrowthReport {
  if (!r || typeof r !== "object") return false

  if (!r.weekWork || typeof r.weekWork !== "object") return false
  if (typeof r.weekWork.filesIngested !== "number") return false
  if (!Array.isArray(r.weekWork.knowledgePointsResolved)) return false

  if (!r.progressAssessment || typeof r.progressAssessment !== "object") return false
  if (!Array.isArray(r.progressAssessment.bySubject)) return false
  for (const s of r.progressAssessment.bySubject) {
    if (!s || typeof s !== "object") return false
    if (typeof s.subject !== "string") return false
    if (s.trend !== "improving" && s.trend !== "regressing" && s.trend !== "insufficient-data") {
      return false
    }
  }

  if (!r.recommendation || typeof r.recommendation !== "object") return false
  if (!r.recommendation.studyAdvice || typeof r.recommendation.studyAdvice !== "object") return false
  if (typeof r.recommendation.studyAdvice.action !== "string") return false
  if (typeof r.recommendation.studyAdvice.whyThisAction !== "string") return false
  if (typeof r.recommendation.studyAdvice.whyNotBroader !== "string") return false

  const ca = r.recommendation.communicationApproach
  if (!ca || typeof ca !== "object") return false

  // ① 小孩的情绪
  if (!ca.childEmotion || typeof ca.childEmotion !== "object") return false
  if (typeof ca.childEmotion.summary !== "string") return false
  if (!Array.isArray(ca.childEmotion.evidence)) return false
  for (const e of ca.childEmotion.evidence) {
    if (typeof e !== "string") return false
  }

  // ② Alpha 世代沟通
  if (!ca.alphaGenContext || typeof ca.alphaGenContext !== "object") return false
  if (typeof ca.alphaGenContext.bornRange !== "string") return false
  if (!Array.isArray(ca.alphaGenContext.traits)) return false
  for (const t of ca.alphaGenContext.traits) {
    if (typeof t !== "string") return false
  }
  if (typeof ca.alphaGenContext.whyDifferent !== "string") return false

  // ③ 不同年龄段策略
  const ds = ca.developmentalStrategy
  if (!ds || typeof ds !== "object") return false
  if (!Array.isArray(ds.ageBrackets)) return false
  for (const b of ds.ageBrackets) {
    if (!b || typeof b !== "object") return false
    if (typeof b.range !== "string") return false
    if (typeof b.stageName !== "string") return false
    if (typeof b.theorist !== "string") return false
    if (typeof b.strategy !== "string") return false
    if (typeof b.isCurrent !== "boolean") return false
  }
  if (!Array.isArray(ds.tonightLines)) return false
  for (const t of ds.tonightLines) {
    if (typeof t !== "string") return false
  }
  if (typeof ds.keyword !== "string") return false

  return true
}

export function readCachedReport<T extends AnyReport = AnyReport>(type: ReportType): T | null {
  try {
    const raw = localStorage.getItem(REPORT_STORAGE_KEYS[type])
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return null

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
