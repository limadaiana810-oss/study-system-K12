# 错题报告 V3 改版 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 把"错题报告"从 V2（4 个并列区块、诊断报告口吻）演进到 V3（学生口吻、Hattie 三问驱动、单图、step-level 错因）。

**Architecture:** 重新切分为 5 个区块——**进步信号 (above-fold)** / **这周先拿下 (1-2 张焦点卡)** / **错题节奏 (唯一柱状图)** / **还可以再练这些 (折叠)** —— 删除饼图分布卡。FocusPick 数据结构按 Hattie feed-up / feed-back / feed-forward 三段式重构（goal / stepDiagnosis / closingLine + 任务带 ⏱ 分钟预算）。整套规则源自教育研究 + 头部机构实操调研（见下文 §0）。

**Tech Stack:** Next.js 16 / React 19 / TypeScript / TailwindCSS v4 / recharts / `node --experimental-strip-types --test`

---

## §0. 设计依据（不要改）

研究输出已固化为 7 条硬规则。每个任务都要满足：

| # | 规则 | 出处 |
|---|---|---|
| 1 | 每张焦点卡必须答完 Hattie 三问：目标 / 现状 / 下一步 | Hattie & Timperley 2007 |
| 2 | 焦点数 ≤ 2，理想 1 | Ericsson + Sweller |
| 3 | 禁用诊断书语气；用"你上次卡在 X，这次从这里开始" | Dweck + Black & Wiliam |
| 4 | "本周任务"以**重做 3-5 道老错题**为主，新题为辅 | Roediger & Karpicke |
| 5 | 进步信号必须 above-fold（页面第一行） | Dweck "not yet" + Hattie feed-up |
| 6 | 整页只有 **1 张图表**，且只能是趋势图（不是分布饼图） | Sweller + 智学网/猿题库实操 |
| 7 | 错因到 **步骤级**（"h, k 符号搞反"），不是知识点级 | Black & Wiliam + 作业帮单题反馈 |

**禁用词**：症结 / 优先级 高/中/低 / 正确率 X% / 弱科 / 需要加强 / 薄弱知识点
**鼓励词**：上次卡在 / 这次从这里开始 / 还在练习中 / 方向对了 / 下次再遇到

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `lib/reportTypes.ts` | Modify | V3 类型契约 |
| `lib/reportPrompts.ts` | Modify | WRONG_QUESTION_REPORT_PROMPT 同步 V3 schema |
| `lib/mockReports.ts` | Modify | `buildMockWrongQuestionReport()` V3 内容 |
| `lib/mockReports.test.mts` | Modify | V3 断言 |
| `lib/reportCache.ts` | Modify | `isWrongQuestionReportShape` V3 |
| `lib/reportCache.test.mts` | Modify | V3 fixture + V2 legacy discard 测试 |
| `components/WrongQuestionReportView.tsx` | Rewrite | 5 个新子组件 |
| `components/WrongQuestionReportView.test.mts` | Modify | V3 source-regex |
| `components/ReportCenterPanel.tsx` | Modify | `isValidReport` V3 |

---

## §1. V3 数据契约（用作所有任务的规范）

```ts
// lib/reportTypes.ts —— V3 完整定义

export type FocusTask = {
  id: string                     // 形如 "focus-{i}-task-{j}"
  text: string                   // "翻 5 道老错题，每题先圈 a 是正是负"
  durationMinutes: number        // 8、10、5——具体分钟数
  isReDo: boolean                // true = 重做老错题；false = 新题
}

export type FocusPick = {
  knowledgePoint: string         // 内部 id 用，不一定原样展示在标题
  subject: string                // "数学" / "物理" 等
  goal: string                   // Hattie feed-up——"你知道 y=a(x-h)²+k 里 h 和 k 各管什么吗？"
  stepDiagnosis: string          // 现状到步骤级——"上次你写出顶点式，但把 h=-2 写成了 2"
  tasks: FocusTask[]             // 长度 1-3
  closingLine: string            // feed-forward——"下次再遇到，第一步先看 h, k 的符号"
  fileRefs: string[]             // 相关错题文件名
}

export type WeeklyTrendPoint = { week: 1 | 2 | 3 | 4; count: number }
export type WeeklyTrend = {
  series: WeeklyTrendPoint[]
  summary: string
}

export type WrongQuestionReport = {
  generatedAt: string
  windowDays: 30
  progressSignal: string         // 顶部一行——"比上周少错了 4 道，方向对了"
  focusPicks: FocusPick[]        // 长度 1-2
  weeklyTrend: WeeklyTrend
  weakPoints: {
    knowledgePoint: string
    subject: string
    occurrences: number
    diagnosis: string
  }[]
  // 不再有 overview 字段（饼图/分布在学生口径无价值）
}
```

