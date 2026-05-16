import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const SOURCE = fs.readFileSync(
  path.join(process.cwd(), "components", "WrongQuestionReportView.tsx"),
  "utf8",
)

test("WrongQuestionReportView is a client component", () => {
  assert.match(SOURCE, /^["']use client["']/m)
})

test("V19: source consumes the new 3-block contract", () => {
  // top-level
  assert.match(SOURCE, /report\.errorAnalysis/)
  assert.match(SOURCE, /report\.learningGuidance/)
  assert.match(SOURCE, /report\.studentObservation/)
  // V18 / 旧版字段彻底退役
  for (const old of [
    "studentCommunication",
    "moreErrors",
    "patterns",
    "weeklyHint",
    "weekTotal",
    "bySubject",
    "transferDrill",
    "youAreNotScore",
    "parentSeesWhat",
    "keptPrivate",
    "weeklyTrend",
    "weakPoints",
  ]) {
    assert.doesNotMatch(SOURCE, new RegExp(`\\b${old}\\b`), `V19 dropped binding ${old}`)
  }
})

test("V19: 3 个 block 标题（用户视角）", () => {
  assert.match(SOURCE, /错题翻一遍/)
  assert.match(SOURCE, /下一阶段目标/)
  assert.match(SOURCE, /我的观察/)
  // 旧标题不能残留
  assert.doesNotMatch(SOURCE, /今晚怎么和爸妈说/)
})

test("V19: Block 3 子卡组件 = ObservationMomentsCard（替代 SayingCard）", () => {
  assert.match(SOURCE, /function ObservationMomentsCard/)
  // V18 SayingCard 已退役
  assert.doesNotMatch(SOURCE, /function SayingCard/)
})

test("V20: 5 个子卡组件总览（PracticeOptionsCard → StudyMethodsCard）", () => {
  assert.match(SOURCE, /function TodayWinsCard/)
  assert.match(SOURCE, /function KeyErrorCard/)
  assert.match(SOURCE, /function UnawareGapCard/)
  assert.match(SOURCE, /function StudyMethodsCard/)
  assert.match(SOURCE, /function ObservationMomentsCard/)
  // V19 的假选项卡退役
  assert.doesNotMatch(SOURCE, /function PracticeOptionsCard/)
})

test("V20: StudyMethodsCard 渲染 name + researcher + finding + action", () => {
  assert.match(SOURCE, /m\.name|method.*name/s)
  assert.match(SOURCE, /m\.researcher|method.*researcher/s)
  assert.match(SOURCE, /m\.finding|method.*finding/s)
  assert.match(SOURCE, /m\.action|method.*action/s)
})

test("V20: chrome 含「学习方法」", () => {
  assert.match(SOURCE, /学习方法/)
  // 旧 chrome 退役
  assert.doesNotMatch(SOURCE, /今天的选项/)
  assert.doesNotMatch(SOURCE, /your call/)
})

test("V20: 砍掉的子卡组件不再存在", () => {
  for (const dropped of [
    "WeekStatsRow",
    "MoreErrorsCard",
    "PatternsCard",
    "TransferDrillCard",
    "YouAreNotScoreCard",
    "ParentSeesWhatCard",
    "KeptPrivateCard",
    "QuestionEvidence",
    "LightboxModal",
    "SayingCard",
    "PracticeOptionsCard",
  ]) {
    assert.doesNotMatch(SOURCE, new RegExp(`function ${dropped}\\b`), `V20 dropped function ${dropped}`)
  }
})

test("V19: ObservationMomentsCard 渲染 timestamp + observation + closingLine", () => {
  // 必须读这三个字段
  assert.match(SOURCE, /m\.timestamp|moments.*timestamp/s)
  assert.match(SOURCE, /m\.observation|moments.*observation/s)
  assert.match(SOURCE, /closingLine/)
})

test("V19: KeyErrorCard 渲染 goal/excerpt/diagnosis/closing（去掉了图片+任务清单，留下学习核心）", () => {
  assert.match(SOURCE, /keyError\.goal/)
  assert.match(SOURCE, /keyError\.excerpt/)
  assert.match(SOURCE, /keyError\.stepDiagnosis/)
  assert.match(SOURCE, /keyError\.closingLine/)
  // 砍掉的：图片预览 + 任务清单
  assert.doesNotMatch(SOURCE, /\/api\/uploads\//, "V19 KeyErrorCard 不再渲染图片")
  assert.doesNotMatch(SOURCE, /keyError\.tasks/, "V19 KeyErrorCard 不再渲染任务清单")
  assert.doesNotMatch(SOURCE, /keyError\.fileRefs/, "V19 KeyErrorCard 不再使用 fileRefs")
})

test("V19: BlockHeading + SubCard 仍然存在（共用布局原语）", () => {
  assert.match(SOURCE, /function BlockHeading/)
  assert.match(SOURCE, /function SubCard/)
})

test("V19: italic English subtitles 用 design tokens", () => {
  assert.match(SOURCE, /var\(--font-display\)/)
  assert.match(SOURCE, /what went wrong|what's next|what i'm seeing/)
})

test("V19: chrome banlist — 不含 V4 报告腔", () => {
  for (const word of ["稳", "节奏", "提升", "持续", "立即", "马上"]) {
    assert.doesNotMatch(SOURCE, new RegExp(word), `view chrome should not contain "${word}"`)
  }
})

test("V19: chrome banlist — 不含「症结/优先级/弱科/薄弱知识点」诊断腔", () => {
  for (const word of ["症结", "优先级", "弱科", "薄弱知识点"]) {
    assert.doesNotMatch(SOURCE, new RegExp(word))
  }
})

test("V19: chrome banlist — 不含旧版章节名", () => {
  for (const word of [
    "本周聚焦",
    "本月错题分布",
    "次要错题",
    "本日重点",
    "本日已完成",
    "做完上面那道再翻这两张",
    "今晚怎么和爸妈说",
    "今晚被问起",
  ]) {
    assert.doesNotMatch(SOURCE, new RegExp(word))
  }
})
