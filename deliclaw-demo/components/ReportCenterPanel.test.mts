import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const SOURCE = fs.readFileSync(
  path.join(process.cwd(), "components", "ReportCenterPanel.tsx"),
  "utf8"
)

test("ReportCenterPanel is a client component", () => {
  assert.match(SOURCE, /^["']use client["']/m)
})

test("ReportCenterPanel exposes both report types as tabs", () => {
  assert.match(SOURCE, /错题报告/)
  assert.match(SOURCE, /成长报告/)
})

test("ReportCenterPanel uses cache helpers from lib/reportCache", () => {
  assert.match(SOURCE, /from ["']@\/lib\/reportCache["']|from ["']\.\.\/lib\/reportCache["']/)
  assert.match(SOURCE, /readCachedReport/)
  assert.match(SOURCE, /writeCachedReport/)
  assert.match(SOURCE, /clearCachedReport/)
})

test("ReportCenterPanel POSTs to /api/reports/[type]", () => {
  assert.match(SOURCE, /\/api\/reports\/\$\{[^}]+\}/)
})

test("ReportCenterPanel renders WrongQuestionReportView and GrowthReportView", () => {
  assert.match(SOURCE, /WrongQuestionReportView/)
  assert.match(SOURCE, /GrowthReportView/)
})

test("ReportCenterPanel has empty / loading / error / ready states", () => {
  assert.match(SOURCE, /生成报告/)       // empty CTA
  assert.match(SOURCE, /AI 正在分析/)    // loading
  assert.match(SOURCE, /生成失败/)       // error
  assert.match(SOURCE, /重新生成/)       // ready -> regenerate
})
