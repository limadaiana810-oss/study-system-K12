import test from "node:test"
import assert from "node:assert/strict"

import {
  aggregateFileOverview,
  aggregateScores,
  buildEmotionTrendSkeleton,
  countActiveDays,
} from "./reportAggregation.ts"
import type { ScoreEntry } from "./mockScores.ts"

const SAMPLE_FILES = [
  { subject: "数学", questionType: "选择题", knowledgePoints: ["二次函数"], canonicalName: "math-1", description: "" },
  { subject: "数学", questionType: "选择题", knowledgePoints: ["二次函数"], canonicalName: "math-2", description: "" },
  { subject: "英语", questionType: "阅读", knowledgePoints: ["细节题"], canonicalName: "eng-1", description: "" },
  { subject: "数学", questionType: "解答题", knowledgePoints: ["几何"], canonicalName: "math-3", description: "" },
]

test("aggregateFileOverview groups by subject and questionType", () => {
  const out = aggregateFileOverview(SAMPLE_FILES)
  assert.equal(out.total, 4)
  const mathRow = out.bySubject.find((r) => r.subject === "数学")
  assert.equal(mathRow?.count, 3)
  const choiceRow = out.byQuestionType.find((r) => r.type === "选择题")
  assert.equal(choiceRow?.count, 2)
})

test("aggregateFileOverview handles empty input", () => {
  const out = aggregateFileOverview([])
  assert.equal(out.total, 0)
  assert.deepEqual(out.bySubject, [])
  assert.deepEqual(out.byQuestionType, [])
})

const SAMPLE_SCORES: ScoreEntry[] = [
  { id: "a1", subject: "数学", type: "homework", value: 80, max: 100, date: "2026-04-10" },
  { id: "a2", subject: "数学", type: "homework", value: 90, max: 100, date: "2026-04-17" },
  { id: "a3", subject: "数学", type: "homework", value: 70, max: 100, date: "2026-04-24" },
  { id: "a4", subject: "数学", type: "exam", value: 108, max: 120, date: "2026-05-01" },
  { id: "a5", subject: "英语", type: "homework", value: 85, max: 100, date: "2026-04-10" },
]

test("aggregateScores normalizes to 0-100 percentile and produces 4-week series", () => {
  const out = aggregateScores(SAMPLE_SCORES, "2026-05-07")
  const math = out.find((s) => s.subject === "数学")
  assert.ok(math)
  assert.equal(math!.weeklySeries.length, 4)
  assert.equal(math!.examLatest?.value, 108)
  assert.equal(math!.examLatest?.max, 120)
  // homeworkAvg averages only homework entries (80, 90, 70) = 80
  assert.equal(math!.homeworkAvg, 80)
})

test("aggregateScores fills missing weeks by carrying forward last value", () => {
  const sparse: ScoreEntry[] = [
    { id: "x1", subject: "数学", type: "homework", value: 60, max: 100, date: "2026-04-10" },
    // weeks 2-4 missing
  ]
  const out = aggregateScores(sparse, "2026-05-07")
  const math = out.find((s) => s.subject === "数学")
  assert.ok(math)
  assert.equal(math!.weeklySeries[0], 60)
  assert.equal(math!.weeklySeries[1], 60)
  assert.equal(math!.weeklySeries[2], 60)
  assert.equal(math!.weeklySeries[3], 60)
})

test("buildEmotionTrendSkeleton returns 4 entries each missing summary", () => {
  const skeleton = buildEmotionTrendSkeleton([
    { week: 1, dominant: "好奇" },
    { week: 2, dominant: "焦虑" },
    { week: 3, dominant: "平静" },
    { week: 4, dominant: "满足" },
  ])
  assert.equal(skeleton.length, 4)
  for (const entry of skeleton) {
    assert.equal(entry.summary, "")
    assert.ok(["好奇", "焦虑", "平静", "满足"].includes(entry.dominant))
  }
})

test("countActiveDays counts unique date entries from scores", () => {
  const days = countActiveDays(SAMPLE_SCORES)
  assert.equal(days, 4) // 4 distinct dates: 04-10, 04-17, 04-24, 05-01
})