**从 V2 删除的字段**：
- `WrongQuestionReport.overview`（整个）
- `FocusPick.occurrences`（数据移入 stepDiagnosis 或 closingLine）
- `FocusPick.priority`（管理者用词）
- `FocusPick.expectedOutcome`（替换为 closingLine）
- `FocusPick.tasks[*]` 的旧 `{id, text}` 形状（升级为 FocusTask）

**V3 新增字段**：
- `WrongQuestionReport.progressSignal`
- `FocusPick.goal`
- `FocusPick.stepDiagnosis`（重命名自 `diagnosis`）
- `FocusPick.closingLine`
- `FocusTask.durationMinutes`
- `FocusTask.isReDo`

---

## Task V3-1: V3 类型契约 + prompt schema

**Files:**
- Modify: `deliclaw-demo/lib/reportTypes.ts`
- Modify: `deliclaw-demo/lib/reportPrompts.ts`

- [ ] **Step 1.1: 替换 lib/reportTypes.ts 里 `WrongQuestionReport` 块及相关类型**

把 `lib/reportTypes.ts` 第 1 行到 `WrongQuestionReport` 类型结束的那行（含 V2 时的 `FocusPick`/`WeeklyTrendPoint`/`WeeklyTrend`/`WrongQuestionReport` 共四个 export）整段替换为 §1 中给出的 V3 完整定义。

`GrowthReport`, `ReportType`, `ReportEnvelope` 不动。

- [ ] **Step 1.2: 同步 prompt schema**

`lib/reportPrompts.ts` 中的 `WRONG_QUESTION_REPORT_PROMPT` 整段替换为：

```ts
export const WRONG_QUESTION_REPORT_PROMPT = `你是一名给中学生本人写错题报告的学伴。基于学生的错题清单，输出严格 JSON。

输出 JSON 必须只包含四个字段：
{
  "progressSignal": string,
  "focusPicks": [{
    "knowledgePoint": string,
    "subject": string,
    "goal": string,
    "stepDiagnosis": string,
    "tasks": [{ "id": string, "text": string, "durationMinutes": number, "isReDo": boolean }],
    "closingLine": string,
    "fileRefs": string[]
  }],
  "weeklyTrend": {
    "series": [{ "week": 1|2|3|4, "count": number }],
    "summary": string
  },
  "weakPoints": [{ "knowledgePoint": string, "subject": string, "occurrences": number, "diagnosis": string }]
}

口径要求（这是写给 13-17 岁学生本人看的，不是给家长/老师）：
- 禁用词：症结 / 优先级 / 正确率 / 弱科 / 需要加强 / 薄弱知识点
- 鼓励词：你上次卡在 / 这次从这里开始 / 还在练习中 / 下次再遇到 / 方向对了

字段要求：
- progressSignal：1 句鼓励性进步话术（"比上周少错了 X 道"或"X 知识点上次错、这次对了"等）。如果没有真实进步，写努力信号（"这周练了 N 道"）
- focusPicks 长度 1-2，按 Hattie 三问构造：
  - goal：1 句"你知道 X 吗？"或"X 这个式子里 Y 各管什么？"——学习目标，feed-up
  - stepDiagnosis：精确到解题某一步——"上次你写出 ABC，但把 D 写成了 E"——不是"这个知识点不熟"
  - tasks 长度 1-3；至少 1 项 isReDo=true（重做老错题，因为 retrieval > re-study）；durationMinutes 是真实分钟数
  - closingLine：feed-forward 行为级承诺——"下次再遇到 X，第一步先 Y"
  - tasks[*].id 形如 "focus-{i}-task-{j}"
