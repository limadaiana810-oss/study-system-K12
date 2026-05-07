import test from "node:test"
import assert from "node:assert/strict"

import {
  buildMockGrowthReport,
  buildMockWrongQuestionReport,
} from "./mockReports.ts"

test("buildMockWrongQuestionReport returns a complete WrongQuestionReport shape (V2)", () => {
  const r = buildMockWrongQuestionReport()
  assert.equal(r.windowDays, 30)
  assert.equal(typeof r.generatedAt, "string")
  assert.equal(r.overview.total, 12)
  assert.ok(r.overview.bySubject.length >= 3)
  assert.ok(r.overview.byQuestionType.length >= 2)

  // focusPicks: exactly 2, each with stable id and 2 tasks
  assert.equal(r.focusPicks.length, 2)
  for (let i = 0; i < r.focusPicks.length; i++) {
    const fp = r.focusPicks[i]
    assert.ok(["高", "中"].includes(fp.priority), `priority ${fp.priority} not allowed`)
    assert.ok(fp.diagnosis.length > 0)
    assert.ok(fp.expectedOutcome.length > 0)
    assert.equal(fp.tasks.length, 2)
    for (let j = 0; j < fp.tasks.length; j++) {
      assert.equal(fp.tasks[j].id, `focus-${i}-task-${j}`)
      assert.ok(fp.tasks[j].text.length > 0)
    }
    assert.ok(Array.isArray(fp.fileRefs))
  }

  // weeklyTrend: 4 weeks ascending, sum == overview.total
  assert.equal(r.weeklyTrend.series.length, 4)
  const sum = r.weeklyTrend.series.reduce((acc, p) => acc + p.count, 0)
  assert.equal(sum, r.overview.total)
  for (let i = 0; i < 4; i++) {
    assert.equal(r.weeklyTrend.series[i].week, (i + 1) as 1 | 2 | 3 | 4)
  }
  assert.ok(r.weeklyTrend.summary.length > 0)

  // weakPoints: still present as fallback list
  assert.ok(r.weakPoints.length >= 1 && r.weakPoints.length <= 5)
})

test("buildMockGrowthReport returns a complete GrowthReport shape with 4 weeks", () => {
  const r = buildMockGrowthReport()
  assert.equal(r.windowDays, 30)
  assert.equal(typeof r.generatedAt, "string")
  assert.equal(r.emotionTrend.length, 4)
  for (let i = 0; i < 4; i++) {
    assert.equal(r.emotionTrend[i].week, (i + 1) as 1 | 2 | 3 | 4)
    assert.ok(r.emotionTrend[i].summary.length > 0, `week ${i + 1} summary empty`)
  }
  assert.ok(r.scores.length >= 1)
  for (const s of r.scores) {
    assert.equal(s.weeklySeries.length, 4)
  }
  assert.ok(r.highlights.length >= 1)
  assert.ok(r.parentAdvice.strengthen.length >= 1)
  assert.ok(r.parentAdvice.remind.length >= 1)
  assert.ok(r.parentAdvice.encourage.length >= 1)
})

test("buildMockGrowthReport's score chart reflects the crafted math dip+recovery narrative", () => {
  const r = buildMockGrowthReport()
  const math = r.scores.find((s) => s.subject === "数学")
  assert.ok(math, "数学 should be present in mock scores")
  // Week index 0 = oldest, 3 = newest. Math should dip in the middle and recover at the end.
  // Don't pin exact numbers (mock scores are date-relative); just verify the directional story.
  assert.ok(math!.weeklySeries[3] > math!.weeklySeries[1], "数学 week 4 should exceed week 2 (recovery story)")
})
