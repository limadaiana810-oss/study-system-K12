import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const SOURCE = fs.readFileSync(
  path.join(process.cwd(), "components", "WrongQuestionReportView.tsx"),
  "utf8"
)

test("WrongQuestionReportView is a client component", () => {
  assert.match(SOURCE, /^["']use client["']/m)
})

test("WrongQuestionReportView renders formal section titles", () => {
  assert.match(SOURCE, /本周聚焦/)
  assert.match(SOURCE, /本月错题趋势/)
  assert.match(SOURCE, /其他薄弱点/)
})

test("WrongQuestionReportView renders the progress signal above the fold", () => {
  // V4: ProgressSignalBar replaced by HeroSignalsBar; progress signal still rendered
  assert.match(SOURCE, /<HeroSignalsBar/)
  assert.match(SOURCE, /report\.progressSignal/)
})

test("WrongQuestionReportView uses recharts LineChart for trend and PieChart for subject share", () => {
  assert.match(SOURCE, /from ["']recharts["']/)
  assert.match(SOURCE, /LineChart/)
  assert.match(SOURCE, /PieChart/)
  assert.doesNotMatch(SOURCE, /BarChart/)
})

test("WrongQuestionReportView consumes V3 fields", () => {
  assert.match(SOURCE, /report\.focusPicks/)
  assert.match(SOURCE, /report\.weeklyTrend/)
  assert.match(SOURCE, /report\.weakPoints/)
  assert.match(SOURCE, /report\.progressSignal/)
  assert.doesNotMatch(SOURCE, /report\.overview/)
  assert.doesNotMatch(SOURCE, /report\.errorPatterns/)
  assert.doesNotMatch(SOURCE, /report\.actionPlan/)
})

test("FocusCard shows goal/stepDiagnosis/closingLine + ⏱ duration + '现在就做' CTA", () => {
  assert.match(SOURCE, /pick\.goal/)
  assert.match(SOURCE, /pick\.stepDiagnosis/)
  assert.match(SOURCE, /pick\.closingLine/)
  assert.match(SOURCE, /durationMinutes/)
  assert.match(SOURCE, /分钟/)
  assert.match(SOURCE, /现在就做/)
  assert.match(SOURCE, /错因回顾/)
  assert.match(SOURCE, /本周练习/)
  assert.match(SOURCE, /解题要点/)
})

test("WrongQuestionReportView wires task checkbox state through reportTaskState", () => {
  assert.match(SOURCE, /from ["']@\/lib\/reportTaskState["']/)
  assert.match(SOURCE, /readTaskState/)
  assert.match(SOURCE, /setTaskDone/)
})

test("WrongQuestionReportView no longer renders OverviewStripCard / 错题分布", () => {
  assert.doesNotMatch(SOURCE, /OverviewStripCard/)
  assert.doesNotMatch(SOURCE, /错题分布/)
  assert.doesNotMatch(SOURCE, /学科分布/)
})

test("WrongQuestionReportView renders SubjectShareCard with 学科占比 label", () => {
  assert.match(SOURCE, /SubjectShareCard/)
  assert.match(SOURCE, /学科占比/)
})

test("WrongQuestionReportView accepts a typed `report` prop", () => {
  assert.match(SOURCE, /report: WrongQuestionReport/)
})

test("WrongQuestionReportView contains no banned diagnostic-report words (V3 student-voice)", () => {
  // Banned words from V3 design — view chrome (labels/headings) must not smuggle them back in.
  // (Mock data is checked separately in lib/mockReports.test.mts.)
  const bannedInChrome = ["症结", "优先级", "弱科", "薄弱知识点"]
  for (const word of bannedInChrome) {
    assert.doesNotMatch(SOURCE, new RegExp(word), `view chrome should not contain "${word}"`)
  }
})

// ── V4 tests (RED until HeroSignalsBar + TodayPickCard are implemented) ──

test("V4: source defines HeroSignalsBar component", () => {
  assert.match(SOURCE, /HeroSignalsBar/)
})

test("V4: source defines TodayPickCard component", () => {
  assert.match(SOURCE, /TodayPickCard/)
})

test("V4: source does NOT contain ProgressSignalBar (replaced by HeroSignalsBar)", () => {
  assert.doesNotMatch(SOURCE, /ProgressSignalBar/)
})

test("V4: TodayPickCard header is the formal '本日重点'", () => {
  assert.match(SOURCE, /本日重点/)
})

test("V4: source references both progressSignal and gapSignal props", () => {
  assert.match(SOURCE, /progressSignal/)
  assert.match(SOURCE, /gapSignal/)
})

test("V4: source references todayPick and taskState completion lookup", () => {
  assert.match(SOURCE, /todayPick/)
  assert.match(SOURCE, /taskState\[todayPick/)
})

test("V4: source contains scroll target pattern #task-${...} for 开始 button", () => {
  // The 开始 button must scroll to #task-${todayPick.taskId}
  assert.match(SOURCE, /`#task-\$\{|'task-' \+|"task-" \+|task-\$\{/)
})

test("V4: source contains '开始' button text and '本日已完成' done-state label", () => {
  assert.match(SOURCE, /开始/)
  assert.match(SOURCE, /本日已完成/)
})

test("V4 chrome banned-words: source does not contain V4 banned words", () => {
  // These must not appear in view chrome (labels/headings/button text).
  // Variable names or comments that incidentally contain substrings are acceptable —
  // the test checks the raw source; identifiers like 'instability' are not in this codebase.
  const banned = [
    "稳", "节奏", "拆", "提升", "持续", "立即", "马上",
    "今日任务", "立即行动", "本日推荐", "了解更多", "展开查看",
  ]
  for (const word of banned) {
    assert.doesNotMatch(SOURCE, new RegExp(word), `view chrome should not contain banned word "${word}"`)
  }
})

// ── Page footer ──

test("page footer renders weakPoints aggregate counts", () => {
  assert.match(SOURCE, /下次错题进来，会自动加进这份报告/)
  assert.match(SOURCE, /totalErrorCount/)
  assert.match(SOURCE, /subjectsCount/)
})

// ── Removed casual titles (chrome 已转为正式口吻) ──

test("chrome banned: removed casual section titles (formal pass)", () => {
  const removed = [
    "现在做这一件",          // → 本日重点
    "今天这件做完了",        // → 本日已完成
    "这周先把这两道拿下",    // → 本周聚焦
    "做完这两道",            // subtitle removed
    "本月错题，一周一根",    // → 本月错题趋势
    "其他还在冒头的",        // → 其他薄弱点
    "想看完整本周计划",      // divider removed
    "上次卡在哪",            // → 错因回顾 (covers V3 "上次卡在哪里" too)
    "这周怎么补",            // → 本周练习
    "下次再遇到",            // → 解题要点
    "这周先拿下这道",        // V3 wording, already gone
    "还可以再练这些",        // V3 wording, already gone
  ]
  for (const word of removed) {
    assert.doesNotMatch(SOURCE, new RegExp(word), `view chrome should no longer contain "${word}"`)
  }
})
