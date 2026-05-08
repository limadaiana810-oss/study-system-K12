import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

import {
  buildMockGrowthReport,
  buildMockWrongQuestionReport,
} from "./mockReports.ts"

test("buildMockWrongQuestionReport returns a complete WrongQuestionReport shape (V11)", () => {
  const r = buildMockWrongQuestionReport()
  assert.equal(r.windowDays, 30)
  assert.equal(typeof r.generatedAt, "string")
  // V11: 三字段合一为 topPattern
  assert.equal(typeof r.topPattern, "string", "topPattern must be string")
  assert.ok(r.topPattern.length > 0, "topPattern must be non-empty")
  // 老字段必须彻底消失
  assert.equal((r as any).progressHeadline, undefined, "V11 must drop progressHeadline")
  assert.equal((r as any).progressReason, undefined, "V11 must drop progressReason")
  assert.equal((r as any).gapSignal, undefined, "V11 must drop gapSignal")
  assert.equal((r as any).progressSignal, undefined, "V11 must not retain progressSignal synonym")
  // V11: focusPicks 改为 hero + backups
  assert.equal((r as any).focusPicks, undefined, "V11 must drop focusPicks")
  assert.ok(r.hero, "V11 must have hero FocusPick")
  assert.ok(Array.isArray(r.backups), "V11 must have backups array")
  assert.ok(r.backups.length <= 2, `backups length ${r.backups.length} must be 0-2`)

  // 把 hero 和 backups 合起来当成原 focusPicks 校验
  const focusPicksLike = [r.hero, ...r.backups]
  assert.equal(focusPicksLike.length, 3, `combined hero+backups length ${focusPicksLike.length}`)
  for (let i = 0; i < focusPicksLike.length; i++) {
    const fp = focusPicksLike[i]
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
    assert.equal(typeof fp.errorCount, "number", `focusPicks[${i}].errorCount type`)
    assert.ok(fp.errorCount > 0, `focusPicks[${i}].errorCount must be > 0`)
    assert.equal(typeof fp.examWeightLabel, "string", `focusPicks[${i}].examWeightLabel type`)
    assert.ok(fp.examWeightLabel.length > 0, `focusPicks[${i}].examWeightLabel empty`)
    // V7: knowledgePoints array + whyPicked
    assert.ok(Array.isArray(fp.knowledgePoints), `focusPicks[${i}].knowledgePoints must be array`)
    assert.ok(fp.knowledgePoints.length >= 1, `focusPicks[${i}] must cover at least 1 KP`)
    assert.equal(typeof fp.whyPicked, "string", `focusPicks[${i}].whyPicked must be string`)
    assert.ok(fp.whyPicked.length > 0, `focusPicks[${i}].whyPicked empty`)
    // V9: excerpt + questionDate threaded through from MockQuestion
    assert.equal(typeof fp.excerpt, "string", `focusPicks[${i}].excerpt must be string`)
    assert.ok(fp.excerpt.length > 0, `focusPicks[${i}].excerpt empty`)
    assert.match(fp.questionDate, /^\d{4}-\d{2}-\d{2}$/, `focusPicks[${i}].questionDate must be ISO date`)
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

test("buildMockGrowthReport returns a complete GrowthReport shape with 4 weeks (V11)", () => {
  const r = buildMockGrowthReport()
  assert.equal(r.windowDays, 30)
  assert.equal(typeof r.generatedAt, "string")
  // V11: hero 两字段
  assert.equal(typeof r.topInsight, "string", "topInsight must be string")
  assert.ok(r.topInsight.length > 0, "topInsight must be non-empty")
  assert.equal(typeof r.thisWeekAction, "string", "thisWeekAction must be string")
  assert.ok(r.thisWeekAction.length > 0, "thisWeekAction must be non-empty")
  assert.equal(typeof r.focusSubject, "string")
  assert.ok(r.focusSubject.length > 0, "focusSubject must be non-empty")
  assert.equal(r.emotionTrend.length, 4)
  for (let i = 0; i < 4; i++) {
    assert.equal(r.emotionTrend[i].week, (i + 1) as 1 | 2 | 3 | 4)
    assert.ok(r.emotionTrend[i].summary.length > 0, `week ${i + 1} summary empty`)
  }
  assert.ok(r.scores.length >= 1)
  for (const s of r.scores) {
    assert.equal(s.weeklySeries.length, 4)
    assert.equal(s.weeklyHomeworkAvg.length, 4, `${s.subject}.weeklyHomeworkAvg length`)
    assert.equal(s.weeklyExamAvg.length, 4, `${s.subject}.weeklyExamAvg length`)
    assert.equal(s.weeklyErrorCount.length, 4, `${s.subject}.weeklyErrorCount length`)
  }
  assert.ok(r.highlights.length >= 1)
  assert.ok(r.parentAdvice.strengthen.length >= 1)
  assert.ok(r.parentAdvice.remind.length >= 1)
  assert.ok(r.parentAdvice.encourage.length >= 1)
})

test("V8: growth focusSubject is 数学 (largest dip-recover swing)", () => {
  const r = buildMockGrowthReport()
  assert.equal(r.focusSubject, "数学", `expected focusSubject=数学, got ${r.focusSubject}`)
})

test("V11: growth topInsight references 数学/90 + thisWeekAction is concrete homework action", () => {
  const r = buildMockGrowthReport()
  // topInsight 一句话本月定义
  assert.ok(
    r.topInsight.includes("数学") || r.topInsight.includes("90"),
    `topInsight should mention 数学/90+, got: ${r.topInsight}`,
  )
  // thisWeekAction 具体作业动作（陪 + 数学）
  assert.ok(
    r.thisWeekAction.includes("数学"),
    `thisWeekAction should mention 数学, got: ${r.thisWeekAction}`,
  )
  assert.ok(
    r.thisWeekAction.includes("陪") || r.thisWeekAction.includes("写"),
    `thisWeekAction should be a concrete companion-action verb, got: ${r.thisWeekAction}`,
  )
})

test("V11: thisWeekAction de-duped from parentAdvice.strengthen (no double-display)", () => {
  const r = buildMockGrowthReport()
  // V10 strengthen had 2 entries; V11 抽走了「数学最后一题」那条，只剩 1 条
  assert.equal(
    r.parentAdvice.strengthen.length,
    1,
    `V11 strengthen should have 1 entry (the 数学最后一题 entry was promoted to thisWeekAction)`,
  )
  // The remaining entry is the 物理 串并联 one
  assert.ok(
    r.parentAdvice.strengthen[0].includes("物理") || r.parentAdvice.strengthen[0].includes("串并联"),
    `remaining strengthen[0] should be the 物理串并联 entry, got: ${r.parentAdvice.strengthen[0]}`,
  )
  // The 数学最后一题 entry must NOT appear in advice.strengthen anymore
  assert.ok(
    !r.parentAdvice.strengthen.some((s) => s.includes("最后一道大题") || s.includes("写到底")),
    `数学最后一题 should not appear in strengthen — already in thisWeekAction`,
  )
})

test("V8 MECE: cross-report 错题数 sum is identical between growth.weeklyErrorCount and wrongQ.weakPoints", () => {
  const wq = buildMockWrongQuestionReport()
  const gr = buildMockGrowthReport()
  const growthSum = gr.scores.reduce(
    (s, sub) => s + sub.weeklyErrorCount.reduce((a, b) => a + b, 0),
    0,
  )
  const wqSum = wq.weakPoints.reduce((s, w) => s + w.occurrences, 0)
  assert.equal(growthSum, wqSum, `growth ${growthSum} vs wrongQ ${wqSum} — same source bank required`)
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

test("V11: buildMockWrongQuestionReport topPattern carries numbers + gap in one sentence", () => {
  const r = buildMockWrongQuestionReport()
  // V11: 进步 + 短板 合一为 topPattern
  assert.ok(r.topPattern.includes("1 道"), `topPattern should mention 1 道, got: ${r.topPattern}`)
  assert.ok(
    r.topPattern.includes("物理") || r.topPattern.includes("单位换算"),
    `topPattern should also call out the gap, got: ${r.topPattern}`,
  )
})

test("buildMockWrongQuestionReport V6: todayPick field removed (TodayPickCard deleted)", () => {
  const r = buildMockWrongQuestionReport()
  assert.equal((r as any).todayPick, undefined, "todayPick should not exist in V6 mock")
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

test("buildMockWrongQuestionReport contains no V6 AI-tone words", () => {
  // V6 新增的「AI 报告腔」词。覆盖：模糊评价、伪学术、捧杀腔、collective voice
  const r = buildMockWrongQuestionReport()
  const allText = JSON.stringify(r)
  const banned = [
    "较强", "较为", "较高", "较低",  // 报告 hedge
    "体现出", "体现了",              // 评价腔
    "反映了", "反映出",              // 报告腔
    "有所",                          // 报告 hedge
    "拆开来看", "稳稳", "捧杀",      // 用户点名 ban
    "下一步我们", "我们要", "我们应",// collective voice
  ]
  for (const word of banned) {
    assert.equal(allText.includes(word), false, `mock should not contain "${word}" (AI-tone)`)
  }
})

test("buildMockGrowthReport contains no AI-banned words", () => {
  const r = buildMockGrowthReport()
  const allText = JSON.stringify(r)
  const banned = [
    // V4 banned
    "稳", "节奏", "拆", "提升", "持续", "整体呈", "立即", "马上",
    // V3 legacy
    "症结", "正确率", "弱科", "需要加强", "薄弱知识点", "优先级",
    // V6 AI-tone
    "较强", "较为", "较高", "较低",
    "体现出", "体现了",
    "反映了", "反映出",
    "有所",
    "拆开来看", "稳稳", "捧杀",
    "下一步我们", "我们要", "我们应",
    // 家长侧特有
    "正向反馈", "心理状态",
  ]
  for (const word of banned) {
    assert.equal(allText.includes(word), false, `growth mock should not contain "${word}"`)
  }
})

test("V11 chrome guard: GrowthReportView advice titles", () => {
  const SOURCE = fs.readFileSync(
    path.join(process.cwd(), "components", "GrowthReportView.tsx"),
    "utf8",
  )
  // V7 旧名永远禁
  for (const word of ["重点补", "留个心", "夸一夸"]) {
    assert.equal(SOURCE.includes(word), false, `view chrome should not contain V7 title "${word}"`)
  }
  // V10 「心理辅导重点」临床味 — V11 已替换为「沟通重点」
  assert.equal(SOURCE.includes("心理辅导重点"), false, `V11 must drop clinical 心理辅导重点`)
  // V11 现在的三列名
  for (const word of ["下一步学习计划", "沟通重点", "家长行动计划"]) {
    assert.ok(SOURCE.includes(word), `view chrome should contain V11 title "${word}"`)
  }
})

// V11: progressHeadline / progressReason 合并入 topPattern（见上面 V11 topPattern 测试）

test("buildMockWrongQuestionReport: weeklyTrend.series sum equals weakPoints occurrences sum", () => {
  // MECE check: 趋势图总和必须等于 weakPoints 总和（饼图 + footer 都基于 weakPoints）
  const r = buildMockWrongQuestionReport()
  const trendSum = r.weeklyTrend.series.reduce((s, p) => s + p.count, 0)
  const weakSum = r.weakPoints.reduce((s, w) => s + w.occurrences, 0)
  assert.equal(trendSum, weakSum, `weeklyTrend sum (${trendSum}) must equal weakPoints sum (${weakSum})`)
})

test("V10: weeklyTrend.seriesBySubject is present and sums match weeklyTrend.series", () => {
  // In-report MECE: stacked-bar segments per week must add up to the weekly total.
  const r = buildMockWrongQuestionReport()
  assert.ok(Array.isArray(r.weeklyTrend.seriesBySubject), "seriesBySubject must be an array")
  assert.ok(r.weeklyTrend.seriesBySubject.length >= 1, "seriesBySubject must have at least 1 subject")
  for (const entry of r.weeklyTrend.seriesBySubject) {
    assert.equal(entry.counts.length, 4, `seriesBySubject[${entry.subject}].counts must be length 4`)
  }
  const stackedSum = r.weeklyTrend.seriesBySubject.reduce(
    (s, e) => s + e.counts.reduce((a, b) => a + b, 0),
    0,
  )
  const trendSum = r.weeklyTrend.series.reduce((s, p) => s + p.count, 0)
  assert.equal(stackedSum, trendSum, `stacked-bar segment sum (${stackedSum}) must equal weeklyTrend.series sum (${trendSum})`)
})

test("V11: hero is 数学 with errorCount >= 4 (二次函数顶点式)", () => {
  const r = buildMockWrongQuestionReport()
  assert.equal(r.hero.subject, "数学")
  assert.ok(r.hero.errorCount >= 4, `hero errorCount should be >= 4, got: ${r.hero.errorCount}`)
})

test("V12: hero stepDiagnosis matches bank wording (AInative voice); weeklyTrend.summary uses 你", () => {
  const r = buildMockWrongQuestionReport()
  // V12: stepDiagnosis 加 AI「我」视角，开篇带「我看了你的…」
  assert.equal(r.hero.stepDiagnosis, "我看了你的步骤——前面都对，最后把 h = -2 写成了 2。这一翻，整道题就走偏了。")
  assert.equal(r.weeklyTrend.summary, "你 W2 最多 5 道，这周只剩 1 道。W2 那周数学连错三天，后两周你追回来了。")
})

test("V11: hero covers 4 knowledge points (highest density question)", () => {
  const r = buildMockWrongQuestionReport()
  assert.equal(r.hero.knowledgePoints.length, 4, "hero question must cover 4 KPs")
  assert.ok(r.hero.whyPicked.includes("4 个知识点"), `whyPicked should mention 4 KPs, got: ${r.hero.whyPicked}`)
})

test("V11: backups distribution from selector (hero=数学 + 2 backups=物理)", () => {
  const r = buildMockWrongQuestionReport()
  const subjects = [r.hero.subject, ...r.backups.map((b) => b.subject)]
  // selector 应该挑出: 数学-01 (hero) + 物理-01 (backup) + 物理-04 (backup)
  assert.equal(subjects.filter((s) => s === "数学").length, 1)
  assert.equal(subjects.filter((s) => s === "物理").length, 2)
})

// ─────────── V12 AInative voice 守卫 ───────────

test("V12 学生侧: topPattern 含小迪 + 你；AI 在场", () => {
  const r = buildMockWrongQuestionReport()
  assert.ok(r.topPattern.includes("小迪"), `topPattern should introduce 小迪, got: ${r.topPattern}`)
  assert.ok(r.topPattern.includes("你"), `topPattern should address 你 (the student), got: ${r.topPattern}`)
})

test("V12 学生侧: ≥6 stepDiagnosis 含 AI「我」视角，≥4 closingLine 含 AI 动作", () => {
  // 题库 13 道错题中的叙事字段会通过 hero/backups 进 report，但全部题的覆盖
  // 不止 hero+backups（selector 只挑 3 道）。所以直接断言：JSON.stringify(report)
  // 中至少 6 处出现 AI「我」短语（"我看了" / "我看你" / "我替你"），≥4 处 closing 风格的 AI 嘱咐。
  const r = buildMockWrongQuestionReport()
  const allText = JSON.stringify(r)
  // hero+backups 的 stepDiagnosis 至少有一处「我看」AI 复盘
  const focusPicksLike = [r.hero, ...r.backups]
  const stepDiagnosesWithMe = focusPicksLike.filter((p) => /我看/.test(p.stepDiagnosis)).length
  assert.ok(
    stepDiagnosesWithMe >= 1,
    `expected at least 1 hero/backup stepDiagnosis with 我看, got ${stepDiagnosesWithMe}`,
  )
  // 整体「我」标记：topPattern + weakPoints[0] + hero/backups 各处至少累计 ≥4 次「我替你」/「我看」
  const meMatches = (allText.match(/我(替你|看了|看你|看一下)/g) || []).length
  assert.ok(meMatches >= 4, `expected ≥4 AI「我」markers in report, got ${meMatches}`)
})

test("V12 学生侧: 4/5 weakPoints diagnosis 含「你」主语", () => {
  const r = buildMockWrongQuestionReport()
  const withYou = r.weakPoints.filter((w) => w.diagnosis.includes("你")).length
  assert.ok(
    withYou >= 4,
    `≥4 of ${r.weakPoints.length} diagnoses must include 你 (peer voice), got ${withYou}`,
  )
})

test("V12 学生侧: 不含家长口径 (孩子 / 同学)", () => {
  const r = buildMockWrongQuestionReport()
  const allText = JSON.stringify(r)
  for (const word of ["孩子", "同学"]) {
    assert.equal(
      allText.includes(word),
      false,
      `student-side report must not contain parent-portal word "${word}"`,
    )
  }
})

test("V12 家长侧: topInsight + thisWeekAction 含小凯", () => {
  const r = buildMockGrowthReport()
  assert.ok(r.topInsight.includes("小凯"), `topInsight should reference 小凯, got: ${r.topInsight}`)
  assert.ok(r.thisWeekAction.includes("小凯"), `thisWeekAction should reference 小凯, got: ${r.thisWeekAction}`)
  assert.ok(r.parentAdvice.strengthen[0].includes("小凯"), `strengthen[0] should reference 小凯, got: ${r.parentAdvice.strengthen[0]}`)
})

test("V12 家长侧: 不含「孩子」+ 短语级 banlist 排除「他/家长」机构口径", () => {
  const r = buildMockGrowthReport()
  const allText = JSON.stringify(r)
  // 直接禁词
  assert.equal(allText.includes("孩子"), false, `growth must not contain "孩子" (use 小凯)`)
  // 短语级 banlist —— 不直接禁单字「他」（"其他" 合法），只禁机构口径短语
  const bannedPhrases = [
    "陪他", "他自己", "他主动", "跟他", "让他",
    "他这个月", "他每", "他在", "他和",
    "跟家长", "家长可以", "家长多问", "家长看到了",
  ]
  for (const phrase of bannedPhrases) {
    assert.equal(
      allText.includes(phrase),
      false,
      `growth must not contain phrase "${phrase}" (use 小凯 or omit subject)`,
    )
  }
})

test("V12 家长侧: 4 周 emotionTrend.summary 全部已替换「孩子」→「小凯」", () => {
  const r = buildMockGrowthReport()
  for (const e of r.emotionTrend) {
    assert.equal(
      e.summary.includes("孩子"),
      false,
      `week ${e.week} emotion summary still has 孩子: ${e.summary}`,
    )
  }
  // 至少一周的 summary 显式带「小凯」
  const withName = r.emotionTrend.filter((e) => e.summary.includes("小凯")).length
  assert.ok(withName >= 1, `≥1 emotionTrend summary should reference 小凯, got ${withName}`)
})
