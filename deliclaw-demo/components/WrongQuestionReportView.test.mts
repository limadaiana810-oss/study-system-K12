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

test("WrongQuestionReportView renders the V2 section titles", () => {
  assert.match(SOURCE, /本周聚焦/)
  assert.match(SOURCE, /错题节奏/)
  assert.match(SOURCE, /其他薄弱点/)
})

test("WrongQuestionReportView uses recharts BarChart only (no Pie/PieChart)", () => {
  assert.match(SOURCE, /from ["']recharts["']/)
  assert.match(SOURCE, /BarChart/)
  assert.doesNotMatch(SOURCE, /PieChart/)
  assert.doesNotMatch(SOURCE, /\bPie\b/)
})

test("WrongQuestionReportView consumes the V2 report fields", () => {
  assert.match(SOURCE, /report\.focusPicks/)
  assert.match(SOURCE, /report\.weeklyTrend/)
  assert.match(SOURCE, /report\.weakPoints/)
  assert.match(SOURCE, /report\.overview/)
  assert.doesNotMatch(SOURCE, /report\.errorPatterns/)
  assert.doesNotMatch(SOURCE, /report\.actionPlan/)
})

test("WrongQuestionReportView wires task checkbox state through reportTaskState", () => {
  assert.match(SOURCE, /from ["']@\/lib\/reportTaskState["']/)
  assert.match(SOURCE, /readTaskState/)
  assert.match(SOURCE, /setTaskDone/)
})

test("WrongQuestionReportView accepts a typed `report` prop", () => {
  assert.match(SOURCE, /report: WrongQuestionReport/)
})
