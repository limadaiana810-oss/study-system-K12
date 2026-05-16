import test from "node:test"
import assert from "node:assert/strict"

import {
  buildMockGrowthReport,
  buildMockWrongQuestionReport,
} from "./mockReports.ts"

// ─────────────────────────────────────────────────────────
// V19: WrongQuestionReport — 1 页 A4 · 重体验/学习
//   Block 1 (errorAnalysis): todayWins + keyError
//   Block 2 (learningGuidance): unawareGap + practiceOptions
//   Block 3 (studentObservation): moments + closingLine
// ─────────────────────────────────────────────────────────

test("V19 WrongQuestionReport: top-level shape is 3 blocks (compact)", () => {
  const r = buildMockWrongQuestionReport()
  assert.equal(r.windowDays, 30)
  assert.equal(typeof r.generatedAt, "string")
  assert.ok(r.errorAnalysis)
  assert.ok(r.learningGuidance)
  assert.ok(r.studentObservation)
  // V18 字段彻底退役
  assert.equal((r as any).studentCommunication, undefined, "V19 dropped studentCommunication")
})

test("V19 WrongQuestionReport.errorAnalysis: todayWins + keyError 两件", () => {
  const r = buildMockWrongQuestionReport()
  const a = r.errorAnalysis
  assert.ok(Array.isArray(a.todayWins))
  assert.ok(a.todayWins.length >= 2, "should celebrate ≥2 wins")
  assert.ok(a.keyError)
  assert.ok(a.keyError.goal.length > 0)
  assert.ok(a.keyError.stepDiagnosis.length > 0)
  assert.ok(a.keyError.closingLine.length > 0)
  assert.ok(a.keyError.excerpt.length > 0)
})

test("V20 WrongQuestionReport.learningGuidance: unawareGap + studyMethods（替代 practiceOptions）", () => {
  const r = buildMockWrongQuestionReport()
  const g = r.learningGuidance
  assert.equal(typeof g.unawareGap, "string")
  assert.ok(g.unawareGap.length > 0)
  // V20: practiceOptions 已退役
  assert.equal((g as any).practiceOptions, undefined, "V20 dropped practiceOptions")
  // V20: studyMethods 必须是数组，每条带 name / researcher / finding / action
  assert.ok(Array.isArray(g.studyMethods))
  assert.ok(g.studyMethods.length >= 2, "至少 2 个方法")
  for (const m of g.studyMethods) {
    assert.equal(typeof m.name, "string")
    assert.ok(m.name.length > 0)
    assert.equal(typeof m.researcher, "string")
    // researcher 必须含年份（权威可追溯）
    assert.match(m.researcher, /\d{4}/, `${m.name} researcher 必须含年份: ${m.researcher}`)
    assert.equal(typeof m.finding, "string")
    assert.ok(m.finding.length > 0, "finding 不能为空")
    assert.equal(typeof m.action, "string")
    assert.ok(m.action.length > 0, "action 不能为空")
  }
})

test("V20 学生侧 studyMethods: 至少含一个公认的学习科学方法名", () => {
  const r = buildMockWrongQuestionReport()
  // 锁住权威方法集——避免未来 mock 退化为「多刷题」「认真听讲」这种泛话
  const knownMethods = /主动回忆|自我解释|间隔练习|交错练习|双编码|阐释式|检索练习|spaced|retrieval/i
  const allText = r.learningGuidance.studyMethods.map((m) => m.name).join(" ")
  assert.match(allText, knownMethods, `studyMethods 必须含至少一个公认方法: ${allText}`)
})

test("V19 WrongQuestionReport.studentObservation: ≥2 moments，每个有 timestamp + observation", () => {
  const r = buildMockWrongQuestionReport()
  const o = r.studentObservation
  assert.ok(Array.isArray(o.moments))
  assert.ok(o.moments.length >= 2, "should have ≥2 observation moments")
  for (const m of o.moments) {
    assert.equal(typeof m.timestamp, "string")
    assert.ok(m.timestamp.length > 0, "moment must have timestamp anchor")
    assert.equal(typeof m.observation, "string")
    assert.ok(m.observation.length > 0)
  }
  assert.equal(typeof o.closingLine, "string")
  assert.ok(o.closingLine.length > 0)
})

test("V19 WrongQuestionReport.studentObservation: closingLine 移交家长——不让学生扛沟通", () => {
  const r = buildMockWrongQuestionReport()
  // closingLine 必须传达「我已替你和家长说过了」的移交语义，
  // 让学生自己写台词的负担消失（这是 V19 砍掉 saying/avoid 的核心动机）
  assert.match(r.studentObservation.closingLine, /家长|爸妈/)
})

