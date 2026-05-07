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

test("WrongQuestionReportView renders V3 section titles", () => {
  assert.match(SOURCE, /这周先拿下这道/)
  assert.match(SOURCE, /错题节奏/)
  assert.match(SOURCE, /还可以再练这些/)
})

test("WrongQuestionReportView renders the progress signal above the fold", () => {
  // ProgressSignalBar must be rendered FIRST inside the root div
  assert.match(SOURCE, /<ProgressSignalBar/)
  assert.match(SOURCE, /report\.progressSignal/)
})

test("WrongQuestionReportView uses recharts BarChart only", () => {
  assert.match(SOURCE, /from ["']recharts["']/)
  assert.match(SOURCE, /BarChart/)
  assert.doesNotMatch(SOURCE, /PieChart/)
  assert.doesNotMatch(SOURCE, /\bPie\b/)
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
  assert.match(SOURCE, /上次卡在哪里/)
  assert.match(SOURCE, /下次再遇到/)
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