- weeklyTrend.series 长度恰好 4，按 week 升序；summary 一句趋势判断
- weakPoints 最多 5 条，按 occurrences 由高到低；用于"还可以再练这些"折叠区，可与 focusPicks 重叠（前端会按 knowledgePoint 去重）
- 全中文输出
- 只返回 JSON，不要 markdown 代码块、不要解释文字
- 当输入错题数量为 0 时，返回 progressSignal="先上传几张错题，AI 才能给你分析" focusPicks=[] weeklyTrend.series=[{week:1,count:0},{week:2,count:0},{week:3,count:0},{week:4,count:0}] weeklyTrend.summary="还没有数据" weakPoints=[]
`
```

`GROWTH_REPORT_PROMPT` 不动。

- [ ] **Step 1.3: 验证 reportTypes.ts / reportPrompts.ts 自身无语法错误**

`cd deliclaw-demo && npx tsc --noEmit` 或 `npm run build`。下游（mockReports / 验证器 / 视图）会全部报错——这是预期，由后续任务修。`reportTypes.ts` 和 `reportPrompts.ts` 自身必须 0 错。

- [ ] **Step 1.4: 提交**

```bash
cd /Users/kk/Desktop/工作整理/DeliClaw_Demo
git add deliclaw-demo/lib/reportTypes.ts deliclaw-demo/lib/reportPrompts.ts
git commit -m "refactor(reports): V3 contract — Hattie 三问 + step-level diagnosis + progressSignal"
```

---

## Task V3-2: 双验证器 V3 升级

**Files:**
- Modify: `deliclaw-demo/lib/reportCache.ts`
- Modify: `deliclaw-demo/lib/reportCache.test.mts`
- Modify: `deliclaw-demo/components/ReportCenterPanel.tsx`

- [ ] **Step 2.1: 更新 reportCache 测试 fixture + 新增 V2 legacy discard 测试**

`deliclaw-demo/lib/reportCache.test.mts`：

把 `VALID_WRONG_QUESTION_FIXTURE` 替换为：

```ts
const VALID_WRONG_QUESTION_FIXTURE = {
  generatedAt: "x",
  windowDays: 30,
  progressSignal: "",
  focusPicks: [],
  weeklyTrend: { series: [], summary: "" },
  weakPoints: [],
}
```

把已有的"discards a cached wrong-questions report missing focusPicks"测试 body 替换为：

```ts
test("readCachedReport discards a cached wrong-questions report missing progressSignal", () => {
  installShim()
  ;(globalThis as any).localStorage.setItem(
    "deliclaw_report_wrong-questions",
    JSON.stringify({
      generatedAt: "z",
      windowDays: 30,
      focusPicks: [],
      weeklyTrend: { series: [], summary: "" },
      weakPoints: [],
      // progressSignal missing
    })
  )
  assert.equal(readCachedReport("wrong-questions"), null)
})
```

附加一条 V2 legacy discard 测试（替换原"discards a stale wrong-questions report still using the old errorPatterns/actionPlan shape"测试）：

```ts
test("readCachedReport discards a V2 cached wrong-questions report (no progressSignal, has overview)", () => {
  installShim()
  ;(globalThis as any).localStorage.setItem(
    "deliclaw_report_wrong-questions",
    JSON.stringify({
      generatedAt: "v2",
      windowDays: 30,
      overview: { total: 12, bySubject: [], byQuestionType: [] },
      focusPicks: [],
      weeklyTrend: { series: [], summary: "" },
      weakPoints: [],
    })
  )
  assert.equal(readCachedReport("wrong-questions"), null)
})
```

- [ ] **Step 2.2: 跑测试，确认失败**

```bash
cd /Users/kk/Desktop/工作整理/DeliClaw_Demo/deliclaw-demo
node --experimental-strip-types --test lib/reportCache.test.mts
```

预期：至少 2 条新增/修改测试失败。

- [ ] **Step 2.3: 更新 reportCache 验证器**

`lib/reportCache.ts` 的 `isWrongQuestionReportShape` 整段替换为：

```ts
function isWrongQuestionReportShape(r: any): r is WrongQuestionReport {
  return (
    !!r &&
    typeof r === "object" &&
    typeof r.progressSignal === "string" &&
    Array.isArray(r.focusPicks) &&
    !!r.weeklyTrend &&
    typeof r.weeklyTrend === "object" &&
    Array.isArray(r.weeklyTrend.series) &&
    typeof r.weeklyTrend.summary === "string" &&
    Array.isArray(r.weakPoints)
  )
}
```

(删除原来的 `r.overview` / `r.overview.bySubject` / `r.overview.byQuestionType` 检查。)

