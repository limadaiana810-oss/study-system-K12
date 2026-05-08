import test from "node:test"
import assert from "node:assert/strict"

import {
  REPORT_STORAGE_KEYS,
  readCachedReport,
  writeCachedReport,
  clearCachedReport,
} from "./reportCache.ts"

// Minimal localStorage shim
function installShim() {
  const store = new Map<string, string>()
  ;(globalThis as any).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  }
}

test("REPORT_STORAGE_KEYS exposes both report keys", () => {
  assert.equal(REPORT_STORAGE_KEYS["wrong-questions"], "deliclaw_report_wrong-questions")
  assert.equal(REPORT_STORAGE_KEYS["growth"], "deliclaw_report_growth")
})

const VALID_HERO: any = {
  subject: "数学",
  goal: "g",
  stepDiagnosis: "s",
  tasks: [],
  closingLine: "c",
  fileRefs: [],
  errorCount: 1,
  examWeightLabel: "",
  knowledgePoints: [],
  whyPicked: "",
  excerpt: "",
  questionDate: "2026-01-01",
}

const VALID_WRONG_QUESTION_FIXTURE = {
  generatedAt: "x",
  windowDays: 30,
  topPattern: "",
  hero: VALID_HERO,
  backups: [],
  weeklyTrend: { series: [], seriesBySubject: [], summary: "" },
  weakPoints: [],
}

const VALID_GROWTH_FIXTURE = {
  generatedAt: "y",
  windowDays: 30,
  topInsight: "",
  thisWeekAction: "",
  focusSubject: "",
  trajectory: { filesUploaded: 0, subjectsCovered: [], activeDays: 0 },
  scores: [],
  emotionTrend: [],
  highlights: [],
  parentAdvice: { strengthen: [], remind: [], encourage: [] },
}

test("writeCachedReport / readCachedReport round-trip a well-formed report", () => {
  installShim()
  writeCachedReport("wrong-questions", VALID_WRONG_QUESTION_FIXTURE as any)
  const back = readCachedReport("wrong-questions")
  assert.equal((back as any).generatedAt, "x")
})

test("clearCachedReport removes the key", () => {
  installShim()
  writeCachedReport("growth", VALID_GROWTH_FIXTURE as any)
  clearCachedReport("growth")
  assert.equal(readCachedReport("growth"), null)
})

test("readCachedReport returns null when missing or invalid JSON", () => {
  installShim()
  assert.equal(readCachedReport("growth"), null)
  ;(globalThis as any).localStorage.setItem("deliclaw_report_growth", "not json")
  assert.equal(readCachedReport("growth"), null)
})

test("V11: readCachedReport rejects V10 growth shape (no topInsight/thisWeekAction)", () => {
  installShim()
  ;(globalThis as any).localStorage.setItem(
    "deliclaw_report_growth",
    JSON.stringify({
      generatedAt: "v10",
      windowDays: 30,
      focusSubject: "数学",
      trajectory: { filesUploaded: 0, subjectsCovered: [], activeDays: 0 },
      scores: [],
      emotionTrend: [],
      highlights: [],
      parentAdvice: { strengthen: [], remind: [], encourage: [] },
      // missing topInsight + thisWeekAction
    })
  )
  assert.equal(readCachedReport("growth"), null, "V10 growth shape must auto-evict under V11")
})

test("readCachedReport discards a cached growth report missing trajectory", () => {
  installShim()
  // Simulates a stale entry from earlier code paths (e.g. an LLM-mode partial write).
  ;(globalThis as any).localStorage.setItem(
    "deliclaw_report_growth",
    JSON.stringify({ generatedAt: "z", windowDays: 30, highlights: ["x"] })
  )
  assert.equal(readCachedReport("growth"), null)
  // And the bad entry should have been cleaned up.
  assert.equal((globalThis as any).localStorage.getItem("deliclaw_report_growth"), null)
})

test("V11: readCachedReport rejects V10 shape (progressHeadline-style, no topPattern/hero/backups)", () => {
  installShim()
  ;(globalThis as any).localStorage.setItem(
    "deliclaw_report_wrong-questions",
    JSON.stringify({
      generatedAt: "v10",
      windowDays: 30,
      progressHeadline: "h",
      progressReason: "r",
      gapSignal: "g",
      focusPicks: [],
      weeklyTrend: { series: [], seriesBySubject: [], summary: "" },
      weakPoints: [],
    })
  )
  assert.equal(readCachedReport("wrong-questions"), null, "V10 shape must auto-evict under V11")
})

