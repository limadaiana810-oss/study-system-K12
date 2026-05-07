# 错题报告 V2 改版 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把"错题报告"页从 4 个并列 section（错题总览 / 薄弱知识点 / 错误模式 / 提分行动）重构为"本周聚焦 + 错题节奏 + 折叠兜底 + 错题分布"4 个递进区块；新增 `FocusPick[]` 与 `WeeklyTrend` 字段；任务勾选状态本地持久化。

**Architecture:** Mock 模式下扩展 `WrongQuestionReport` 类型（加 `focusPicks` / `weeklyTrend`，删 `errorPatterns` / `actionPlan`）；新增 `lib/reportTaskState.ts` 管理 checkbox 持久化（按 `generatedAt` gating）；`WrongQuestionReportView` 改为 4 个新子组件。`reportCache.isWrongQuestionReportShape` 与 `ReportCenterPanel.isValidReport` 同步升级；旧形状缓存自动作废重生。

**Tech Stack:** Next.js 16 / React 19 / TypeScript / TailwindCSS v4 / recharts / `node --experimental-strip-types --test`

**Spec:** `docs/superpowers/specs/2026-05-07-wrong-question-report-redesign-design.md`

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `lib/reportTypes.ts` | Modify | 类型契约：加 `FocusPick`、`WeeklyTrend`、`WeeklyTrendPoint`，改 `WrongQuestionReport`（删 `errorPatterns` / `actionPlan`） |
| `lib/reportPrompts.ts` | Modify | `WRONG_QUESTION_REPORT_PROMPT` 中的 JSON schema 同步到新字段（LLM 模式回归用） |
| `lib/mockReports.ts` | Modify | 重写 `buildMockWrongQuestionReport()` 以输出新形状 |
| `lib/mockReports.test.mts` | Modify | 断言新字段（`focusPicks` 长度=2、`weeklyTrend.series` 长度=4 且合计=12） |
| `lib/reportCache.ts` | Modify | `isWrongQuestionReportShape` 校验新字段 |
| `lib/reportCache.test.mts` | Modify | 测试 fixture 切到新形状；保留"discards malformed"行为 |
| `lib/reportTaskState.ts` | Create | localStorage 读写 task 勾选状态，按 `generatedAt` gating |
| `lib/reportTaskState.test.mts` | Create | 持久化逻辑单测 |
| `components/WrongQuestionReportView.tsx` | Rewrite | 4 个新子组件：`FocusCard` / `WeeklyTrendCard` / `OtherWeakPointsCard` / `OverviewStripCard` |
| `components/ReportCenterPanel.tsx` | Modify | `isValidReport` 接受新形状；"重新生成"调用 `clearTaskState()` |
| `app/page.tsx` | Modify | 重置会话调用 `clearTaskState()` |

---

## Task 1: Update type contract & prompt schema

**Files:**
- Modify: `deliclaw-demo/lib/reportTypes.ts`
- Modify: `deliclaw-demo/lib/reportPrompts.ts`

- [ ] **Step 1.1: Replace `WrongQuestionReport` and add new types**

Edit `deliclaw-demo/lib/reportTypes.ts` — replace lines 1-26 (the `WrongQuestionReport` block) with:

```ts
export type FocusPick = {
  knowledgePoint: string
  subject: string
  occurrences: number
  priority: "高" | "中"
  diagnosis: string
  tasks: { id: string; text: string }[]
  expectedOutcome: string
  fileRefs: string[]
}

export type WeeklyTrendPoint = {
  week: 1 | 2 | 3 | 4
  count: number
}

export type WeeklyTrend = {
  series: WeeklyTrendPoint[]
  summary: string
}

export type WrongQuestionReport = {
  generatedAt: string
  windowDays: 30
  overview: {
    total: number
    bySubject: { subject: string; count: number }[]
    byQuestionType: { type: string; count: number }[]
  }
  focusPicks: FocusPick[]
  weeklyTrend: WeeklyTrend
  weakPoints: {
    knowledgePoint: string
    subject: string
    occurrences: number
    diagnosis: string
  }[]
}
```

Leave `GrowthReport`, `ReportType`, `ReportEnvelope` untouched.

- [ ] **Step 1.2: Update prompt schema string**

Edit `deliclaw-demo/lib/reportPrompts.ts` — replace `WRONG_QUESTION_REPORT_PROMPT` (lines 1-17) with:

```ts
export const WRONG_QUESTION_REPORT_PROMPT = `你是一名教学辅导分析师。基于学生的错题清单，输出严格 JSON。