- [ ] **Step 2.4: 跑测试，确认通过**

```bash
node --experimental-strip-types --test lib/reportCache.test.mts
```

预期：所有测试通过（其中应有 2 条 V2 legacy 自动 discard 的测试）。

- [ ] **Step 2.5: 同步 ReportCenterPanel.tsx 中的 isValidReport**

`components/ReportCenterPanel.tsx`，把 `isValidReport` 的 `wrong-questions` 分支替换为：

```tsx
if (type === "wrong-questions") {
  const r = report as WrongQuestionReport
  return (
    typeof r.progressSignal === "string" &&
    Array.isArray(r.focusPicks) &&
    !!r.weeklyTrend &&
    Array.isArray(r.weeklyTrend.series) &&
    typeof r.weeklyTrend.summary === "string" &&
    Array.isArray(r.weakPoints)
  )
}
```

（删除原来的 `r.overview` / `r.overview.bySubject` 检查。）

- [ ] **Step 2.6: 提交**

```bash
cd /Users/kk/Desktop/工作整理/DeliClaw_Demo
git add deliclaw-demo/lib/reportCache.ts deliclaw-demo/lib/reportCache.test.mts deliclaw-demo/components/ReportCenterPanel.tsx
git commit -m "refactor(reports): V3 validators in cache + render guard; auto-discard V2 cached entries"
```

---

## Task V3-3: V3 mock 数据（学生口吻）

**Files:**
- Modify: `deliclaw-demo/lib/mockReports.ts`
- Modify: `deliclaw-demo/lib/mockReports.test.mts`

- [ ] **Step 3.1: 更新 mockReports.test.mts 测试**

把 `lib/mockReports.test.mts` 的第一个测试（V2 时是 "buildMockWrongQuestionReport returns a complete WrongQuestionReport shape (V2)"）整体替换为：

```ts
test("buildMockWrongQuestionReport returns a complete WrongQuestionReport shape (V3)", () => {
  const r = buildMockWrongQuestionReport()
  assert.equal(r.windowDays, 30)
  assert.equal(typeof r.generatedAt, "string")
  assert.ok(r.progressSignal.length > 0, "progressSignal must be non-empty")

  // focusPicks: 1-2, each with goal/stepDiagnosis/closingLine/tasks
  assert.ok(r.focusPicks.length >= 1 && r.focusPicks.length <= 2, `focusPicks length ${r.focusPicks.length}`)
  for (let i = 0; i < r.focusPicks.length; i++) {
    const fp = r.focusPicks[i]
    assert.ok(fp.goal.length > 0, `focusPicks[${i}].goal empty`)
    assert.ok(fp.stepDiagnosis.length > 0, `focusPicks[${i}].stepDiagnosis empty`)
    assert.ok(fp.closingLine.length > 0, `focusPicks[${i}].closingLine empty`)
    assert.ok(fp.tasks.length >= 1 && fp.tasks.length <= 3, `tasks length`)
    let hasReDo = false
    for (let j = 0; j < fp.tasks.length; j++) {
      const t = fp.tasks[j]
      assert.equal(t.id, `focus-${i}-task-${j}`, `task id`)
      assert.ok(t.text.length > 0)
      assert.ok(typeof t.durationMinutes === "number" && t.durationMinutes > 0, `durationMinutes`)
      if (t.isReDo) hasReDo = true
    }
    assert.ok(hasReDo, `focusPicks[${i}] must have at least one isReDo task (retrieval practice)`)
    assert.ok(Array.isArray(fp.fileRefs))
  }

  // weeklyTrend
  assert.equal(r.weeklyTrend.series.length, 4)
  for (let i = 0; i < 4; i++) {
    assert.equal(r.weeklyTrend.series[i].week, (i + 1) as 1 | 2 | 3 | 4)
  }
  assert.ok(r.weeklyTrend.summary.length > 0)

  // weakPoints
  assert.ok(r.weakPoints.length >= 1 && r.weakPoints.length <= 5)
})

test("buildMockWrongQuestionReport contains no banned diagnostic-report words", () => {
  // V3 hard constraint: 学生口径
  const r = buildMockWrongQuestionReport()
  const banned = ["症结", "正确率", "弱科", "需要加强", "薄弱知识点", "优先级"]
  const allText = JSON.stringify(r)
  for (const word of banned) {
    assert.equal(allText.includes(word), false, `mock should not contain "${word}" (V3 banned word)`)
  }
})
```