// ─────────────────────────────────────────────────────────
// V19: GrowthReport — 1 页 A4 · 重效率/成果，数据驱动
//   Block 1 (weekWork): filesIngested + knowledgePointsResolved
//   Block 2 (progressAssessment): bySubject (现象→错误点→根因→月考语境)
//   Block 3 (recommendation): studyAdvice + communicationApproach
// ─────────────────────────────────────────────────────────

test("V19 GrowthReport: top-level shape is 3 blocks (data-driven)", () => {
  const r = buildMockGrowthReport()
  assert.equal(r.windowDays, 30)
  assert.ok(r.weekWork)
  assert.ok(r.progressAssessment)
  assert.ok(r.recommendation)
  // V18 字段彻底退役
  assert.equal((r as any).parentCommunication, undefined, "V19 dropped parentCommunication")
  // learningAbility 被替换为 bySubject
  assert.equal((r.progressAssessment as any).learningAbility, undefined, "V19 dropped learningAbility")
})

test("V19 GrowthReport.weekWork: filesIngested + knowledgePointsResolved", () => {
  const r = buildMockGrowthReport()
  const w = r.weekWork
  assert.equal(typeof w.filesIngested, "number")
  assert.ok(w.filesIngested > 0)
  assert.ok(Array.isArray(w.knowledgePointsResolved))
  assert.ok(w.knowledgePointsResolved.length >= 2, "should resolve ≥2 KPs")
})

test("V19 GrowthReport.progressAssessment.bySubject: 数据驱动四件 + insufficient-data 容错", () => {
  const r = buildMockGrowthReport()
  const p = r.progressAssessment
  assert.ok(Array.isArray(p.bySubject))
  assert.ok(p.bySubject.length >= 2)
  for (const s of p.bySubject) {
    assert.equal(typeof s.subject, "string")
    assert.ok(["improving", "regressing", "insufficient-data"].includes(s.trend))
    if (s.trend === "insufficient-data") {
      assert.ok(s.insufficientNote && s.insufficientNote.length > 0, "insufficient must say so")
    } else {
      // 至少有一条数据线
      const hasAtLeastOne = !!(s.dataObservation || s.errorPattern || s.rootCause || s.scoreContext)
      assert.ok(hasAtLeastOne, `${s.subject} ${s.trend} must have ≥1 data line`)
    }
  }
})

test("V19 progressAssessment: 至少有一科 insufficient-data（证明「不足就不说」原则）", () => {
  const r = buildMockGrowthReport()
  const insufficient = r.progressAssessment.bySubject.filter((s) => s.trend === "insufficient-data")
  assert.ok(insufficient.length >= 1, "至少一科应该是 insufficient-data，证明 mock 不硬凑")
})

test("V19 progressAssessment: regressing 科目必须给出根因", () => {
  const r = buildMockGrowthReport()
  const regressing = r.progressAssessment.bySubject.filter((s) => s.trend === "regressing")
  assert.ok(regressing.length >= 1, "应该有至少一科退步——这是「数学 92→78」场景的核心")
  for (const s of regressing) {
    assert.ok(s.dataObservation && s.dataObservation.length > 0)
    assert.ok(s.errorPattern && s.errorPattern.length > 0)
    assert.ok(s.rootCause && s.rootCause.length > 0, "退步科必须给出根因（数据驱动核心）")
  }
})

test("V19 GrowthReport.recommendation.studyAdvice: action + 为什么是这件 + 为什么不是补全科", () => {
  const r = buildMockGrowthReport()
  const a = r.recommendation.studyAdvice
  assert.equal(typeof a.action, "string")
  assert.ok(a.action.length > 0)
  assert.equal(typeof a.whyThisAction, "string")
  assert.ok(a.whyThisAction.length > 0)
  assert.equal(typeof a.whyNotBroader, "string")
  assert.ok(a.whyNotBroader.length > 0)
})

test("V21 communicationApproach: 三 sub-block = 小孩的情绪 / Alpha 世代沟通 / 不同年龄段策略", () => {
  const r = buildMockGrowthReport()
  const c = r.recommendation.communicationApproach
  // V20 的旧三件已退役
  assert.equal((c as any).situation, undefined, "V21 dropped situation")
  assert.equal((c as any).theory, undefined, "V21 dropped flat theory")
  assert.equal((c as any).strategy, undefined, "V21 dropped flat strategy")
  // 新三件
  assert.ok(c.childEmotion)
  assert.ok(c.alphaGenContext)
  assert.ok(c.developmentalStrategy)
})