test("V10: readCachedReport rejects V9 weeklyTrend shape (no seriesBySubject)", () => {
  installShim()
  ;(globalThis as any).localStorage.setItem(
    "deliclaw_report_wrong-questions",
    JSON.stringify({
      generatedAt: "v9",
      windowDays: 30,
      topPattern: "",
      hero: VALID_HERO,
      backups: [],
      weeklyTrend: { series: [], summary: "" }, // missing seriesBySubject
      weakPoints: [],
    })
  )
  assert.equal(readCachedReport("wrong-questions"), null, "V9 weeklyTrend (no seriesBySubject) must auto-evict")
})

test("V8: readCachedReport rejects V7 shape with progressSignal", () => {
  installShim()
  ;(globalThis as any).localStorage.setItem(
    "deliclaw_report_wrong-questions",
    JSON.stringify({
      generatedAt: "v7",
      windowDays: 30,
      progressSignal: "merged headline + reason in one line",
      gapSignal: "x",
      focusPicks: [],
      weeklyTrend: { series: [], seriesBySubject: [], summary: "" },
      weakPoints: [],
    })
  )
  assert.equal(readCachedReport("wrong-questions"), null, "V7 progressSignal must auto-evict")
})

test("readCachedReport discards a V2 cached wrong-questions report (overview shape)", () => {
  installShim()
  ;(globalThis as any).localStorage.setItem(
    "deliclaw_report_wrong-questions",
    JSON.stringify({
      generatedAt: "v2",
      windowDays: 30,
      overview: { total: 12, bySubject: [], byQuestionType: [] },
      focusPicks: [],
      weeklyTrend: { series: [], seriesBySubject: [], summary: "" },
      weakPoints: [],
    })
  )
  assert.equal(readCachedReport("wrong-questions"), null)
})

const VALID_V11_WRONG_QUESTION_FIXTURE = {
  generatedAt: "v11",
  windowDays: 30,
  topPattern: "这周 1 道错，月内最低。但物理单位换算又翻车，第 3 次了。",
  hero: VALID_HERO,
  backups: [],
  weeklyTrend: { series: [], seriesBySubject: [], summary: "" },
  weakPoints: [],
}

test("V11: readCachedReport accepts a well-formed V11 wrong-questions report", () => {
  installShim()
  ;(globalThis as any).localStorage.setItem(
    "deliclaw_report_wrong-questions",
    JSON.stringify(VALID_V11_WRONG_QUESTION_FIXTURE)
  )
  const result = readCachedReport("wrong-questions")
  assert.notEqual(result, null, "V11 shape must be accepted")
  assert.equal((result as any).generatedAt, "v11")
})

// hero-shape validation
const V5_FOCUS_PICK = {
  knowledgePoint: "二次函数顶点式",
  subject: "数学",
  goal: "g",
  stepDiagnosis: "s",
  tasks: [],
  closingLine: "c",
  fileRefs: [],
  errorCount: 4,
  examWeightLabel: "期中压轴 18 分",
  // missing: knowledgePoints, whyPicked, excerpt, questionDate
}

test("V11: readCachedReport rejects when hero misses knowledgePoints/whyPicked/excerpt", () => {
  installShim()
  const bad = { ...VALID_V11_WRONG_QUESTION_FIXTURE, hero: V5_FOCUS_PICK }
  ;(globalThis as any).localStorage.setItem(
    "deliclaw_report_wrong-questions",
    JSON.stringify(bad)
  )
  assert.equal(readCachedReport("wrong-questions"), null, "old FocusPick shape must be rejected")
})

test("V11: readCachedReport rejects when hero.knowledgePoints is not an array", () => {
  installShim()
  const bad = {
    ...VALID_V11_WRONG_QUESTION_FIXTURE,
    hero: { ...VALID_HERO, knowledgePoints: "not an array" },
  }
  ;(globalThis as any).localStorage.setItem(
    "deliclaw_report_wrong-questions",
    JSON.stringify(bad)
  )
  assert.equal(readCachedReport("wrong-questions"), null, "knowledgePoints as string must be rejected")
})

test("V11: readCachedReport rejects when backups is not an array", () => {
  installShim()
  const bad = { ...VALID_V11_WRONG_QUESTION_FIXTURE, backups: "not an array" }
  ;(globalThis as any).localStorage.setItem(
    "deliclaw_report_wrong-questions",
    JSON.stringify(bad)
  )
  assert.equal(readCachedReport("wrong-questions"), null, "backups must be an array")
})