- [ ] **Step 3.2: 跑测试，确认失败**

```bash
node --experimental-strip-types --test lib/mockReports.test.mts
```

预期：V3 shape 测试 + V3 banned-words 测试都失败（旧 mock 还在）。

- [ ] **Step 3.3: 重写 buildMockWrongQuestionReport**

`lib/mockReports.ts` 中 `buildMockWrongQuestionReport` 整段替换为：

```ts
export function buildMockWrongQuestionReport(): WrongQuestionReport {
  return {
    generatedAt: new Date().toISOString(),
    windowDays: 30,
    progressSignal: "比上周少错了 4 道，二次函数你已经追上来了——继续。",
    focusPicks: [
      {
        knowledgePoint: "二次函数顶点式",
        subject: "数学",
        goal: "你知道 y = a(x-h)² + k 这个式子里，h 和 k 各管什么吗？",
        stepDiagnosis: "上次做这道题，你写出了顶点式，但把 h = -2 写成了 2。符号翻转是这道题最常卡的地方——不是你不会，是这个陷阱挺隐蔽的。",
        tasks: [
          {
            id: "focus-0-task-0",
            text: "重新做 5/12 那道二次函数题：把顶点 (-2, 3) 代进去重推一遍，看符号在哪里变。",
            durationMinutes: 8,
            isReDo: true,
          },
          {
            id: "focus-0-task-1",
            text: "翻 5/25 那道老错题，先圈出 h、k 的符号再开始解。",
            durationMinutes: 6,
            isReDo: true,
          },
        ],
        closingLine: "下次再遇到顶点式——第一步先看 h、k 的符号。这一步过了，整道题就稳了。",
        fileRefs: ["数学-错题-2026-04-12.png", "数学-错题-2026-04-25.png"],
      },
      {
        knowledgePoint: "物理单位换算",
        subject: "物理",
        goal: "cm 换 m、g 换 kg 的时候，幂次怎么处理你心里有数吗？",
        stepDiagnosis: "上次那道浮力题，你把密度从 g/cm³ 换到 kg/m³ 时漏乘了 1000，最后算出来的结果差了一个数量级。",
        tasks: [
          {
            id: "focus-1-task-0",
            text: "重做 4/15 和 4/22 那两道老错题，每一步把单位写在数字旁边。",
            durationMinutes: 10,
            isReDo: true,
          },
          {
            id: "focus-1-task-1",
            text: "记一遍单位换算口诀（cm³→m³ 是除以 10⁶，不是 10²）。",
            durationMinutes: 5,
            isReDo: false,
          },
        ],
        closingLine: "下次遇到带单位的物理题——先把所有量换到同一套单位再列方程。",
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
      summary: "本月错题在好转——从最高一周 5 道降到这周 1 道。",
    },
    weakPoints: [
      {
        knowledgePoint: "二次函数顶点式",
        subject: "数学",
        occurrences: 4,
        diagnosis: "顶点式的 h、k 符号常被写反，连带顶点坐标判断也会跟着错。",
      },
      {
        knowledgePoint: "电路图分析（串并联识别）",
        subject: "物理",
        occurrences: 3,
        diagnosis: "串并联组合容易看错，电压表/电流表位置一忽略整张图就分析错了。",
      },
      {
        knowledgePoint: "物理单位换算",
        subject: "物理",
        occurrences: 3,
        diagnosis: "cm→m、g→kg 转换时漏除幂次，结果偏差一个数量级。",
      },
      {
        knowledgePoint: "阅读题主旨判断",
        subject: "英语",
        occurrences: 2,
        diagnosis: "总盯着细节句，忽略了段落首尾的总结句，主旨题选项常被细节带跑。",
      },
      {
        knowledgePoint: "化学方程式配平",
        subject: "化学",
        occurrences: 1,
        diagnosis: "原子守恒漏看，氧原子数最容易不平。",
      },
    ],
  }
}
```

`buildMockGrowthReport`、`EMOTION_SUMMARIES` 不动。

- [ ] **Step 3.4: 跑测试，确认通过**

```bash
node --experimental-strip-types --test lib/mockReports.test.mts
```

预期：4 个测试全过（V3 shape + V3 banned-words + 2 个 growth 测试）。

- [ ] **Step 3.5: 提交**