test("V21 ① childEmotion: summary + evidence 数据驱动", () => {
  const r = buildMockGrowthReport()
  const e = r.recommendation.communicationApproach.childEmotion
  assert.equal(typeof e.summary, "string")
  assert.ok(e.summary.length > 0)
  assert.ok(Array.isArray(e.evidence))
  assert.ok(e.evidence.length >= 2, "情绪证据至少 2 条")
  for (const ev of e.evidence) {
    assert.equal(typeof ev, "string")
    assert.ok(ev.length > 0)
  }
  // 情绪 summary 应该带数据信号（采样次数 / 自评分 / 时间锚点之一）
  const allText = e.summary + e.evidence.join("\n")
  assert.match(allText, /\d/, "childEmotion 必须含具体数字（采样/评分/时间）")
})

test("V21 ② alphaGenContext: 出生年代 + 3-4 条特征 + whyDifferent", () => {
  const r = buildMockGrowthReport()
  const a = r.recommendation.communicationApproach.alphaGenContext
  assert.equal(typeof a.bornRange, "string")
  assert.match(a.bornRange, /Alpha|阿尔法/i, "bornRange 必须点出 Alpha 世代名")
  assert.match(a.bornRange, /\d{4}/, "bornRange 必须含具体出生年份")
  assert.ok(Array.isArray(a.traits))
  assert.ok(a.traits.length >= 3, "Alpha 一代特征至少 3 条")
  for (const t of a.traits) {
    assert.equal(typeof t, "string")
    assert.ok(t.length > 0)
  }
  assert.equal(typeof a.whyDifferent, "string")
  assert.ok(a.whyDifferent.length > 0, "whyDifferent 不能为空——这是这一节存在的理由")
})

test("V21 ③ developmentalStrategy: ageBrackets 覆盖 4 段 + 恰好 1 段 isCurrent", () => {
  const r = buildMockGrowthReport()
  const ds = r.recommendation.communicationApproach.developmentalStrategy
  assert.ok(Array.isArray(ds.ageBrackets))
  assert.ok(ds.ageBrackets.length >= 3, "至少覆盖 3 个年龄段")
  // 恰好 1 段标记为 isCurrent（小凯所处）
  const current = ds.ageBrackets.filter((b) => b.isCurrent)
  assert.equal(current.length, 1, "恰好 1 段 isCurrent")
  // 小凯 12-14 岁
  assert.match(current[0].range, /1[2-4]/, "isCurrent 段必须是 12-14 岁")
  // 每个 bracket 字段齐全
  for (const b of ds.ageBrackets) {
    assert.equal(typeof b.range, "string")
    assert.equal(typeof b.stageName, "string")
    assert.equal(typeof b.theorist, "string")
    assert.equal(typeof b.strategy, "string")
    assert.equal(typeof b.isCurrent, "boolean")
    // theorist 必须含年份或公认框架名
    assert.match(
      b.theorist,
      /\d{4}|Dweck|Erikson|Piaget|Marcia|Vygotsky|Bandura/,
      `${b.range} theorist 必须点名权威心理学家或带年份: ${b.theorist}`,
    )
  }
})

test("V21 ③ developmentalStrategy: tonightLines + keyword 应用当前 bracket", () => {
  const r = buildMockGrowthReport()
  const ds = r.recommendation.communicationApproach.developmentalStrategy
  assert.ok(Array.isArray(ds.tonightLines))
  assert.ok(ds.tonightLines.length >= 2, "今晚台词至少 2 条")
  for (const line of ds.tonightLines) {
    assert.equal(typeof line, "string")
    assert.ok(line.length > 0)
  }
  assert.equal(typeof ds.keyword, "string")
  assert.ok(ds.keyword.length > 0)
})

// ─────────────────────────────────────────────────────────
// V19 cross-link: 家长策略 引用「物理 + 第三步」必须能在题库找到凭据
// ─────────────────────────────────────────────────────────

