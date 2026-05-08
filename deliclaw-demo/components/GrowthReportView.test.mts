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

test("V11: source defines TopInsight + HeroCard + ThisWeekAction + BackupSection", () => {
  assert.match(SOURCE, /function TopInsight/)
  assert.match(SOURCE, /function ThisWeekAction/)
  assert.match(SOURCE, /function HeroCard/)
  assert.match(SOURCE, /function BackupSection/)
})

test("V11: HeroCard wraps HomeworkExamErrorChart + ThisWeekAction", () => {
  assert.match(SOURCE, /<HomeworkExamErrorChart/)
  assert.match(SOURCE, /<ThisWeekAction/)
})

test("V11: ThisWeekAction renders the action block with 这周一件事 label", () => {
  assert.match(SOURCE, /这周一件事/)
})

test("V11: source consumes report.topInsight + report.thisWeekAction", () => {
  assert.match(SOURCE, /report\.topInsight/)
  assert.match(SOURCE, /report\.thisWeekAction/)
})

test("V11: BackupSection uses native <details> for collapse", () => {
  assert.match(SOURCE, /<details/)
  assert.match(SOURCE, /<summary/)
})

test("V11: ParentAdviceCard renames 心理辅导重点 → 沟通重点", () => {
  assert.match(SOURCE, /沟通重点/)
  assert.doesNotMatch(SOURCE, /心理辅导重点/, "V11 must drop 心理辅导重点 — clinical")
})

test("V11: 沟通重点 uses sky color (info) instead of amber (alert)", () => {
  // The second column's color class should now be sky-* (information tone)
  assert.match(SOURCE, /bg-sky-50/)
})

test("V12: BackupSection titles use 小凯 (家庭称呼) not 他 (机构口径)", () => {
  // V12 backup titles — 凯伦 → 小凯
  assert.match(SOURCE, /看小凯这个月情绪怎么走的/)
  assert.match(SOURCE, /小凯这个月做了多少/)
  assert.match(SOURCE, /做得好的几件事/)
  assert.match(SOURCE, /其余可以陪小凯这么聊/)
  // V10 portal-style titles must be gone
  assert.doesNotMatch(SOURCE, /给家长的建议/, "V12 wraps advice in BackupSection — no 给家长的建议 h3")
  // V11 旧标题（用「他」指代）必须替换
  assert.doesNotMatch(SOURCE, /看他这个月情绪/, "V12 must drop 看他 — use 看小凯")
  assert.doesNotMatch(SOURCE, /这个月他做了多少/, "V12 must drop 这个月他 — use 小凯这个月")
  assert.doesNotMatch(SOURCE, /陪他这么聊/, "V12 must drop 陪他 — use 陪小凯")
})

test("V12: chrome 永不出现「孩子」+ 短语级 banlist 排除「他」机构口径", () => {
  // V12 doctrine #5 镜像（家长侧）：永不机构口径
  assert.doesNotMatch(SOURCE, /孩子/, "V12 chrome must not contain 孩子 — clinical")
  for (const phrase of ["陪他", "他这个月", "看他"]) {
    assert.doesNotMatch(SOURCE, new RegExp(phrase), `V12 chrome must not contain "${phrase}" — use 小凯`)
  }
})

test("V11: chrome contains no doctrine-banned signals", () => {
  // Doctrine #1: no rank/percentile language
  assert.doesNotMatch(SOURCE, /排名/)
  assert.doesNotMatch(SOURCE, /百分位/)
  // Doctrine #3: no countdown/streak/push language
  assert.doesNotMatch(SOURCE, /倒计时/)
  assert.doesNotMatch(SOURCE, /连续打卡/)
  // V4 chrome banned (carry-over from wrong-q tests)
  for (const word of ["稳", "节奏", "拆", "提升", "持续", "立即", "马上"]) {
    assert.doesNotMatch(SOURCE, new RegExp(word), `growth view chrome should not contain "${word}"`)
  }
})
