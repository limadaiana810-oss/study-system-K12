import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const SOURCE = fs.readFileSync(
  path.join(process.cwd(), "components", "GrowthReportView.tsx"),
  "utf8",
)

test("GrowthReportView is a client component", () => {
  assert.match(SOURCE, /^["']use client["']/m)
})

test("V19: source consumes the data-driven 3-block contract", () => {
  assert.match(SOURCE, /report\.weekWork/)
  assert.match(SOURCE, /report\.progressAssessment/)
  assert.match(SOURCE, /report\.recommendation/)
  for (const old of [
    "informationOrganized",
    "interestingQuestions",
    "emotionalState",
    "metaCognition",
    "topInsight",
    "trajectory",
    "scores",
    "highlights",
    "parentAdvice",
    "dataSource",
    "relaxBriefing",
    "tutoringDecision",
    "parentCommunication",
    "learningAbility",
    "tonightDosLines",
    "tonightDontsLines",
    "relaxReason",
  ]) {
    assert.doesNotMatch(SOURCE, new RegExp(`report\\.${old}|\\b${old}\\b`), `V19 dropped ${old}`)
  }
})

test("V19: 3 个 block 标题（用户视角，新版）", () => {
  assert.match(SOURCE, /小迪这周做了什么/)
  assert.match(SOURCE, /小凯的进步/)
  assert.match(SOURCE, /我的建议/)
  // 旧标题清退
  assert.doesNotMatch(SOURCE, /小凯这一阶段在涨什么/)
  assert.doesNotMatch(SOURCE, /今晚怎么和小凯开口/)
})

test("V19: Block 2/3 子卡组件（数据驱动）", () => {
  // Block 1 (保留)
  assert.match(SOURCE, /function KnowledgePointsResolvedCard/)
  // Block 2 (替换)
  assert.match(SOURCE, /function SubjectProgressCard/)
  // Block 3 (新两件)
  assert.match(SOURCE, /function StudyAdviceCard/)
  assert.match(SOURCE, /function CommunicationApproachCard/)
})

test("V19: 砍掉的子卡组件不再存在", () => {
  for (const dropped of [
    "InformationOrganizedCard",
    "InterestingQuestionsCard",
    "ProgressDimensionList",
    "TopInsight",
    "HeroCard",
    "BackupSection",
    "HomeworkExamErrorChart",
    "ScoreErrorChart",
    "EmotionTrendCard",
    "TrajectoryCard",
    "HighlightsCard",
    "ParentAdviceCard",
    "DataSourceLine",
    "RelaxBriefing",
    "TutoringDecision",
    "LearningAbilityCard",
    "RelaxReasonCard",
    "ThisWeekActionCard",
    "TonightScriptCard",
  ]) {
    const re = new RegExp(`function ${dropped}\\b`)
    assert.doesNotMatch(SOURCE, re, `V19 dropped function ${dropped}`)
  }
})

test("V19: 子卡 chrome（用户视角）", () => {
  assert.match(SOURCE, /这周帮小凯过的几道关/)
  assert.match(SOURCE, /按学科看走向/)
  assert.match(SOURCE, /学习建议/)
  assert.match(SOURCE, /沟通方式/)
})

test("V21: 沟通方式 三段结构 chrome = 小孩的情绪 / Alpha 世代 / 不同年龄段", () => {
  // ① 小孩的情绪 / ② Alpha 世代沟通 / ③ 不同年龄段沟通策略
  assert.match(SOURCE, /小孩的情绪/)
  assert.match(SOURCE, /Alpha 世代沟通/)
  assert.match(SOURCE, /不同年龄段沟通策略/)
  // 今晚台词附在 ③ 内
  assert.match(SOURCE, /今晚怎么开口/)
  // V20 旧标题已退役
  assert.doesNotMatch(SOURCE, /小凯的情况/)
  assert.doesNotMatch(SOURCE, /沟通原则/)
  assert.doesNotMatch(SOURCE, /今晚的策略/)
  assert.doesNotMatch(SOURCE, /为什么这样沟通/)
})

test("V21: 沟通方式 字段绑定 = childEmotion / alphaGenContext / developmentalStrategy", () => {
  assert.match(SOURCE, /childEmotion/)
  assert.match(SOURCE, /alphaGenContext/)
  assert.match(SOURCE, /developmentalStrategy/)
  assert.match(SOURCE, /ageBrackets/)
  assert.match(SOURCE, /tonightLines/)
  assert.match(SOURCE, /isCurrent/)
  // 旧绑定退役
  assert.doesNotMatch(SOURCE, /approach\.situation/)
  assert.doesNotMatch(SOURCE, /approach\.theory/)
  assert.doesNotMatch(SOURCE, /approach\.strategy\b/)
})

test("V19: SubjectProgressCard 渲染数据驱动四件 + insufficient 容错", () => {
  // 四件数据线必须被引用
  assert.match(SOURCE, /dataObservation/)
  assert.match(SOURCE, /errorPattern/)
  assert.match(SOURCE, /rootCause/)
  assert.match(SOURCE, /scoreContext/)
  // insufficient 容错路径
  assert.match(SOURCE, /insufficient-data/)
  assert.match(SOURCE, /insufficientNote/)
})

test("V19: BlockHeading + SubCard 仍然存在", () => {
  assert.match(SOURCE, /function BlockHeading/)
  assert.match(SOURCE, /function SubCard/)
})

test("V19: italic English subtitles 用 design tokens", () => {
  assert.match(SOURCE, /var\(--font-display\)/)
  assert.match(SOURCE, /what i did this week|his progress|my recommendation/)
})

test("V19: chrome banlist — 不含 V4 报告腔", () => {
  for (const word of ["节奏", "提升", "持续", "立即", "马上"]) {
    assert.doesNotMatch(SOURCE, new RegExp(word))
  }
})

test("V19: chrome 完全不含「孩子」+ 短语级机构口径", () => {
  assert.doesNotMatch(SOURCE, /孩子/)
  for (const phrase of ["陪他", "他这个月", "看他"]) {
    assert.doesNotMatch(SOURCE, new RegExp(phrase))
  }
})

test("V19: chrome banlist — 不含 AI 鼓励废话", () => {
  for (const phrase of ["建议鼓励", "适当补习", "孩子需要", "不必担心"]) {
    assert.doesNotMatch(SOURCE, new RegExp(phrase))
  }
})
