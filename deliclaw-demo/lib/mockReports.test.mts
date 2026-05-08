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

  // focusPicks: V5 fixed at 3 (high-freq + high-weight picks)
  assert.equal(r.focusPicks.length, 3, `focusPicks length ${r.focusPicks.length}`)
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
    // V5: errorCount + examWeightLabel
    assert.equal(typeof fp.errorCount, "number", `focusPicks[${i}].errorCount type`)
    assert.ok(fp.errorCount > 0, `focusPicks[${i}].errorCount must be > 0`)
    assert.equal(typeof fp.examWeightLabel, "string", `focusPicks[${i}].examWeightLabel type`)
    assert.ok(fp.examWeightLabel.length > 0, `focusPicks[${i}].examWeightLabel empty`)
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

test("buildMockWrongQuestionReport V5 progressSignal includes both result and method", () => {
  const r = buildMockWrongQuestionReport()
  // V5: progressSignal must convey BOTH the result AND the method/cause
  assert.ok(
    r.progressSignal.includes("1 道") && r.progressSignal.includes("5 道"),
    `progressSignal should reference both this-week (1 道) and month-peak (5 道), got: ${r.progressSignal}`,
  )
  assert.ok(
    r.progressSignal.includes("打卡") || r.progressSignal.includes("啃下来") || r.progressSignal.includes("攻下来"),
    `progressSignal should include the method (打卡/啃下来/攻下来), got: ${r.progressSignal}`,
  )
})

test("buildMockWrongQuestionReport: weeklyTrend.series sum equals weakPoints occurrences sum", () => {
  // MECE check: 趋势图总和必须等于 weakPoints 总和（饼图 + footer 都基于 weakPoints）
  const r = buildMockWrongQuestionReport()
  const trendSum = r.weeklyTrend.series.reduce((s, p) => s + p.count, 0)
  const weakSum = r.weakPoints.reduce((s, w) => s + w.occurrences, 0)
  assert.equal(trendSum, weakSum, `weeklyTrend sum (${trendSum}) must equal weakPoints sum (${weakSum})`)
})

test("buildMockWrongQuestionReport V5: 3 focusPicks selected by frequency × exam weight", () => {
  const r = buildMockWrongQuestionReport()
  // 二次函数 + 物理单位换算 + 物理电路图
  const subjects = r.focusPicks.map((fp) => fp.subject)
  assert.equal(subjects.filter((s) => s === "数学").length, 1, "should have 1 数学 pick")
  assert.equal(subjects.filter((s) => s === "物理").length, 2, "should have 2 物理 picks")
  // 数学 pick should have highest errorCount
  const math = r.focusPicks.find((fp) => fp.subject === "数学")
  assert.ok(math && math.errorCount >= 4, `数学 pick should have errorCount >= 4, got: ${math?.errorCount}`)
})

test("buildMockWrongQuestionReport stepDiagnosis matches V4 wording", () => {
  const r = buildMockWrongQuestionReport()
  assert.equal(r.focusPicks[0].stepDiagnosis, "4/12 那道，你顶点写对了，但 h = -2 写成了 2。这一翻，整道题就走偏了。")
  assert.equal(r.weeklyTrend.summary, "从 W2 最高的 5 道，到这周只错 1 道。W2 那周数学连错三天，后面两周追回来了。")
})
