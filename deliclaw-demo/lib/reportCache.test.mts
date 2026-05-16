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

// ─────────────────────────────────────────────────────────
// V19 valid fixtures
// ─────────────────────────────────────────────────────────

const VALID_FOCUS_PICK: any = {
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

const VALID_V20_WRONG_QUESTION: any = {
  generatedAt: "v20",
  windowDays: 30,
  errorAnalysis: {
    todayWins: [],
    keyError: VALID_FOCUS_PICK,
  },
  learningGuidance: {
    unawareGap: "",
    studyMethods: [
      { name: "主动回忆", researcher: "Roediger 2006", finding: "x", action: "x" },
    ],
  },
  studentObservation: {
    moments: [
      { timestamp: "周二 23:47", observation: "..." },
    ],
    closingLine: "我已在家长那边说清楚",
  },
}

const VALID_V21_GROWTH: any = {
  generatedAt: "v21",
  windowDays: 30,
  weekWork: {
    filesIngested: 0,
    knowledgePointsResolved: [],
  },
  progressAssessment: {
    bySubject: [
      { subject: "数学", trend: "regressing", dataObservation: "x" },
      { subject: "英语", trend: "insufficient-data", insufficientNote: "x" },
    ],
  },
  recommendation: {
    studyAdvice: { action: "x", whyThisAction: "x", whyNotBroader: "x" },
    communicationApproach: {
      childEmotion: { summary: "x", evidence: ["x"] },
      alphaGenContext: { bornRange: "2010 Alpha", traits: ["x"], whyDifferent: "x" },
      developmentalStrategy: {
        ageBrackets: [
          { range: "12-14 岁", stageName: "x", theorist: "Dweck 2006", strategy: "x", isCurrent: true },
        ],
        tonightLines: ["x"],
        keyword: "x",
      },
    },
  },
}

// ─────────────────────────────────────────────────────────
// Core round-trip
// ─────────────────────────────────────────────────────────

test("V20: writeCachedReport / readCachedReport round-trip valid wrong-questions report", () => {
  installShim()
  writeCachedReport("wrong-questions", VALID_V20_WRONG_QUESTION)
  const back = readCachedReport("wrong-questions")
  assert.equal((back as any).generatedAt, "v20")
})

test("V21: writeCachedReport / readCachedReport round-trip valid growth report", () => {
  installShim()
  writeCachedReport("growth", VALID_V21_GROWTH)
  const back = readCachedReport("growth")
  assert.equal((back as any).generatedAt, "v21")
})

test("clearCachedReport removes the key", () => {
  installShim()
  writeCachedReport("growth", VALID_V21_GROWTH)
  clearCachedReport("growth")
  assert.equal(readCachedReport("growth"), null)
})

test("readCachedReport returns null when missing or invalid JSON", () => {
  installShim()
  assert.equal(readCachedReport("growth"), null)
  ;(globalThis as any).localStorage.setItem("deliclaw_report_growth", "not json")
  assert.equal(readCachedReport("growth"), null)
})

// ─────────────────────────────────────────────────────────
// V19 evicts all pre-V19 cached shapes
// ─────────────────────────────────────────────────────────

test("V19: evicts V18 wrong-questions shape (studentCommunication.saying/avoid)", () => {
  installShim()
  ;(globalThis as any).localStorage.setItem(
    "deliclaw_report_wrong-questions",
    JSON.stringify({
      generatedAt: "v18",
      windowDays: 30,
      errorAnalysis: { todayWins: [], keyError: VALID_FOCUS_PICK },
      learningGuidance: {
        unawareGap: "",
        practiceOptions: { doIt: "x", reviewOnly: "x", skipToday: "x" },
      },
      studentCommunication: { saying: [], avoid: [] }, // V18 shape
    }),
  )
  assert.equal(readCachedReport("wrong-questions"), null, "V18 shape must auto-evict under V19")
})

test("V19: evicts V18 growth shape (parentCommunication / learningAbility)", () => {
  installShim()
  ;(globalThis as any).localStorage.setItem(
    "deliclaw_report_growth",
    JSON.stringify({
      generatedAt: "v18",
      windowDays: 30,
      weekWork: { filesIngested: 0, knowledgePointsResolved: [] },
      progressAssessment: { learningAbility: [] }, // V18 shape
      parentCommunication: { // V18 shape
        relaxReason: "",
        thisWeekAction: "",
        tonightDosLines: [],
        tonightDontsLines: [],
        reasonLine: "",
      },
    }),
  )
  assert.equal(readCachedReport("growth"), null, "V18 growth shape must auto-evict under V19")
})

test("V19: evicts V11 wrong-questions shape (hero / backups / weeklyTrend)", () => {
  installShim()
  ;(globalThis as any).localStorage.setItem(
    "deliclaw_report_wrong-questions",
    JSON.stringify({
      generatedAt: "v11",
      windowDays: 30,
      topPattern: "...",
      hero: VALID_FOCUS_PICK,
      backups: [],
      weeklyTrend: { series: [], seriesBySubject: [], summary: "" },
      weakPoints: [],
    }),
  )
  assert.equal(readCachedReport("wrong-questions"), null)
})

test("V19: evicts a wrong-questions report missing studentObservation block", () => {
  installShim()
  const bad = { ...VALID_V20_WRONG_QUESTION, studentObservation: undefined }
  ;(globalThis as any).localStorage.setItem(
    "deliclaw_report_wrong-questions",
    JSON.stringify(bad),
  )
  assert.equal(readCachedReport("wrong-questions"), null)
})

test("V19: evicts a wrong-questions report whose moment is missing timestamp", () => {
  installShim()
  const bad = {
    ...VALID_V20_WRONG_QUESTION,
    studentObservation: {
      ...VALID_V20_WRONG_QUESTION.studentObservation,
      moments: [{ observation: "x" }], // missing timestamp
    },
  }
  ;(globalThis as any).localStorage.setItem(
    "deliclaw_report_wrong-questions",
    JSON.stringify(bad),
  )
  assert.equal(readCachedReport("wrong-questions"), null)
})

test("V19: evicts a growth report missing recommendation block", () => {
  installShim()
  const bad = { ...VALID_V21_GROWTH, recommendation: undefined }
  ;(globalThis as any).localStorage.setItem(
    "deliclaw_report_growth",
    JSON.stringify(bad),
  )
  assert.equal(readCachedReport("growth"), null)
})

test("V19: evicts a growth report whose bySubject has invalid trend", () => {
  installShim()
  const bad = {
    ...VALID_V21_GROWTH,
    progressAssessment: {
      bySubject: [{ subject: "数学", trend: "totally-up" }], // invalid trend
    },
  }
  ;(globalThis as any).localStorage.setItem(
    "deliclaw_report_growth",
    JSON.stringify(bad),
  )
  assert.equal(readCachedReport("growth"), null)
})

test("V21: evicts a growth report missing alphaGenContext", () => {
  installShim()
  const bad = {
    ...VALID_V21_GROWTH,
    recommendation: {
      ...VALID_V21_GROWTH.recommendation,
      communicationApproach: {
        ...VALID_V21_GROWTH.recommendation.communicationApproach,
        alphaGenContext: undefined,
      },
    },
  }
  ;(globalThis as any).localStorage.setItem(
    "deliclaw_report_growth",
    JSON.stringify(bad),
  )
  assert.equal(readCachedReport("growth"), null)
})

test("V21: evicts a growth report whose ageBracket is missing isCurrent", () => {
  installShim()
  const bad = {
    ...VALID_V21_GROWTH,
    recommendation: {
      ...VALID_V21_GROWTH.recommendation,
      communicationApproach: {
        ...VALID_V21_GROWTH.recommendation.communicationApproach,
        developmentalStrategy: {
          ...VALID_V21_GROWTH.recommendation.communicationApproach.developmentalStrategy,
          ageBrackets: [{ range: "12-14 岁", stageName: "x", theorist: "x", strategy: "x" }], // missing isCurrent
        },
      },
    },
  }
  ;(globalThis as any).localStorage.setItem(
    "deliclaw_report_growth",
    JSON.stringify(bad),
  )
  assert.equal(readCachedReport("growth"), null)
})

test("V21: evicts V20 growth shape (situation / theory / strategy)", () => {
  installShim()
  ;(globalThis as any).localStorage.setItem(
    "deliclaw_report_growth",
    JSON.stringify({
      generatedAt: "v20",
      windowDays: 30,
      weekWork: { filesIngested: 0, knowledgePointsResolved: [] },
      progressAssessment: { bySubject: [] },
      recommendation: {
        studyAdvice: { action: "x", whyThisAction: "x", whyNotBroader: "x" },
        communicationApproach: {
          situation: ["x"],
          theory: { ageBracket: "12-14 岁", framework: "Dweck", bullets: ["x"], keyword: "x" },
          strategy: [{ step: "x", reason: "x" }],
        },
      },
    }),
  )
  assert.equal(readCachedReport("growth"), null, "V20 communicationApproach 必须被 V21 evict")
})
