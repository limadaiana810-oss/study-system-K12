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

test("V11: WrongQuestionReportView formal section titles (drop 本周聚焦, keep 本月错题分布 + 次要错题)", () => {
  // V11: topPattern 一句话承担标题角色，不再有 本周聚焦 h2
  assert.doesNotMatch(SOURCE, /本周聚焦/, "V11 dropped 本周聚焦 h2 — topPattern is the title")
  assert.match(SOURCE, /本月错题分布/) // V10: 趋势 + 占比 → 分布
  assert.match(SOURCE, /次要错题/) // V10: collapsible footer of breakdown card
  assert.doesNotMatch(SOURCE, /本月错题趋势/, "V10 must drop 本月错题趋势 (merged into 分布)")
  assert.doesNotMatch(SOURCE, /学科占比/, "V10 must drop 学科占比 (now stacked into bar)")
})

test("V11: TopPattern replaces FocusHeader; one line at top", () => {
  assert.match(SOURCE, /<TopPattern/)
  assert.match(SOURCE, /report\.topPattern/)
  assert.doesNotMatch(SOURCE, /report\.progressSignal/, "V8+ must not reference progressSignal")
  assert.doesNotMatch(SOURCE, /report\.progressHeadline/, "V11 must drop progressHeadline binding")
  assert.doesNotMatch(SOURCE, /report\.progressReason/, "V11 must drop progressReason binding")
  assert.doesNotMatch(SOURCE, /report\.gapSignal/, "V11 must drop gapSignal binding")
  assert.doesNotMatch(SOURCE, /HeroSignalsBar/, "must drop HeroSignalsBar")
  assert.doesNotMatch(SOURCE, /<HeroBanner/, "V9+ must drop HeroBanner")
  assert.doesNotMatch(SOURCE, /<FocusHeader/, "V11 must drop FocusHeader")
})