输出 JSON 必须只包含四个字段：
{
  "focusPicks": [{
    "knowledgePoint": string,
    "subject": string,
    "occurrences": number,
    "priority": "高"|"中",
    "diagnosis": string,
    "tasks": [{ "id": string, "text": string }],
    "expectedOutcome": string,
    "fileRefs": string[]
  }],
  "weeklyTrend": {
    "series": [{ "week": 1|2|3|4, "count": number }],
    "summary": string
  },
  "weakPoints": [{ "knowledgePoint": string, "subject": string, "occurrences": number, "diagnosis": string }]
}

要求：
- focusPicks 长度 1-2，挑出本周最该补的知识点；priority 仅"高"或"中"；tasks 长度 2-3；id 形如 "focus-{i}-task-{j}"；diagnosis ≤ 40 字；expectedOutcome 用正确率口径（如"正确率 33% → 80%"），不用"+X 分"
- weeklyTrend.series 长度恰好 4，按 week 升序；summary 一句话趋势判断
- weakPoints 最多 5 条，按 occurrences 由高到低；用于"其他薄弱点"折叠区，可与 focusPicks 重叠（前端会去重）
- 全中文输出
- 只返回 JSON，不要 markdown 代码块、不要解释文字
- 当输入错题数量为 0 时，返回 focusPicks=[] weeklyTrend.series=[{week:1,count:0},{week:2,count:0},{week:3,count:0},{week:4,count:0}] weeklyTrend.summary="还没有错题数据，先上传几张错题再来看报告" weakPoints=[]
`
```

- [ ] **Step 1.3: Verify TypeScript compiles**

