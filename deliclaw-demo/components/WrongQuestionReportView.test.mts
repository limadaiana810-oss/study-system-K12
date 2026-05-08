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
  assert.match(SOURCE, /次要错题/)
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

// ── V6 tests (TodayPickCard removed; FocusCard ❶ becomes hero) ──

test("V4: source defines HeroSignalsBar component", () => {
  assert.match(SOURCE, /HeroSignalsBar/)
})

test("V6: source no longer defines TodayPickCard (deleted, focusPicks[0] now hero)", () => {
  assert.doesNotMatch(SOURCE, /TodayPickCard/)
})

test("V4: source does NOT contain ProgressSignalBar (replaced by HeroSignalsBar)", () => {
  assert.doesNotMatch(SOURCE, /ProgressSignalBar/)
})

test("V4: source references both progressSignal and gapSignal props", () => {
  assert.match(SOURCE, /progressSignal/)
  assert.match(SOURCE, /gapSignal/)
})

test("V6: source no longer references todayPick (field deleted from contract)", () => {
  assert.doesNotMatch(SOURCE, /todayPick/)
})

test("V6: scrollToTask pattern still exists for FocusCard '现在就做' button", () => {
  assert.match(SOURCE, /`#task-\$\{|'task-' \+|"task-" \+|task-\$\{/)
})

test("V6: FocusCard accepts isHero prop and renders '先做这件' flag for hero card", () => {
  assert.match(SOURCE, /isHero/)
  assert.match(SOURCE, /先做这件/)
  // hero visual: border-2 distinguishes hero from regular cards
  assert.match(SOURCE, /border-2/)
})

test("V5: FocusCard renders errorCount + examWeightLabel meta badge", () => {
  assert.match(SOURCE, /pick\.errorCount/)
  assert.match(SOURCE, /pick\.examWeightLabel/)
  // amber-styled meta badge
  assert.match(SOURCE, /amber/)
})

test("V5: original-question evidence renders as image thumbnails via /api/uploads/", () => {
  assert.match(SOURCE, /\/api\/uploads\//)
  assert.match(SOURCE, /<img/)
})

test("V5: source includes a Lightbox component for image preview", () => {
  assert.match(SOURCE, /Lightbox/i)
})

test("V5: MoreToPracticeCard is renamed '次要错题' with amber accent", () => {
  assert.match(SOURCE, /次要错题/)
  // 次要错题 chrome must use amber, not slate
  assert.doesNotMatch(SOURCE, /其他薄弱点/)
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
    "现在做这一件",          // V3
    "今天这件做完了",        // V3
    "本日重点",              // V4 → 本周重点 (V5) → deleted (V6)
    "本日已完成",            // V4 → 本周已完成 (V5) → deleted (V6)
    "本周重点",              // V5 → deleted (V6: TodayPickCard removed)
    "本周已完成",            // V5 → deleted (V6)
    "其他薄弱点",            // V4 → 次要错题 (V5)
    "这周先把这两道拿下",    // V3
    "做完这两道",            // V3
    "本月错题，一周一根",    // V3
    "其他还在冒头的",        // V3
    "想看完整本周计划",      // V3
    "上次卡在哪",            // V3
    "这周怎么补",            // V3
    "下次再遇到",            // V3
    "这周先拿下这道",        // V3
    "还可以再练这些",        // V3
  ]
  for (const word of removed) {
    assert.doesNotMatch(SOURCE, new RegExp(word), `view chrome should no longer contain "${word}"`)
  }
})