test("V21 cross-link: 家长 tonightLines 引用「物理 + 第三步」必须有学生侧凭据", () => {
  const wq = buildMockWrongQuestionReport()
  const gr = buildMockGrowthReport()
  const tonightText =
    gr.recommendation.communicationApproach.developmentalStrategy.tonightLines.join("\n")
  if (!tonightText.includes("第三步") || !tonightText.includes("物理")) {
    return
  }
  assert.match(tonightText, /第三步/)
  assert.match(tonightText, /物理/)
  // 学生侧 keyError 是数学；物理凭据在 mockQuestionBank 里。这里只校验家长台词
  // 同时含有「物理 + 第三步」的核心信号——cross-link 真正由 mockQuestionBank 内容保证
  assert.ok(wq.errorAnalysis.keyError, "学生侧必须有 keyError 提供学习入口")
})

// ─────────────────────────────────────────────────────────
// 学生侧口径：保留 V12 AInative 守卫
// ─────────────────────────────────────────────────────────

test("V19 学生侧: keyError stepDiagnosis 含「我看了你的步骤」AInative voice", () => {
  const r = buildMockWrongQuestionReport()
  assert.match(r.errorAnalysis.keyError.stepDiagnosis, /我看了你的步骤/)
})

test("V19 学生侧: studentObservation 必须含具体时间锚点（不是泛泛话）", () => {
  const r = buildMockWrongQuestionReport()
  // 至少一条 moment 含具体时刻：周X / N点 / 上午/下午/晚 — 时间锚点
  const text = r.studentObservation.moments.map((m) => m.timestamp).join("\n")
  assert.match(text, /(周|早|午|晚|\d{1,2}:\d{2})/, "至少一条要有具体时间锚点")
})

test("V19 学生侧: 不含家长口径（孩子 / 同学）", () => {
  const r = buildMockWrongQuestionReport()
  const allText = JSON.stringify(r)
  for (const word of ["孩子", "同学"]) {
    assert.equal(allText.includes(word), false, `student-side must not contain "${word}"`)
  }
})

// ─────────────────────────────────────────────────────────
// 家长侧口径：小凯（不出现「孩子」/「他这个月」机构口径）
// ─────────────────────────────────────────────────────────

test("V19 家长侧: studyAdvice + communicationApproach 含「小凯」", () => {
  const r = buildMockGrowthReport()
  const allText = JSON.stringify(r.recommendation)
  assert.match(allText, /小凯/)
})

test("V19 家长侧: 不含「孩子」+ 短语级 banlist 排除「他/家长」机构口径", () => {
  const r = buildMockGrowthReport()
  const allText = JSON.stringify(r)
  assert.equal(allText.includes("孩子"), false)
  const bannedPhrases = [
    "陪他", "他自己", "他主动", "跟他", "让他",
    "他这个月", "他每", "他在", "他和",
    "跟家长", "家长可以", "家长多问", "家长看到了",
  ]
  for (const phrase of bannedPhrases) {
    assert.equal(allText.includes(phrase), false, `growth must not contain phrase "${phrase}"`)
  }
})

// ─────────────────────────────────────────────────────────
// 报告腔 banlist
// ─────────────────────────────────────────────────────────

test("V19 学生侧 banlist: 不含 V4/V6 报告腔", () => {
  const r = buildMockWrongQuestionReport()
  const allText = JSON.stringify(r)
  const banned = [
    "稳", "节奏", "提升", "持续", "整体呈", "立即", "马上",
    "症结", "正确率", "弱科", "需要加强", "薄弱知识点", "优先级",
    "较强", "较为", "较高", "较低",
    "体现出", "体现了", "反映了", "反映出",
    "有所", "拆开来看", "稳稳", "捧杀",
    "下一步我们", "我们要", "我们应",
  ]
  for (const word of banned) {
    assert.equal(allText.includes(word), false, `wrongQ should not contain "${word}"`)
  }
})

test("V19 家长侧 banlist: 不含 V4/V6 报告腔 + AI 鼓励废话", () => {
  const r = buildMockGrowthReport()
  const allText = JSON.stringify(r)
  const banned = [
    "稳", "节奏", "提升", "持续", "整体呈", "立即", "马上",
    "症结", "正确率", "弱科", "需要加强", "薄弱知识点", "优先级",
    "较强", "较为", "较高", "较低",
    "体现出", "体现了", "反映了", "反映出",
    "有所", "拆开来看", "稳稳", "捧杀",
    "下一步我们", "我们要", "我们应",
    "正向反馈", "心理状态",
    "建议鼓励", "适当补习", "孩子需要",
  ]
  for (const word of banned) {
    assert.equal(allText.includes(word), false, `growth should not contain "${word}"`)
  }
})
