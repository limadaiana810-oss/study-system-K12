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

test("buildMockWrongQuestionReport V4 new fields: gapSignal and todayPick", () => {
  const r = buildMockWrongQuestionReport()
  // gapSignal
  assert.equal(r.gapSignal, "物理单位换算又冒头，第 3 次了")
  // todayPick fields
  assert.equal(r.todayPick.taskText, "5 分钟，重做 4/12 那道二次函数")
  assert.equal(r.todayPick.durationMinutes, 5)
  assert.equal(r.todayPick.whyLine, "上次你把 h = -2 写成了 2")
  assert.equal(r.todayPick.taskId, "focus-0-task-0")
  assert.ok(r.todayPick.fileRef.includes("数学-错题-2026-04-12"), `fileRef should contain "数学-错题-2026-04-12", got: ${r.todayPick.fileRef}`)
  // consistency: todayPick.taskId must equal focusPicks[0].tasks[0].id
  assert.equal(r.todayPick.taskId, r.focusPicks[0].tasks[0].id, "todayPick.taskId must match focusPicks[0].tasks[0].id")
})

test("buildMockWrongQuestionReport contains no V4 banned words", () => {
  const r = buildMockWrongQuestionReport()
  const allText = JSON.stringify(r)
  // V4 new banned words (each catches family of variants)
  const banned = ["稳", "节奏", "拆", "提升", "持续", "整体呈", "立即", "马上"]
  for (const word of banned) {
    assert.equal(allText.includes(word), false, `mock should not contain "${word}" (V4 banned word)`)
  }
})

test("buildMockWrongQuestionReport V4 updated fields: progressSignal / stepDiagnosis / closingLine / summary", () => {
  const r = buildMockWrongQuestionReport()
  assert.equal(r.progressSignal, "这周错题从 5 道降到 1 道")
  assert.equal(r.focusPicks[0].stepDiagnosis, "4/12 那道，你顶点写对了，但 h = -2 写成了 2。这一翻，整道题就走偏了。")
  assert.ok(r.focusPicks[0].closingLine.includes("后面就不会跑偏"), `closingLine should contain "后面就不会跑偏", got: ${r.focusPicks[0].closingLine}`)
  assert.equal(r.weeklyTrend.summary, "从 W2 最高的 5 道，到这周只错 1 道。W2 那周数学连错三天，后面两周缓过来了。")
})