Run: `cd deliclaw-demo && npx tsc --noEmit` (or `npm run build` if no `tsc` shortcut)
Expected: errors in `mockReports.ts`, `reportCache.ts`, `WrongQuestionReportView.tsx`, `mockReports.test.mts`, `reportCache.test.mts` (these consume the old shape — they'll be fixed in subsequent tasks). No errors in `reportTypes.ts` / `reportPrompts.ts` themselves.

If errors appear in `reportTypes.ts` or `reportPrompts.ts` themselves, fix them before proceeding.

- [ ] **Step 1.4: Commit**

```bash
cd /Users/kk/Desktop/工作整理/DeliClaw_Demo
git add deliclaw-demo/lib/reportTypes.ts deliclaw-demo/lib/reportPrompts.ts
git commit -m "refactor(reports): update WrongQuestionReport contract — add focusPicks/weeklyTrend, drop errorPatterns/actionPlan"
```

---

## Task 2: Build `reportTaskState` module (TDD)

**Files:**
- Create: `deliclaw-demo/lib/reportTaskState.ts`
- Create: `deliclaw-demo/lib/reportTaskState.test.mts`

- [ ] **Step 2.1: Write the failing tests**

Create `deliclaw-demo/lib/reportTaskState.test.mts`:

```ts
import test from "node:test"
import assert from "node:assert/strict"

import {
  readTaskState,
  setTaskDone,
  clearTaskState,
  TASK_STATE_STORAGE_KEY,
} from "./reportTaskState.ts"

function installShim() {
  const store = new Map<string, string>()
  ;(globalThis as any).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  }
  return store
}

test("TASK_STATE_STORAGE_KEY exposes the storage key", () => {
  assert.equal(TASK_STATE_STORAGE_KEY, "deliclaw_report_wq_tasks")
})

test("readTaskState returns empty object when nothing stored", () => {
  installShim()
  assert.deepEqual(readTaskState("2026-05-07T00:00:00Z"), {})
})

test("setTaskDone writes a task and readTaskState returns it for matching generatedAt", () => {
  installShim()
  setTaskDone("2026-05-07T00:00:00Z", "focus-0-task-0", true)
  assert.deepEqual(readTaskState("2026-05-07T00:00:00Z"), { "focus-0-task-0": true })
})

test("readTaskState returns empty when generatedAt does not match stored generatedAt", () => {
  installShim()
  setTaskDone("2026-05-07T00:00:00Z", "focus-0-task-0", true)
  // New report generated — old task state must be ignored
  assert.deepEqual(readTaskState("2026-05-08T00:00:00Z"), {})
})

test("setTaskDone replaces stored generatedAt when called with a new one", () => {
  installShim()
  setTaskDone("2026-05-07T00:00:00Z", "focus-0-task-0", true)
  setTaskDone("2026-05-08T00:00:00Z", "focus-0-task-1", true)
  // Old generation's state is now wiped
  assert.deepEqual(readTaskState("2026-05-07T00:00:00Z"), {})
  assert.deepEqual(readTaskState("2026-05-08T00:00:00Z"), { "focus-0-task-1": true })
})

test("setTaskDone(false) removes a previously-set task", () => {
  installShim()
  setTaskDone("2026-05-07T00:00:00Z", "focus-0-task-0", true)
  setTaskDone("2026-05-07T00:00:00Z", "focus-0-task-0", false)
  assert.deepEqual(readTaskState("2026-05-07T00:00:00Z"), {})
})

test("clearTaskState removes the storage key", () => {
  const store = installShim()
  setTaskDone("2026-05-07T00:00:00Z", "focus-0-task-0", true)
  clearTaskState()
  assert.equal(store.has(TASK_STATE_STORAGE_KEY), false)
})

test("readTaskState handles malformed JSON gracefully", () => {
  installShim()
  ;(globalThis as any).localStorage.setItem(TASK_STATE_STORAGE_KEY, "not json")
  assert.deepEqual(readTaskState("2026-05-07T00:00:00Z"), {})
})
```

- [ ] **Step 2.2: Run the tests — confirm they fail**

Run: `cd deliclaw-demo && node --experimental-strip-types --test lib/reportTaskState.test.mts`
Expected: failure with "Cannot find module './reportTaskState.ts'"

- [ ] **Step 2.3: Implement the module**

Create `deliclaw-demo/lib/reportTaskState.ts`:

```ts
export const TASK_STATE_STORAGE_KEY = "deliclaw_report_wq_tasks"

type Stored = {
  generatedAt: string
  done: Record<string, true>
}

function read(): Stored | null {
  try {
    const raw = localStorage.getItem(TASK_STATE_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof parsed.generatedAt !== "string" ||
      !parsed.done ||
      typeof parsed.done !== "object"
    ) {
      return null
    }
    return parsed as Stored
  } catch {
    return null
  }
}

function write(value: Stored): void {
  try {
    localStorage.setItem(TASK_STATE_STORAGE_KEY, JSON.stringify(value))
  } catch {
    // ignore quota / unavailable
  }
}

export function readTaskState(generatedAt: string): Record<string, true> {
  const stored = read()
  if (!stored || stored.generatedAt !== generatedAt) return {}
  return stored.done
}

export function setTaskDone(generatedAt: string, taskId: string, done: boolean): void {
  const stored = read()
  const sameGeneration = stored && stored.generatedAt === generatedAt
  const next: Stored = {
    generatedAt,
    done: sameGeneration ? { ...stored!.done } : {},
  }
  if (done) {
    next.done[taskId] = true
  } else {
    delete next.done[taskId]
  }
  write(next)
}

export function clearTaskState(): void {
  try {
    localStorage.removeItem(TASK_STATE_STORAGE_KEY)
  } catch {
    // ignore
  }
}
```

- [ ] **Step 2.4: Run the tests — confirm they pass**

Run: `cd deliclaw-demo && node --experimental-strip-types --test lib/reportTaskState.test.mts`
Expected: all 8 tests pass

- [ ] **Step 2.5: Commit**

```bash
cd /Users/kk/Desktop/工作整理/DeliClaw_Demo
git add deliclaw-demo/lib/reportTaskState.ts deliclaw-demo/lib/reportTaskState.test.mts
git commit -m "feat(reports): add reportTaskState — localStorage-backed task checkbox persistence"
```

---

## Task 3: Update `reportCache` validator (TDD)

**Files:**
- Modify: `deliclaw-demo/lib/reportCache.ts`
- Modify: `deliclaw-demo/lib/reportCache.test.mts`

- [ ] **Step 3.1: Update test fixtures and add a new-shape test**

Edit `deliclaw-demo/lib/reportCache.test.mts` — replace the `VALID_WRONG_QUESTION_FIXTURE` constant (lines 27-34) and the "missing overview" test (lines 79-86), and add one new test:

```ts
const VALID_WRONG_QUESTION_FIXTURE = {
  generatedAt: "x",
  windowDays: 30,
  overview: { total: 0, bySubject: [], byQuestionType: [] },
  focusPicks: [],
  weeklyTrend: { series: [], summary: "" },
  weakPoints: [],
}
```

Replace the last test (line 79-86):

```ts
test("readCachedReport discards a cached wrong-questions report missing focusPicks", () => {
  installShim()
  ;(globalThis as any).localStorage.setItem(
    "deliclaw_report_wrong-questions",
    JSON.stringify({
      generatedAt: "z",
      windowDays: 30,
      overview: { total: 0, bySubject: [], byQuestionType: [] },
      weakPoints: [],
      // focusPicks and weeklyTrend missing
    })
  )
  assert.equal(readCachedReport("wrong-questions"), null)
})
```

Append at the end:

```ts
test("readCachedReport discards a stale wrong-questions report still using the old errorPatterns/actionPlan shape", () => {
  installShim()
  ;(globalThis as any).localStorage.setItem(
    "deliclaw_report_wrong-questions",
    JSON.stringify({
      generatedAt: "legacy",
      windowDays: 30,
      overview: { total: 0, bySubject: [], byQuestionType: [] },
      weakPoints: [],
      errorPatterns: [],
      actionPlan: [],
    })
  )
  assert.equal(readCachedReport("wrong-questions"), null)
})
```

- [ ] **Step 3.2: Run tests — confirm new-shape test fails**

Run: `cd deliclaw-demo && node --experimental-strip-types --test lib/reportCache.test.mts`
Expected: at least 1 test fails (the new-shape test or the missing-focusPicks test passes incidentally because the old validator already returns null for missing fields, but the `VALID_WRONG_QUESTION_FIXTURE` round-trip test now fails because the validator still requires `errorPatterns` / `actionPlan`)

- [ ] **Step 3.3: Update the validator**

Edit `deliclaw-demo/lib/reportCache.ts` — replace `isWrongQuestionReportShape` (lines 14-26):

```ts
function isWrongQuestionReportShape(r: any): r is WrongQuestionReport {
  return (
    !!r &&
    typeof r === "object" &&
    !!r.overview &&
    typeof r.overview === "object" &&
    Array.isArray(r.overview.bySubject) &&
    Array.isArray(r.overview.byQuestionType) &&
    Array.isArray(r.focusPicks) &&
    !!r.weeklyTrend &&
    typeof r.weeklyTrend === "object" &&
    Array.isArray(r.weeklyTrend.series) &&
    typeof r.weeklyTrend.summary === "string" &&
    Array.isArray(r.weakPoints)
  )
}
```

- [ ] **Step 3.4: Run tests — confirm all pass**

Run: `cd deliclaw-demo && node --experimental-strip-types --test lib/reportCache.test.mts`
Expected: all tests pass (including the new "discards stale legacy shape" test)

- [ ] **Step 3.5: Commit**

```bash
cd /Users/kk/Desktop/工作整理/DeliClaw_Demo
git add deliclaw-demo/lib/reportCache.ts deliclaw-demo/lib/reportCache.test.mts
git commit -m "refactor(reports): update isWrongQuestionReportShape for new contract; auto-discard legacy cached entries"
```

---

## Task 4: Rewrite `buildMockWrongQuestionReport`

**Files:**
- Modify: `deliclaw-demo/lib/mockReports.ts`
- Modify: `deliclaw-demo/lib/mockReports.test.mts`

- [ ] **Step 4.1: Update tests for new shape**

Edit `deliclaw-demo/lib/mockReports.test.mts` — replace the first test (lines 9-25):

```ts
test("buildMockWrongQuestionReport returns a complete WrongQuestionReport shape (V2)", () => {
  const r = buildMockWrongQuestionReport()
  assert.equal(r.windowDays, 30)
  assert.equal(typeof r.generatedAt, "string")
  assert.equal(r.overview.total, 12)
  assert.ok(r.overview.bySubject.length >= 3)
  assert.ok(r.overview.byQuestionType.length >= 2)

  // focusPicks: exactly 2, each with stable id and 2 tasks
  assert.equal(r.focusPicks.length, 2)
  for (let i = 0; i < r.focusPicks.length; i++) {
    const fp = r.focusPicks[i]
    assert.ok(["高", "中"].includes(fp.priority), `priority ${fp.priority} not allowed`)
    assert.ok(fp.diagnosis.length > 0)
    assert.ok(fp.expectedOutcome.length > 0)
    assert.equal(fp.tasks.length, 2)
    for (let j = 0; j < fp.tasks.length; j++) {
      assert.equal(fp.tasks[j].id, `focus-${i}-task-${j}`)
      assert.ok(fp.tasks[j].text.length > 0)
    }
    assert.ok(Array.isArray(fp.fileRefs))
  }

  // weeklyTrend: 4 weeks ascending, sum == overview.total
  assert.equal(r.weeklyTrend.series.length, 4)
  const sum = r.weeklyTrend.series.reduce((acc, p) => acc + p.count, 0)
  assert.equal(sum, r.overview.total)
  for (let i = 0; i < 4; i++) {
    assert.equal(r.weeklyTrend.series[i].week, (i + 1) as 1 | 2 | 3 | 4)
  }
  assert.ok(r.weeklyTrend.summary.length > 0)

  // weakPoints: still present as fallback list
  assert.ok(r.weakPoints.length >= 1 && r.weakPoints.length <= 5)
})
```

(Leave the `buildMockGrowthReport` tests untouched — they don't exercise the wrong-question path.)

- [ ] **Step 4.2: Run tests — confirm they fail**

Run: `cd deliclaw-demo && node --experimental-strip-types --test lib/mockReports.test.mts`
Expected: the wrong-question test fails (current mock doesn't have `focusPicks` / `weeklyTrend`)

- [ ] **Step 4.3: Rewrite the mock generator**

Edit `deliclaw-demo/lib/mockReports.ts` — replace `buildMockWrongQuestionReport` (lines 16-123):

```ts
export function buildMockWrongQuestionReport(): WrongQuestionReport {
  return {
    generatedAt: new Date().toISOString(),
    windowDays: 30,
    overview: {
      total: 12,
      bySubject: [
        { subject: "数学", count: 5 },
        { subject: "物理", count: 3 },
        { subject: "英语", count: 2 },
        { subject: "化学", count: 1 },
        { subject: "语文", count: 1 },
      ],
      byQuestionType: [
        { type: "选择题", count: 5 },
        { type: "解答题", count: 4 },
        { type: "填空题", count: 2 },
        { type: "阅读", count: 1 },
      ],
    },
    focusPicks: [
      {
        knowledgePoint: "二次函数图像与开口方向",
        subject: "数学",
        occurrences: 4,
        priority: "高",
        diagnosis: "a>0 时口朝上，你混淆了 4 次——不是不会，是符号反应慢。",
        tasks: [
          {
            id: "focus-0-task-0",
            text: "专项练 15 道，每题先圈出 a 的符号再画图",
          },
          {
            id: "focus-0-task-1",
            text: "看一遍开口方向口诀（5 分钟）",
          },
        ],
        expectedOutcome: "本知识点正确率 33% → 80%",
        fileRefs: ["数学-错题-2026-04-12.png", "数学-错题-2026-04-25.png"],
      },
      {
        knowledgePoint: "单位换算",
        subject: "物理",
        occurrences: 3,
        priority: "高",
        diagnosis: "cm→m / g→kg 转换漏除幂次，结果偏差一个数量级。",
        tasks: [
          {
            id: "focus-1-task-0",
            text: "cm→m 单位换算 30 题集中训练，每题写出换算式再运算",
          },
          {
            id: "focus-1-task-1",
            text: "做完后用红笔回看：哪一步没乘 100？",
          },
        ],
        expectedOutcome: "本知识点正确率 50% → 90%",
        fileRefs: ["物理-错题-2026-04-15.png", "物理-错题-2026-04-22.png"],
      },
    ],
    weeklyTrend: {
      series: [
        { week: 1, count: 4 },
        { week: 2, count: 5 },
        { week: 3, count: 2 },
        { week: 4, count: 1 },
      ],
      summary: "本月在好转：从周 5 题降到周 1 题，继续保持。",
    },
    weakPoints: [
      {
        knowledgePoint: "二次函数图像与开口方向",
        subject: "数学",
        occurrences: 4,
        diagnosis: "对 a 系数符号与开口方向的关系不熟，常错在判断顶点位置和单调区间。",
      },
      {
        knowledgePoint: "电路图分析（串并联识别）",
        subject: "物理",
        occurrences: 3,
        diagnosis: "串并联组合识别不准，常忽略电压表与电流表位置导致整图分析错误。",
      },
      {
        knowledgePoint: "单位换算",
        subject: "物理",
        occurrences: 3,
        diagnosis: "cm→m / g→kg 转换时漏除幂次，导致计算结果偏差一个数量级。",
      },
      {
        knowledgePoint: "阅读题主旨判断",
        subject: "英语",
        occurrences: 2,
        diagnosis: "过度关注细节句而忽略段落首尾的总结句，主旨题选项常与细节混淆。",
      },
      {
        knowledgePoint: "化学方程式配平",
        subject: "化学",
        occurrences: 1,
        diagnosis: "忽略原子守恒，常出现氧原子数不平的错误。",
      },
    ],
  }
}
```

- [ ] **Step 4.4: Run tests — confirm pass**

Run: `cd deliclaw-demo && node --experimental-strip-types --test lib/mockReports.test.mts`
Expected: all tests pass (wrong-question V2 test + 3 growth tests)

- [ ] **Step 4.5: Commit**

```bash
cd /Users/kk/Desktop/工作整理/DeliClaw_Demo
git add deliclaw-demo/lib/mockReports.ts deliclaw-demo/lib/mockReports.test.mts
git commit -m "feat(reports): rewrite buildMockWrongQuestionReport to V2 — focusPicks + weeklyTrend"
```

---

## Task 5: Rewrite `WrongQuestionReportView` (4 new sub-components)

**Files:**
- Rewrite: `deliclaw-demo/components/WrongQuestionReportView.tsx`

No unit test file — this is a visual component, verified by Task 8 manual smoke.

- [ ] **Step 5.1: Replace the file**

Replace the entire contents of `deliclaw-demo/components/WrongQuestionReportView.tsx`:

```tsx
"use client"

import { useEffect, useState } from "react"
import type { WrongQuestionReport, FocusPick } from "@/lib/reportTypes"
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { readTaskState, setTaskDone } from "@/lib/reportTaskState"

interface Props {
  report: WrongQuestionReport
}

const SUBJECT_DOT: Record<string, string> = {
  数学: "bg-indigo-500",
  物理: "bg-emerald-500",
  英语: "bg-amber-500",
  化学: "bg-red-500",
  语文: "bg-purple-500",
}

function priorityChipClass(p: "高" | "中") {
  if (p === "高") return "bg-red-50 text-red-600 border-red-100"
  return "bg-amber-50 text-amber-600 border-amber-100"
}

function FocusCard({
  pick,
  index,
  generatedAt,
}: {
  pick: FocusPick
  index: number
  generatedAt: string
}) {
  const [done, setDone] = useState<Record<string, true>>({})

  useEffect(() => {
    setDone(readTaskState(generatedAt))
  }, [generatedAt])

  function toggle(taskId: string) {
    const next = !done[taskId]
    setTaskDone(generatedAt, taskId, next)
    setDone((prev) => {
      const copy = { ...prev }
      if (next) copy[taskId] = true
      else delete copy[taskId]
      return copy
    })
  }

  const numberLabel = ["❶", "❷", "❸"][index] ?? `#${index + 1}`

  return (
    <section className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/40 p-5 shadow-sm">
      <div className="mb-3 flex items-baseline gap-2">
        <span className="text-lg font-black text-indigo-600">{numberLabel}</span>
        <h3 className="flex-1 text-sm font-bold text-slate-800">{pick.knowledgePoint}</h3>
        <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold ${priorityChipClass(pick.priority)}`}>
          {pick.priority}
        </span>
      </div>

      <div className="mb-3 flex items-center gap-2 text-[10px] text-slate-500">
        <span className={`inline-block h-2 w-2 rounded-full ${SUBJECT_DOT[pick.subject] ?? "bg-slate-400"}`} />
        <span>{pick.subject}</span>
        <span>·</span>
        <span>错 {pick.occurrences} 题</span>
      </div>

      <div className="mb-3 rounded-xl border border-slate-100 bg-white/60 p-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">症结</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-700">{pick.diagnosis}</p>
      </div>

      <div className="mb-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">本周任务</p>
        <ul className="space-y-2">
          {pick.tasks.map((t) => {
            const isDone = !!done[t.id]
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => toggle(t.id)}
                  className="flex w-full items-start gap-2 rounded-lg border border-slate-100 bg-white p-2 text-left hover:border-indigo-200"
                >
                  <span
                    className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      isDone ? "border-indigo-500 bg-indigo-500 text-white" : "border-slate-300 bg-white"
                    }`}
                  >
                    {isDone ? "✓" : ""}
                  </span>
                  <span className={`flex-1 text-xs leading-relaxed ${isDone ? "text-slate-400 line-through" : "text-slate-700"}`}>
                    {t.text}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="mb-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">完成后预期</p>
        <p className="mt-1 text-xs leading-relaxed text-emerald-800">{pick.expectedOutcome}</p>
      </div>

      {pick.fileRefs.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">相关错题</p>
          <div className="flex flex-wrap gap-1.5">
            {pick.fileRefs.map((f) => (
              <span key={f} className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                {f}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function WeeklyTrendCard({ trend }: { trend: WrongQuestionReport["weeklyTrend"] }) {
  const data = trend.series.map((p) => ({ week: `W${p.week}`, count: p.count }))
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <div className="h-3 w-1 rounded-full bg-indigo-500" />
        <h3 className="text-sm font-bold text-slate-800">错题节奏</h3>
      </div>
      <div className="h-40 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="week" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#6366F1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-slate-600">{trend.summary}</p>
    </section>
  )
}

function OtherWeakPointsCard({
  weakPoints,
  focusKnowledgePoints,
}: {
  weakPoints: WrongQuestionReport["weakPoints"]
  focusKnowledgePoints: Set<string>
}) {
  const [open, setOpen] = useState(false)
  const others = weakPoints.filter((wp) => !focusKnowledgePoints.has(wp.knowledgePoint))
  if (others.length === 0) return null

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 text-left"
      >
        <div className="h-3 w-1 rounded-full bg-slate-400" />
        <h3 className="flex-1 text-sm font-bold text-slate-800">
          其他薄弱点 ({others.length})
        </h3>
        <span className="text-xs text-slate-400">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          {others.map((wp, i) => (
            <div key={i} className="rounded-xl border border-slate-100 p-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-bold text-slate-800">{wp.knowledgePoint}</span>
                <span className="text-[10px] text-slate-500">
                  <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${SUBJECT_DOT[wp.subject] ?? "bg-slate-400"}`} />
                  {wp.subject} · 错 {wp.occurrences} 次
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{wp.diagnosis}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function OverviewStripCard({ overview }: { overview: WrongQuestionReport["overview"] }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
        <span className="font-bold text-slate-800">共 {overview.total} 道</span>
        {overview.bySubject.map((s) => (
          <span key={s.subject} className="flex items-center gap-1">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${SUBJECT_DOT[s.subject] ?? "bg-slate-400"}`} />
            {s.subject} {s.count}
          </span>
        ))}
      </div>
    </section>
  )
}

export default function WrongQuestionReportView({ report }: Props) {
  const focusKPs = new Set(report.focusPicks.map((fp) => fp.knowledgePoint))
  return (
    <div className="space-y-3">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-3 w-1 rounded-full bg-indigo-500" />
          <h2 className="text-sm font-bold text-slate-800">本周聚焦</h2>
        </div>
        {report.focusPicks.map((pick, i) => (
          <FocusCard key={pick.knowledgePoint} pick={pick} index={i} generatedAt={report.generatedAt} />
        ))}
      </div>
      <WeeklyTrendCard trend={report.weeklyTrend} />
      <OtherWeakPointsCard weakPoints={report.weakPoints} focusKnowledgePoints={focusKPs} />
      <OverviewStripCard overview={report.overview} />
    </div>
  )
}
```

- [ ] **Step 5.2: Verify TypeScript compiles**

Run: `cd deliclaw-demo && npm run build`
Expected: build succeeds (or fails only in `ReportCenterPanel.tsx` due to `isValidReport` checking the old shape — that's fixed in Task 6).

If `npm run build` fails ONLY in `ReportCenterPanel.tsx` because of the validator check, that's expected — proceed to Task 6 and run build again at the end.

If it fails inside `WrongQuestionReportView.tsx` itself, fix first.

- [ ] **Step 5.3: Commit**

```bash
cd /Users/kk/Desktop/工作整理/DeliClaw_Demo
git add deliclaw-demo/components/WrongQuestionReportView.tsx
git commit -m "feat(reports): rewrite WrongQuestionReportView for V2 — focus cards + weekly trend + collapsed weak points + slim overview"
```

---

## Task 6: Update `ReportCenterPanel` validator and clear task state on regenerate

**Files:**
- Modify: `deliclaw-demo/components/ReportCenterPanel.tsx`

- [ ] **Step 6.1: Update imports and validator**

Edit `deliclaw-demo/components/ReportCenterPanel.tsx`:

Replace the import block (lines 10-14):

```tsx
import {
  clearCachedReport,
  readCachedReport,
  writeCachedReport,
} from "@/lib/reportCache"
import { clearTaskState } from "@/lib/reportTaskState"
```

Replace the `isValidReport` function (lines 26-46):

```tsx
function isValidReport(report: AnyReport | null, type: ReportType): boolean {
  if (!report) return false
  if (type === "wrong-questions") {
    const r = report as WrongQuestionReport
    return (
      !!r.overview &&
      Array.isArray(r.overview.bySubject) &&
      Array.isArray(r.focusPicks) &&
      !!r.weeklyTrend &&
      Array.isArray(r.weeklyTrend.series) &&
      typeof r.weeklyTrend.summary === "string" &&
      Array.isArray(r.weakPoints)
    )
  }
  const r = report as GrowthReport
  return (
    !!r.trajectory &&
    Array.isArray(r.scores) &&
    Array.isArray(r.emotionTrend) &&
    Array.isArray(r.highlights) &&
    !!r.parentAdvice
  )
}
```

Replace `regenerate` (lines 93-97):

```tsx
function regenerate() {
  clearCachedReport(active)
  if (active === "wrong-questions") clearTaskState()
  setReport(null)
  generate()
}
```

- [ ] **Step 6.2: Verify build succeeds**

Run: `cd deliclaw-demo && npm run build`
Expected: build succeeds with no type errors.

- [ ] **Step 6.3: Commit**

```bash
cd /Users/kk/Desktop/工作整理/DeliClaw_Demo
git add deliclaw-demo/components/ReportCenterPanel.tsx
git commit -m "refactor(reports): update isValidReport for V2; clear task state on regenerate"
```

---

## Task 7: Wire `clearTaskState` into 重置会话

**Files:**
- Modify: `deliclaw-demo/app/page.tsx`

- [ ] **Step 7.1: Add import**

Edit `deliclaw-demo/app/page.tsx` — find the existing imports near the top of the file (look for `import` lines that reference `@/lib/`). Add this import alongside them:

```tsx
import { clearTaskState as clearReportTaskState } from "@/lib/reportTaskState"
```

(The aliased name avoids any potential name collision with other reset helpers in the file.)

- [ ] **Step 7.2: Call it in `handleClearMemory`**

Inside `handleClearMemory`, after the existing `localStorage.removeItem("deliclaw_report_growth")` line (around line 199), add:

```tsx
clearReportTaskState()
```

The block becomes:

```tsx
localStorage.removeItem("deliclaw_report_wrong-questions")
localStorage.removeItem("deliclaw_report_growth")
clearReportTaskState()
window.requestAnimationFrame(() => {
```

- [ ] **Step 7.3: Verify build succeeds**

Run: `cd deliclaw-demo && npm run build`
Expected: build succeeds.

- [ ] **Step 7.4: Commit**

```bash
cd /Users/kk/Desktop/工作整理/DeliClaw_Demo
git add deliclaw-demo/app/page.tsx
git commit -m "fix(reports): clear task state on session reset"
```

---

## Task 8: Run full test suite + manual smoke

**Files:** none (verification only)

- [ ] **Step 8.1: Run all relevant Node tests**

Run from repo root:

```bash
cd deliclaw-demo && node --experimental-strip-types --test \
  lib/userInputParser.test.mts \
  lib/prompts.test.mts \
  lib/fileUploadFeedback.test.mts \
  lib/server/sqliteOptional.test.mts \
  lib/nextConfig.test.mts \
  lib/launcherScript.test.mts \
  lib/mockReports.test.mts \
  lib/reportCache.test.mts \
  lib/reportAggregation.test.mts \
  lib/reportTaskState.test.mts
```

Expected: all tests pass, 0 failures.

- [ ] **Step 8.2: Run production build**

Run: `cd deliclaw-demo && npm run build`
Expected: build succeeds.

- [ ] **Step 8.3: Manual UI smoke (dev server)**

Run: `cd deliclaw-demo && npm run dev`

Open `http://localhost:3000` and verify the following checklist:

- [ ] Switch to "报告中心" tab; click "错题报告" sub-tab
- [ ] Click "生成报告" — page renders 4 区块 (本周聚焦 with 2 cards / 错题节奏 / 其他薄弱点 collapsed showing "(3)" / 错题分布 single line)
- [ ] Click any task checkbox — checkbox flips to filled state, text gets line-through and slate-400 color
- [ ] Refresh the browser — checkbox state persists
- [ ] Click "重新生成" — checkboxes reset to unchecked (because `generatedAt` changed and `clearTaskState` was called)
- [ ] Click 其他薄弱点 (3) ▾ — expands to show 3 entries (5 total - 2 in focusPicks)
- [ ] Switch to "成长报告" sub-tab and back to "错题报告" — view re-renders without errors
- [ ] Click 重置会话 (top of left/main panel) — confirm dialog → page reloads → 报告中心 tab is back to empty state
- [ ] Open DevTools → Application → Local Storage and confirm `deliclaw_report_wq_tasks` is absent after reset

If anything fails, fix it (likely a small CSS / event-handler issue) and add a commit before declaring done.

- [ ] **Step 8.4: Commit any UI fixes (if needed)**

If Step 8.3 found issues:

```bash
cd /Users/kk/Desktop/工作整理/DeliClaw_Demo
git add <changed-files>
git commit -m "fix(reports): address smoke-test findings"
```

If no issues, skip this step.

---

## Self-Review Checklist (run BEFORE handing off)

**Spec coverage:**
- §3 信息架构 (4 区块) → Task 5 (4 sub-components) ✓
- §4 数据契约 → Task 1 (types) + Task 4 (mock) ✓
- §5 任务勾选持久化 → Task 2 (module) + Task 6 (regenerate clear) + Task 7 (reset clear) ✓
- §6 mock 数据约束（focusPicks=2, tasks=2 each, weeklyTrend.series 合计=12）→ Task 4.1 (test) + Task 4.3 (impl) ✓
- §7 视觉细节 → Task 5.1 (Tailwind classes for each sub-component) ✓
- §8 文件清单 → Tasks 1-7 cover all 11 files ✓
- §9 测试策略 → Task 2 unit + Task 4 mock shape + Task 8 full suite + manual ✓
- §11 风险缓解 → Task 5 OtherWeakPointsCard implements knowledgePoint dedup; Task 2 implements generatedAt gating ✓

**Type consistency:**
- `FocusPick.tasks[].id` field name used consistently (Tasks 1, 4, 5)
- `weeklyTrend.series` / `weeklyTrend.summary` consistently structured
- `clearTaskState()` (no args) consistent across Tasks 2, 6, 7
- `setTaskDone(generatedAt, taskId, done)` signature consistent across Task 2 (impl) and Task 5 (consumer)
- `readTaskState(generatedAt)` signature consistent across Task 2 (impl) and Task 5 (consumer)

**Placeholder scan:** none.