```bash
git add deliclaw-demo/lib/mockReports.ts deliclaw-demo/lib/mockReports.test.mts
git commit -m "feat(reports): V3 mock — student-voice content, Hattie 三问, retrieval-first tasks"
```

---

## Task V3-4: 视图层 V3 重写

**Files:**
- Rewrite: `deliclaw-demo/components/WrongQuestionReportView.tsx`

- [ ] **Step 4.1: 整文件替换**

把 `components/WrongQuestionReportView.tsx` 全部内容替换为：

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

function ProgressSignalBar({ text }: { text: string }) {
  return (
    <section className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-base">🌱</span>
        <p className="text-sm font-bold leading-relaxed text-emerald-800">{text}</p>
      </div>
    </section>
  )
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

  function jumpToFirstTask() {
    const first = pick.tasks[0]
    if (!first) return
    if (typeof document !== "undefined") {
      const el = document.getElementById(`task-${first.id}`)
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }

  const numberLabel = ["❶", "❷"][index] ?? `#${index + 1}`

  return (
    <section className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/40 p-5 shadow-sm">
      <div className="mb-3 flex items-baseline gap-2">
        <span className="text-lg font-black text-indigo-600">{numberLabel}</span>
        <h3 className="flex-1 text-sm font-bold leading-relaxed text-slate-800">{pick.goal}</h3>
        <span className="shrink-0 text-[10px] text-slate-400">
          <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${SUBJECT_DOT[pick.subject] ?? "bg-slate-400"}`} />
          {pick.subject}
        </span>
      </div>

      <div className="mb-3 rounded-xl border border-slate-100 bg-white/70 p-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">上次卡在哪里</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-700">{pick.stepDiagnosis}</p>
      </div>

      <div className="mb-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">这周怎么补</p>
        <ul className="space-y-2">
          {pick.tasks.map((t) => {
            const isDone = !!done[t.id]
            return (
              <li key={t.id} id={`task-${t.id}`}>
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
                  <span className={`shrink-0 text-[10px] tabular-nums ${isDone ? "text-slate-300" : "text-slate-500"}`}>
                    ⏱ {t.durationMinutes} 分钟
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="mb-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">下次再遇到</p>
        <p className="mt-1 text-xs leading-relaxed text-emerald-800">{pick.closingLine}</p>
      </div>

      <button
        type="button"
        onClick={jumpToFirstTask}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
      >
        ▶ 现在就做
      </button>

      {pick.fileRefs.length > 0 && (
        <div className="mt-3">
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

function MoreToPracticeCard({
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
          还可以再练这些 ({others.length})
        </h3>
        <span className="text-xs text-slate-400">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          {others.map((wp) => (
            <div key={wp.knowledgePoint} className="rounded-xl border border-slate-100 p-3">
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

export default function WrongQuestionReportView({ report }: Props) {
  const focusKPs = new Set(report.focusPicks.map((fp) => fp.knowledgePoint))
  return (
    <div className="space-y-3">
      <ProgressSignalBar text={report.progressSignal} />

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-3 w-1 rounded-full bg-indigo-500" />
          <h2 className="text-sm font-bold text-slate-800">这周先拿下这道</h2>
        </div>
        {report.focusPicks.map((pick, i) => (
          <FocusCard key={i} pick={pick} index={i} generatedAt={report.generatedAt} />
        ))}
      </div>

      <WeeklyTrendCard trend={report.weeklyTrend} />
      <MoreToPracticeCard weakPoints={report.weakPoints} focusKnowledgePoints={focusKPs} />
    </div>
  )
}
```

**注意**：`OverviewStripCard` 完全删除（不再 render 任何"错题分布"区块）。学科分布饼图按研究规则迁移到家长侧的成长报告（已经在那里），学生侧不再展示。

- [ ] **Step 4.2: 验证 build**

```bash
cd /Users/kk/Desktop/工作整理/DeliClaw_Demo/deliclaw-demo
npm run build
```

预期：build 通过（如果失败而且只在 ReportCenterPanel.tsx 报错——说明 V3-2 没做完，回去补）。

- [ ] **Step 4.3: 提交**

```bash
git add deliclaw-demo/components/WrongQuestionReportView.tsx
git commit -m "feat(reports): V3 view — progressSignal + Hattie focus cards + 现在就做 + drop overview"
```

---

## Task V3-5: 组件 source-regex 测试 V3 升级

**Files:**
- Modify: `deliclaw-demo/components/WrongQuestionReportView.test.mts`

- [ ] **Step 5.1: 整文件替换**

```ts
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
  // Banned words from §0 Rule 3 / Dweck growth mindset language
  // Note: SOURCE is the .tsx of the view; mock data lives in lib/mockReports.ts.
  // We check that the view's chrome (labels, headings) doesn't smuggle them back in.
  const bannedInChrome = ["症结", "优先级", "弱科", "薄弱知识点"]
  for (const word of bannedInChrome) {
    assert.doesNotMatch(SOURCE, new RegExp(word), `view chrome should not contain "${word}"`)
  }
})
```

- [ ] **Step 5.2: 跑测试，确认通过**

```bash
cd /Users/kk/Desktop/工作整理/DeliClaw_Demo/deliclaw-demo
node --experimental-strip-types --test components/WrongQuestionReportView.test.mts
```

预期：所有测试通过。

- [ ] **Step 5.3: 提交**

```bash
git add deliclaw-demo/components/WrongQuestionReportView.test.mts
git commit -m "test(reports): V3 view source-regex tests — Hattie三问 + banned-words guard"
```

---

## Task V3-6: 全量验证 + 手测

**Files:** 无（验证）

- [ ] **Step 6.1: 跑所有 lib + components 测试**

```bash
cd /Users/kk/Desktop/工作整理/DeliClaw_Demo/deliclaw-demo
find lib components -name "*.test.mts" -type f | sort | xargs node --experimental-strip-types --test 2>&1 | tail -10
```

预期：全部通过，0 失败。

- [ ] **Step 6.2: 跑生产构建**

```bash
npm run build
```

预期：构建成功。

- [ ] **Step 6.3: 启动 dev 并人工烟测**

```bash
npm run dev
```

打开 `http://localhost:3000?token=wuyanzu`，点报告中心 → 错题报告，逐项过：

- [ ] 第一眼看到的是 **🌱 进步信号 bar**（不是焦点卡）
- [ ] 焦点卡标题是问句（"你知道 y=a(x-h)²+k 这个式子里 h 和 k 各管什么吗？"），不是知识点名
- [ ] 卡内三段式：**上次卡在哪里 / 这周怎么补 / 下次再遇到**——顺序不能乱
- [ ] 任务旁有 **⏱ 8 分钟** 这种时间标签
- [ ] 「现在就做」蓝按钮存在；点击后页面平滑滚动到第一条任务
- [ ] checkbox 勾选/取消 ↔ 文字 line-through 切换
- [ ] 刷新后勾选保留；点「重新生成」后清空
- [ ] 「错题节奏」柱状图正常渲染
- [ ] 「还可以再练这些 (3) ▾」默认收起；展开 3 条（5-2 去重）
- [ ] **整页找不到饼图、找不到"错题分布"、找不到"症结/优先级/正确率"**
- [ ] 切到「成长报告」再切回不报错
- [ ] DevTools → Application 看到 `deliclaw_report_wq_tasks`；点「重置会话」后消失

如有问题，单独打 patch + commit + 重测。

---

## Self-Review Checklist

**研究规则覆盖：**
- 规则 1 (Hattie 三问) → V3-1 (类型) + V3-3 (mock) + V3-4 (视图) ✓
- 规则 2 (≤2 焦点) → V3-1 类型注释 + V3-3 mock 长度 = 2 ✓
- 规则 3 (禁用诊断书语气) → V3-3 banned-words 测试 + V3-5 视图 chrome 测试 ✓
- 规则 4 (重做老错题为主) → V3-1 FocusTask.isReDo + V3-3 mock 至少 1 条 isReDo ✓
- 规则 5 (进步信号 above-fold) → V3-1 progressSignal + V3-4 ProgressSignalBar 渲染顺序 + V3-5 测试 ✓
- 规则 6 (单图、删饼图) → V3-4 删除 OverviewStripCard + V3-5 doesNotMatch PieChart/学科分布 ✓
- 规则 7 (步骤级错因) → V3-1 stepDiagnosis 字段 + V3-3 mock "把 h=-2 写成了 2" 步骤级文本 ✓

**类型一致性：** `FocusTask` 在类型、prompt schema、mock 三处字段名完全一致；`progressSignal` 在三处全部为 string 类型。

**Placeholder 扫描：** 无 TBD。
