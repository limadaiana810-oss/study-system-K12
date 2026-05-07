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

test("WrongQuestionReportView renders all four section titles", () => {
  assert.match(SOURCE, /错题总览/)
  assert.match(SOURCE, /薄弱知识点/)
  assert.match(SOURCE, /错误模式/)
  assert.match(SOURCE, /提分行动/)
})

test("WrongQuestionReportView uses recharts for charts", () => {
  assert.match(SOURCE, /from ["']recharts["']/)
  assert.match(SOURCE, /PieChart/)
  assert.match(SOURCE, /BarChart/)
})

test("WrongQuestionReportView handles empty arrays via fallback strings", () => {
  assert.match(SOURCE, /weakPoints\.length === 0/)
  assert.match(SOURCE, /errorPatterns\.length === 0/)
  assert.match(SOURCE, /actionPlan\.length === 0/)
})

test("WrongQuestionReportView accepts a typed `report` prop", () => {
  assert.match(SOURCE, /report: WrongQuestionReport/)
})
