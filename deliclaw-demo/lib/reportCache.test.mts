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
  progressSignal: "",
  gapSignal: "",
  todayPick: {
    taskId: "focus-0-task-0",
    taskText: "5 分钟，重做",
    durationMinutes: 5,
    whyLine: "上次卡在这里",
    fileRef: "test.png",
  },
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

test("readCachedReport discards a cached wrong-questions report missing progressSignal", () => {
  installShim()
  ;(globalThis as any).localStorage.setItem(
    "deliclaw_report_wrong-questions",
    JSON.stringify({
      generatedAt: "z",
      windowDays: 30,
      focusPicks: [],
      weeklyTrend: { series: [], summary: "" },
      weakPoints: [],
      // progressSignal missing
    })
  )
  assert.equal(readCachedReport("wrong-questions"), null)
})

test("readCachedReport discards a V2 cached wrong-questions report (no progressSignal, has overview)", () => {
  installShim()
  ;(globalThis as any).localStorage.setItem(
    "deliclaw_report_wrong-questions",
    JSON.stringify({
      generatedAt: "v2",
      windowDays: 30,
      overview: { total: 12, bySubject: [], byQuestionType: [] },
      focusPicks: [],
      weeklyTrend: { series: [], summary: "" },
      weakPoints: [],
    })
  )
  assert.equal(readCachedReport("wrong-questions"), null)
})

// V4 shape validation tests
const VALID_V3_WRONG_QUESTION_FIXTURE = {
  generatedAt: "v3",
  windowDays: 30,
  progressSignal: "good",
  focusPicks: [],
  weeklyTrend: { series: [], summary: "" },
  weakPoints: [],
  // missing gapSignal and todayPick (V3 shape — should be rejected as stale by V4 validator)
}

const VALID_V4_WRONG_QUESTION_FIXTURE = {
  generatedAt: "v4",
  windowDays: 30,
  progressSignal: "good",
  gapSignal: "物理单位换算又冒头，第 3 次了",
  todayPick: {
    taskId: "focus-0-task-0",
    taskText: "5 分钟，重做 4/12 那道二次函数",
    durationMinutes: 5,
    whyLine: "上次你把 h = -2 写成了 2",
    fileRef: "数学-错题-2026-04-12.png",
  },
  focusPicks: [],
  weeklyTrend: { series: [], summary: "" },
  weakPoints: [],
}

test("readCachedReport discards a V3 wrong-questions report missing gapSignal and todayPick", () => {
  installShim()
  ;(globalThis as any).localStorage.setItem(
    "deliclaw_report_wrong-questions",
    JSON.stringify(VALID_V3_WRONG_QUESTION_FIXTURE)
  )
  assert.equal(readCachedReport("wrong-questions"), null, "V3 shape (no gapSignal/todayPick) must be rejected")
})

test("readCachedReport accepts a V4 wrong-questions report with gapSignal and todayPick", () => {
  installShim()
  ;(globalThis as any).localStorage.setItem(
    "deliclaw_report_wrong-questions",
    JSON.stringify(VALID_V4_WRONG_QUESTION_FIXTURE)
  )
  const result = readCachedReport("wrong-questions")
  assert.notEqual(result, null, "V4 shape must be accepted")
  assert.equal((result as any).generatedAt, "v4")
})

test("readCachedReport rejects V4 shape when todayPick.durationMinutes is a string", () => {
  installShim()
  const badFixture = {
    ...VALID_V4_WRONG_QUESTION_FIXTURE,
    todayPick: {
      ...VALID_V4_WRONG_QUESTION_FIXTURE.todayPick,
      durationMinutes: "five", // wrong type: should be number
    },
  }
  ;(globalThis as any).localStorage.setItem(
    "deliclaw_report_wrong-questions",
    JSON.stringify(badFixture)
  )
  assert.equal(readCachedReport("wrong-questions"), null, "todayPick.durationMinutes as string must be rejected")
})
