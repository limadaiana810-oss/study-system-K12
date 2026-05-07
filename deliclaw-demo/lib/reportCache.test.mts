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

const VALID_WRONG_QUESTION_FIXTURE = {
  generatedAt: "x",
  windowDays: 30,
  overview: { total: 0, bySubject: [], byQuestionType: [] },
  focusPicks: [],
  weeklyTrend: { series: [], summary: "" },
  weakPoints: [],
}

const VALID_GROWTH_FIXTURE = {
  generatedAt: "y",
  windowDays: 30,
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

test("readCachedReport discards a cached wrong-questions report missing focusPicks", () => {
  installShim()
  ;(globalThis as any).localStorage.setItem(
    "deliclaw_report_wrong-questions",
    JSON.stringify({
      generatedAt: "z",
      windowDays: 30,
      overview: { total: 0, bySubject: [], byQuestionType: [] },
      weakPoints: [],
      // focusPicks and weeklyTrend missing
    })
  )
  assert.equal(readCachedReport("wrong-questions"), null)
})

test("readCachedReport discards a stale wrong-questions report still using the old errorPatterns/actionPlan shape", () => {
  installShim()
  ;(globalThis as any).localStorage.setItem(
    "deliclaw_report_wrong-questions",
    JSON.stringify({
      generatedAt: "legacy",
      windowDays: 30,
      overview: { total: 0, bySubject: [], byQuestionType: [] },
      weakPoints: [],
      errorPatterns: [],
      actionPlan: [],
    })
  )
  assert.equal(readCachedReport("wrong-questions"), null)
})