test("V10: WrongQuestionReportView uses stacked BarChart for the monthly breakdown", () => {
  assert.match(SOURCE, /from ["']recharts["']/)
  assert.match(SOURCE, /BarChart/, "V10 needs BarChart for stacked breakdown")
  assert.match(SOURCE, /stackId=/, "V10 stacked bars require stackId")
  assert.doesNotMatch(SOURCE, /LineChart/, "V10 dropped weekly LineChart")
  assert.doesNotMatch(SOURCE, /PieChart/, "V10 dropped subject-share PieChart")
  assert.doesNotMatch(SOURCE, /<Pie /, "V10 must not render any Pie segments")
})

test("V11: WrongQuestionReportView consumes hero/backups/topPattern", () => {
  assert.match(SOURCE, /report\.hero/)
  assert.match(SOURCE, /report\.backups/)
  assert.match(SOURCE, /report\.topPattern/)
  assert.match(SOURCE, /report\.weeklyTrend/)
  assert.match(SOURCE, /report\.weakPoints/)
  assert.doesNotMatch(SOURCE, /report\.focusPicks/, "V11 must drop focusPicks")
  assert.doesNotMatch(SOURCE, /report\.overview/)
  assert.doesNotMatch(SOURCE, /report\.errorPatterns/)
  assert.doesNotMatch(SOURCE, /report\.actionPlan/)
})

test("FocusCard shows goal/stepDiagnosis/closingLine + ⏱ duration (V9: in-card CTA dropped)", () => {
  assert.match(SOURCE, /pick\.goal/)
  assert.match(SOURCE, /pick\.stepDiagnosis/)
  assert.match(SOURCE, /pick\.closingLine/)
  assert.match(SOURCE, /durationMinutes/)
  assert.match(SOURCE, /分钟/)
  assert.match(SOURCE, /错因回顾/)
  assert.match(SOURCE, /解题要点/)
  // V9: tasks ARE the action surface — no redundant 现在就做 button inside FocusCard
  assert.doesNotMatch(SOURCE, /现在就做/, "V9 must drop the redundant 现在就做 button")
})

test("V9: QuestionBlock renders excerpt + image preview prominently", () => {
  assert.match(SOURCE, /function QuestionBlock/)
  assert.match(SOURCE, /pick\.excerpt/)
  assert.match(SOURCE, /pick\.questionDate/)
  // 题目 label appears as the QuestionBlock heading
  assert.match(SOURCE, /题目/)
})

test("V11: FocusCard collapses 错因回顾 + 解题要点 into one Diagnosis block", () => {
  // Diagnosis component exists and consumes both fields
  assert.match(SOURCE, /function Diagnosis/)
  assert.match(SOURCE, /<Diagnosis /)
  // pick.goal is rendered as italic subtitle (still referenced)
  assert.match(SOURCE, /pick\.goal/)
  // V11: pick.whyPicked is NO LONGER bound (moved out of view entirely)
  assert.doesNotMatch(SOURCE, /pick\.whyPicked/, "V11 dropped whyPicked binding")
})

test("WrongQuestionReportView wires task checkbox state through reportTaskState", () => {
  assert.match(SOURCE, /from ["']@\/lib\/reportTaskState["']/)
  assert.match(SOURCE, /readTaskState/)
  assert.match(SOURCE, /setTaskDone/)
})

test("WrongQuestionReportView no longer renders V2 OverviewStripCard / 学科分布", () => {
  // V10 reclaims 错题分布 as the new merged-card label, so it's no longer banned.
  assert.doesNotMatch(SOURCE, /OverviewStripCard/)
  assert.doesNotMatch(SOURCE, /学科分布/)
})

test("V10: WrongQuestionReportView renders MonthlyErrorBreakdownCard (replaces 趋势 + 占比 + 次要)", () => {
  assert.match(SOURCE, /function MonthlyErrorBreakdownCard/)
  assert.match(SOURCE, /<MonthlyErrorBreakdownCard/)
  assert.doesNotMatch(SOURCE, /SubjectShareCard/, "V10 dropped SubjectShareCard")
  assert.doesNotMatch(SOURCE, /WeeklyTrendCard/, "V10 dropped WeeklyTrendCard")
  assert.doesNotMatch(SOURCE, /MoreToPracticeCard/, "V10 inlined the collapsible into the breakdown card")
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

// ── V11 hero/backup/tail layout (FocusHeader removed; hero solo + BackupCard collapsibles) ──

test("V11: source defines TopPattern component (replaces FocusHeader)", () => {
  assert.match(SOURCE, /function TopPattern/)
  assert.doesNotMatch(SOURCE, /function FocusHeader/, "V11 must drop FocusHeader")
})

test("V11: source defines BackupCard component using <details> for collapse", () => {
  assert.match(SOURCE, /function BackupCard/)
  assert.match(SOURCE, /<details/)
})

test("V11: source extracts FocusCardBody for shared body between FocusCard and BackupCard", () => {
  assert.match(SOURCE, /function FocusCardBody/)
})

test("V11: source no longer binds pick.whyPicked / ❶/❷/❸ / ℹ tooltip", () => {
  // pick.whyPicked must not be referenced in the rendered view (data field stays)
  assert.doesNotMatch(SOURCE, /pick\.whyPicked/, "V11 view must not bind whyPicked")
  // ❶/❷/❸ number labels gone from UI
  assert.doesNotMatch(SOURCE, /❶/)
  assert.doesNotMatch(SOURCE, /❷/)
  assert.doesNotMatch(SOURCE, /❸/)
  // ℹ tooltip component gone
  assert.doesNotMatch(SOURCE, /function IconInfo/, "V11 dropped IconInfo")
})

test("V11: source carries '做完上面那道再翻这两张' deferral hint below backups", () => {
  assert.match(SOURCE, /做完上面那道再翻这两张/)
})

test("V11: source no longer renders apologetic footer", () => {
  assert.doesNotMatch(SOURCE, /下次错题进来，会自动加进这份报告/)
})

test("V6: source no longer defines TodayPickCard (deleted, hero now hero)", () => {
  assert.doesNotMatch(SOURCE, /TodayPickCard/)
})

test("V4: source does NOT contain ProgressSignalBar (replaced by HeroSignalsBar)", () => {
  assert.doesNotMatch(SOURCE, /ProgressSignalBar/)
})

test("V6: source no longer references todayPick (field deleted from contract)", () => {
  assert.doesNotMatch(SOURCE, /todayPick/)
})

test("V11: task element ids preserved (id={`task-${...}`}) for any future scroll-into-view", () => {
  assert.match(SOURCE, /`#task-\$\{|'task-' \+|"task-" \+|task-\$\{/)
})

test("V6: FocusCard renders '先做这件' flag for hero card", () => {
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

test("V11: FocusCard meta references knowledgePoints count without rendering chips/tooltips", () => {
  assert.match(SOURCE, /pick\.knowledgePoints/)
  // V11 dropped 「为什么先做这道」 tooltip — not in chrome
  assert.doesNotMatch(SOURCE, /为什么先做这道/, "V11 dropped 为什么先做这道 tooltip")
  // meta strip still mentions 涵盖 N 个知识点
  assert.match(SOURCE, /涵盖.*知识点/)
})

test("V5: original-question evidence renders as image thumbnails via /api/uploads/", () => {
  assert.match(SOURCE, /\/api\/uploads\//)
  assert.match(SOURCE, /<img/)
})

test("V5: source includes a Lightbox component for image preview", () => {
  assert.match(SOURCE, /Lightbox/i)
})

test("V10: 次要错题 label survives as the inline collapsible inside MonthlyErrorBreakdownCard", () => {
  assert.match(SOURCE, /次要错题/)
  // 旧名 (V5 之前) 仍然不能回潮
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

test("V11: page no longer renders apologetic footer; aggregate counts still threaded", () => {
  // V11 dropped "下次错题进来…" apologetic line
  assert.doesNotMatch(SOURCE, /下次错题进来，会自动加进这份报告/)
  // counts still computed and threaded into the breakdown card subtitle
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
