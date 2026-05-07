import test from "node:test"
import assert from "node:assert/strict"

import {
  buildMockGrowthReport,
  buildMockWrongQuestionReport,
} from "./mockReports.ts"

test("buildMockWrongQuestionReport returns a complete WrongQuestionReport shape (V3)", () => {
  const r = buildMockWrongQuestionReport()
  assert.equal(r.windowDays, 30)
  assert.equal(typeof r.generatedAt, "string")
  assert.ok(r.progressSignal.length > 0, "progressSignal must be non-empty")

  // focusPicks: 1-2, each with goal/stepDiagnosis/closingLine/tasks
  assert.ok(r.focusPicks.length >= 1 && r.focusPicks.length <= 2, `focusPicks length ${r.focusPicks.length}`)
  for (let i = 0; i < r.focusPicks.length; i++) {
    const fp = r.focusPicks[i]
    assert.ok(fp.goal.length > 0, `focusPicks[${i}].goal empty`)
    assert.ok(fp.stepDiagnosis.length > 0, `focusPicks[${i}].stepDiagnosis empty`)
    assert.ok(fp.closingLine.length > 0, `focusPicks[${i}].closingLine empty`)
    assert.ok(fp.tasks.length >= 1 && fp.tasks.length <= 3, `tasks length`)
    let hasReDo = false
    for (let j = 0; j < fp.tasks.length; j++) {
      const t = fp.tasks[j]
      assert.equal(t.id, `focus-${i}-task-${j}`, `task id`)
      assert.ok(t.text.length > 0)
      assert.ok(typeof t.durationMinutes === "number" && t.durationMinutes > 0, `durationMinutes`)
      if (t.isReDo) hasReDo = true
    }
    assert.ok(hasReDo, `focusPicks[${i}] must have at least one isReDo task (retrieval practice)`)
    assert.ok(Array.isArray(fp.fileRefs))
  }

  // weeklyTrend
  assert.equal(r.weeklyTrend.series.length, 4)
  for (let i = 0; i < 4; i++) {
    assert.equal(r.weeklyTrend.series[i].week, (i + 1) as 1 | 2 | 3 | 4)
  }
  assert.ok(r.weeklyTrend.summary.length > 0)

  // weakPoints
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

test("buildMockWrongQuestionReport contains no banned diagnostic-report words", () => {
  // V3 hard constraint: 学生口径
  const r = buildMockWrongQuestionReport()
  const banned = ["症结", "正确率", "弱科", "需要加强", "薄弱知识点", "优先级"]
  const allText = JSON.stringify(r)
  for (const word of banned) {
    assert.equal(allText.includes(word), false, `mock should not contain "${word}" (V3 banned word)`)
  }
})
