# Report Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a third "报告中心" view to DeliClaw Demo that generates two AI-driven reports — a student-facing wrong-question analysis and a parent-facing monthly growth report — backed by a new typed JSON server endpoint.

**Architecture:** New `activeView === "reports"` state with `ReportCenterPanel` rendering inside `ChatPanel`'s main area. New `/api/reports/[type]` endpoint aggregates SQLite + mock scores server-side (deterministic numbers), then asks the LLM only for qualitative fields with `response_format: { type: "json_object" }`. Reports cache in `localStorage` per type; a "重新生成" button clears cache and reissues. Charts via `recharts`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, OpenRouter (Qwen text model), `recharts` (new dep), `node:test` for unit tests, SQLite via `lib/server/sqlite.ts`.

**Spec:** `deliclaw-demo/docs/superpowers/specs/2026-05-07-report-center-design.md`

**Working directory for all commands:** `deliclaw-demo/`

---

## Task 1: Add report TypeScript types

**Files:**
- Create: `deliclaw-demo/lib/reportTypes.ts`

This task only adds type definitions. No tests; types have no runtime behavior.

- [ ] **Step 1: Create the types file**

Create `lib/reportTypes.ts`:

```ts
export type WrongQuestionReport = {
  generatedAt: string
  windowDays: 30
  overview: {
    total: number
    bySubject: { subject: string; count: number }[]
    byQuestionType: { type: string; count: number }[]
  }
  weakPoints: {
    knowledgePoint: string
    subject: string
    occurrences: number
    diagnosis: string
  }[]
  errorPatterns: {
    pattern: string
    evidence: string
    fileRefs: string[]
  }[]
  actionPlan: {
    priority: "高" | "中" | "低"
    action: string
    estimatedGain: string
    targetWeakPoint?: string
  }[]
}

export type GrowthReport = {
  generatedAt: string
  windowDays: 30
  trajectory: {
    filesUploaded: number
    subjectsCovered: string[]
    activeDays: number
  }
  scores: {
    subject: string
    homeworkAvg: number
    examLatest: { value: number; max: number; date: string } | null
    weeklySeries: number[]
  }[]
  emotionTrend: {
    week: 1 | 2 | 3 | 4
    dominant: string
    summary: string
  }[]
  highlights: string[]
  parentAdvice: {
    strengthen: string[]
    remind: string[]
    encourage: string[]
  }
}

export type ReportType = "wrong-questions" | "growth"

export type ReportEnvelope =
  | { ok: true; report: WrongQuestionReport }
  | { ok: true; report: GrowthReport }
  | { ok: false; error: string }
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors related to the new file.

- [ ] **Step 3: Commit**

```bash
git add lib/reportTypes.ts
git commit -m "feat(reports): add report type contracts"
```

---

## Task 2: Mock scores + 4-week emotion history module

**Files:**
- Create: `deliclaw-demo/lib/mockScores.ts`
- Create: `deliclaw-demo/lib/mockScores.test.mts`

- [ ] **Step 1: Write failing test**

Create `lib/mockScores.test.mts`:

```ts
import test from "node:test"
import assert from "node:assert/strict"

import {
  MOCK_SCORES,
  MOCK_EMOTION_HISTORY,
  getScoresForWindow,
} from "./mockScores.ts"

test("MOCK_SCORES covers all 5 subjects", () => {
  const subjects = new Set(MOCK_SCORES.map((s) => s.subject))
  assert.equal(subjects.size, 5)
  for (const subj of ["语文", "数学", "英语", "物理", "化学"]) {
    assert.ok(subjects.has(subj as any), `missing ${subj}`)
  }
})

test("MOCK_SCORES has at least 50 entries spread over 30 days", () => {
  assert.ok(MOCK_SCORES.length >= 50, `expected >= 50, got ${MOCK_SCORES.length}`)
  const dates = MOCK_SCORES.map((s) => s.date).sort()
  const span = (new Date(dates[dates.length - 1]).getTime() - new Date(dates[0]).getTime()) / (24 * 3600 * 1000)
  assert.ok(span <= 30 && span >= 20, `span out of range: ${span}`)
})

test("MOCK_SCORES values are within [0, max] for each entry", () => {
  for (const s of MOCK_SCORES) {
    assert.ok(s.value >= 0 && s.value <= s.max, `invalid value ${s.value}/${s.max} for ${s.id}`)
  }
})

test("getScoresForWindow returns ascending dates and respects window", () => {
  const out = getScoresForWindow(30)
  assert.ok(out.length > 0)
  for (let i = 1; i < out.length; i++) {
    assert.ok(out[i - 1].date <= out[i].date, `dates not ascending at ${i}`)
  }
})

test("MOCK_EMOTION_HISTORY has exactly 4 weekly entries with valid weeks", () => {
  assert.equal(MOCK_EMOTION_HISTORY.length, 4)
  assert.deepEqual(
    MOCK_EMOTION_HISTORY.map((e) => e.week),
    [1, 2, 3, 4]
  )
  for (const entry of MOCK_EMOTION_HISTORY) {
    assert.ok(typeof entry.dominant === "string" && entry.dominant.length > 0)
  }
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test lib/mockScores.test.mts`
Expected: FAIL with module-not-found on `./mockScores.ts`.

- [ ] **Step 3: Write the implementation**

Create `lib/mockScores.ts`:

```ts
export type ScoreType = "homework" | "quiz" | "exam"
export type Subject = "语文" | "数学" | "英语" | "物理" | "化学"

export type ScoreEntry = {
  id: string
  subject: Subject
  type: ScoreType
  value: number
  max: number
  date: string // ISO yyyy-mm-dd
  comment?: string
}

export type WeeklyEmotion = {
  week: 1 | 2 | 3 | 4
  dominant: string
}

// 4 weeks ago up to today, 30-day window. Demo numbers crafted so:
// - 数学 dips week 2, recovers week 4
// - 英语 stable
// - 物理 occasional low (week 3)
// - 语文 slight upward trend
// - 化学 very stable mid-range
function isoNDaysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

export const MOCK_SCORES: ScoreEntry[] = [
  // ---- Week 1 (28-22 days ago) ----
  { id: "s_001", subject: "语文", type: "homework", value: 88, max: 100, date: isoNDaysAgo(28) },
  { id: "s_002", subject: "数学", type: "homework", value: 92, max: 100, date: isoNDaysAgo(28), comment: "几何题答得不错" },
  { id: "s_003", subject: "英语", type: "homework", value: 90, max: 100, date: isoNDaysAgo(27) },
  { id: "s_004", subject: "物理", type: "homework", value: 85, max: 100, date: isoNDaysAgo(27) },
  { id: "s_005", subject: "化学", type: "homework", value: 82, max: 100, date: isoNDaysAgo(26) },
  { id: "s_006", subject: "语文", type: "quiz", value: 84, max: 100, date: isoNDaysAgo(25) },
  { id: "s_007", subject: "数学", type: "homework", value: 90, max: 100, date: isoNDaysAgo(25) },
  { id: "s_008", subject: "英语", type: "quiz", value: 88, max: 100, date: isoNDaysAgo(24) },
  { id: "s_009", subject: "物理", type: "homework", value: 86, max: 100, date: isoNDaysAgo(24) },
  { id: "s_010", subject: "化学", type: "homework", value: 80, max: 100, date: isoNDaysAgo(23) },
  { id: "s_011", subject: "数学", type: "exam", value: 102, max: 120, date: isoNDaysAgo(22), comment: "月考一" },
  { id: "s_012", subject: "语文", type: "homework", value: 87, max: 100, date: isoNDaysAgo(22) },

  // ---- Week 2 (21-15 days ago) — 数学 dip, 物理 stable ----
  { id: "s_013", subject: "数学", type: "homework", value: 76, max: 100, date: isoNDaysAgo(21), comment: "压轴题没做完" },
  { id: "s_014", subject: "英语", type: "homework", value: 89, max: 100, date: isoNDaysAgo(21) },
  { id: "s_015", subject: "物理", type: "homework", value: 84, max: 100, date: isoNDaysAgo(20) },
  { id: "s_016", subject: "语文", type: "homework", value: 89, max: 100, date: isoNDaysAgo(20) },
  { id: "s_017", subject: "化学", type: "homework", value: 81, max: 100, date: isoNDaysAgo(19) },
  { id: "s_018", subject: "数学", type: "homework", value: 72, max: 100, date: isoNDaysAgo(19), comment: "二次函数还没掌握" },
  { id: "s_019", subject: "英语", type: "quiz", value: 91, max: 100, date: isoNDaysAgo(18) },
  { id: "s_020", subject: "物理", type: "quiz", value: 80, max: 100, date: isoNDaysAgo(17) },
  { id: "s_021", subject: "数学", type: "quiz", value: 70, max: 100, date: isoNDaysAgo(16) },
  { id: "s_022", subject: "化学", type: "homework", value: 83, max: 100, date: isoNDaysAgo(16) },
  { id: "s_023", subject: "语文", type: "homework", value: 90, max: 100, date: isoNDaysAgo(15) },

  // ---- Week 3 (14-8 days ago) — 物理 low, 数学 still recovering ----
  { id: "s_024", subject: "数学", type: "homework", value: 78, max: 100, date: isoNDaysAgo(14) },
  { id: "s_025", subject: "英语", type: "homework", value: 90, max: 100, date: isoNDaysAgo(14) },
  { id: "s_026", subject: "物理", type: "homework", value: 68, max: 100, date: isoNDaysAgo(13), comment: "电路图老错" },
  { id: "s_027", subject: "化学", type: "homework", value: 82, max: 100, date: isoNDaysAgo(13) },
  { id: "s_028", subject: "语文", type: "homework", value: 91, max: 100, date: isoNDaysAgo(12) },
  { id: "s_029", subject: "数学", type: "homework", value: 82, max: 100, date: isoNDaysAgo(12) },
  { id: "s_030", subject: "物理", type: "exam", value: 90, max: 120, date: isoNDaysAgo(11), comment: "月考二" },
  { id: "s_031", subject: "英语", type: "exam", value: 132, max: 150, date: isoNDaysAgo(11), comment: "月考二" },
  { id: "s_032", subject: "化学", type: "quiz", value: 84, max: 100, date: isoNDaysAgo(10) },
  { id: "s_033", subject: "语文", type: "homework", value: 92, max: 100, date: isoNDaysAgo(9) },
  { id: "s_034", subject: "数学", type: "homework", value: 80, max: 100, date: isoNDaysAgo(9) },
  { id: "s_035", subject: "英语", type: "homework", value: 91, max: 100, date: isoNDaysAgo(8) },

  // ---- Week 4 (7-0 days ago) — 数学 recovers, 物理 still need attention ----
  { id: "s_036", subject: "数学", type: "homework", value: 88, max: 100, date: isoNDaysAgo(7), comment: "重做后大有改善" },
  { id: "s_037", subject: "物理", type: "homework", value: 78, max: 100, date: isoNDaysAgo(7) },
  { id: "s_038", subject: "化学", type: "homework", value: 85, max: 100, date: isoNDaysAgo(6) },
  { id: "s_039", subject: "语文", type: "homework", value: 93, max: 100, date: isoNDaysAgo(6) },
  { id: "s_040", subject: "英语", type: "homework", value: 92, max: 100, date: isoNDaysAgo(5) },
  { id: "s_041", subject: "数学", type: "quiz", value: 90, max: 100, date: isoNDaysAgo(5) },
  { id: "s_042", subject: "物理", type: "quiz", value: 76, max: 100, date: isoNDaysAgo(4) },
  { id: "s_043", subject: "化学", type: "homework", value: 86, max: 100, date: isoNDaysAgo(4) },
  { id: "s_044", subject: "语文", type: "quiz", value: 91, max: 100, date: isoNDaysAgo(3) },
  { id: "s_045", subject: "英语", type: "quiz", value: 93, max: 100, date: isoNDaysAgo(3) },
  { id: "s_046", subject: "数学", type: "homework", value: 92, max: 100, date: isoNDaysAgo(2), comment: "二次函数已掌握" },
  { id: "s_047", subject: "物理", type: "homework", value: 80, max: 100, date: isoNDaysAgo(2) },
  { id: "s_048", subject: "化学", type: "homework", value: 87, max: 100, date: isoNDaysAgo(1) },
  { id: "s_049", subject: "语文", type: "homework", value: 94, max: 100, date: isoNDaysAgo(1) },
  { id: "s_050", subject: "英语", type: "homework", value: 94, max: 100, date: isoNDaysAgo(0) },
  { id: "s_051", subject: "数学", type: "homework", value: 91, max: 100, date: isoNDaysAgo(0) },
]

export const MOCK_EMOTION_HISTORY: WeeklyEmotion[] = [
  { week: 1, dominant: "好奇" },
  { week: 2, dominant: "焦虑" },
  { week: 3, dominant: "平静" },
  { week: 4, dominant: "满足" },
]

export function getScoresForWindow(days: number): ScoreEntry[] {
  const cutoff = isoNDaysAgo(days)
  return MOCK_SCORES.filter((s) => s.date >= cutoff).sort((a, b) =>
    a.date.localeCompare(b.date)
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test lib/mockScores.test.mts`
Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/mockScores.ts lib/mockScores.test.mts
git commit -m "feat(reports): add mock scores and 4-week emotion history"
```

---

## Task 3: Aggregation pure functions + tests

These are the deterministic computations the server runs before calling the LLM.

**Files:**
- Create: `deliclaw-demo/lib/reportAggregation.ts`
- Create: `deliclaw-demo/lib/reportAggregation.test.mts`

- [ ] **Step 1: Write failing test**

Create `lib/reportAggregation.test.mts`:

```ts
import test from "node:test"
import assert from "node:assert/strict"

import {
  aggregateFileOverview,
  aggregateScores,
  buildEmotionTrendSkeleton,
  countActiveDays,
} from "./reportAggregation.ts"
import type { ScoreEntry } from "./mockScores.ts"

const SAMPLE_FILES = [
  { subject: "数学", questionType: "选择题", knowledgePoints: ["二次函数"], canonicalName: "math-1", description: "" },
  { subject: "数学", questionType: "选择题", knowledgePoints: ["二次函数"], canonicalName: "math-2", description: "" },
  { subject: "英语", questionType: "阅读", knowledgePoints: ["细节题"], canonicalName: "eng-1", description: "" },
  { subject: "数学", questionType: "解答题", knowledgePoints: ["几何"], canonicalName: "math-3", description: "" },
]

test("aggregateFileOverview groups by subject and questionType", () => {
  const out = aggregateFileOverview(SAMPLE_FILES)
  assert.equal(out.total, 4)
  const mathRow = out.bySubject.find((r) => r.subject === "数学")
  assert.equal(mathRow?.count, 3)
  const choiceRow = out.byQuestionType.find((r) => r.type === "选择题")
  assert.equal(choiceRow?.count, 2)
})

test("aggregateFileOverview handles empty input", () => {
  const out = aggregateFileOverview([])
  assert.equal(out.total, 0)
  assert.deepEqual(out.bySubject, [])
  assert.deepEqual(out.byQuestionType, [])
})

const SAMPLE_SCORES: ScoreEntry[] = [
  { id: "a1", subject: "数学", type: "homework", value: 80, max: 100, date: "2026-04-10" },
  { id: "a2", subject: "数学", type: "homework", value: 90, max: 100, date: "2026-04-17" },
  { id: "a3", subject: "数学", type: "homework", value: 70, max: 100, date: "2026-04-24" },
  { id: "a4", subject: "数学", type: "exam", value: 108, max: 120, date: "2026-05-01" },
  { id: "a5", subject: "英语", type: "homework", value: 85, max: 100, date: "2026-04-10" },
]

test("aggregateScores normalizes to 0-100 percentile and produces 4-week series", () => {
  const out = aggregateScores(SAMPLE_SCORES, "2026-05-07")
  const math = out.find((s) => s.subject === "数学")
  assert.ok(math)
  assert.equal(math!.weeklySeries.length, 4)
  assert.equal(math!.examLatest?.value, 108)
  assert.equal(math!.examLatest?.max, 120)
  // homeworkAvg averages only homework entries (80, 90, 70) = 80
  assert.equal(math!.homeworkAvg, 80)
})

test("aggregateScores fills missing weeks by carrying forward last value", () => {
  const sparse: ScoreEntry[] = [
    { id: "x1", subject: "数学", type: "homework", value: 60, max: 100, date: "2026-04-10" },
    // weeks 2-4 missing
  ]
  const out = aggregateScores(sparse, "2026-05-07")
  const math = out.find((s) => s.subject === "数学")
  assert.ok(math)
  assert.equal(math!.weeklySeries[0], 60)
  assert.equal(math!.weeklySeries[1], 60)
  assert.equal(math!.weeklySeries[2], 60)
  assert.equal(math!.weeklySeries[3], 60)
})

test("buildEmotionTrendSkeleton returns 4 entries each missing summary", () => {
  const skeleton = buildEmotionTrendSkeleton([
    { week: 1, dominant: "好奇" },
    { week: 2, dominant: "焦虑" },
    { week: 3, dominant: "平静" },
    { week: 4, dominant: "满足" },
  ])
  assert.equal(skeleton.length, 4)
  for (const entry of skeleton) {
    assert.equal(entry.summary, "")
    assert.ok(["好奇", "焦虑", "平静", "满足"].includes(entry.dominant))
  }
})

test("countActiveDays counts unique date entries from scores", () => {
  const days = countActiveDays(SAMPLE_SCORES)
  assert.equal(days, 5) // 5 distinct dates
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test lib/reportAggregation.test.mts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `lib/reportAggregation.ts`:

```ts
import type { ScoreEntry, WeeklyEmotion } from "./mockScores.ts"
import type { GrowthReport, WrongQuestionReport } from "./reportTypes.ts"

export type FileForOverview = {
  subject: string
  questionType: string
  knowledgePoints: string[]
  canonicalName: string
  description: string
}

export function aggregateFileOverview(
  files: FileForOverview[]
): WrongQuestionReport["overview"] {
  const subjectMap = new Map<string, number>()
  const typeMap = new Map<string, number>()
  for (const f of files) {
    if (f.subject) subjectMap.set(f.subject, (subjectMap.get(f.subject) ?? 0) + 1)
    if (f.questionType) typeMap.set(f.questionType, (typeMap.get(f.questionType) ?? 0) + 1)
  }
  const bySubject = Array.from(subjectMap.entries())
    .map(([subject, count]) => ({ subject, count }))
    .sort((a, b) => b.count - a.count)
  const byQuestionType = Array.from(typeMap.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
  return { total: files.length, bySubject, byQuestionType }
}

function weekIndexFromDate(scoreDate: string, todayIso: string): number | null {
  // Returns 0..3 for the 4 weeks ending today (inclusive), or null if outside.
  const today = new Date(todayIso)
  const score = new Date(scoreDate)
  const daysAgo = Math.floor((today.getTime() - score.getTime()) / (24 * 3600 * 1000))
  if (daysAgo < 0 || daysAgo > 27) return null
  // week 0 = days 0-6 (most recent), week 3 = days 21-27 (oldest of the 4)
  const w = Math.floor(daysAgo / 7)
  return Math.min(3, w)
}

function pct(value: number, max: number): number {
  if (max <= 0) return 0
  return Math.round((value / max) * 1000) / 10 // 1 decimal place
}

export function aggregateScores(
  scores: ScoreEntry[],
  todayIso: string = new Date().toISOString().slice(0, 10)
): GrowthReport["scores"] {
  const bySubject = new Map<string, ScoreEntry[]>()
  for (const s of scores) {
    if (!bySubject.has(s.subject)) bySubject.set(s.subject, [])
    bySubject.get(s.subject)!.push(s)
  }
  const out: GrowthReport["scores"] = []
  for (const [subject, list] of bySubject) {
    const homeworkPcts = list.filter((s) => s.type === "homework").map((s) => pct(s.value, s.max))
    const homeworkAvg =
      homeworkPcts.length === 0
        ? 0
        : Math.round((homeworkPcts.reduce((a, b) => a + b, 0) / homeworkPcts.length) * 10) / 10

    const exams = list.filter((s) => s.type === "exam").sort((a, b) => a.date.localeCompare(b.date))
    const lastExam = exams[exams.length - 1]
    const examLatest = lastExam
      ? { value: lastExam.value, max: lastExam.max, date: lastExam.date }
      : null

    // weeklySeries: index 0 = oldest week, index 3 = newest week (recent right side on chart)
    const buckets: number[][] = [[], [], [], []]
    for (const s of list) {
      const w = weekIndexFromDate(s.date, todayIso)
      if (w === null) continue
      // Translate so index 0 = oldest of last 4 weeks
      const oldestFirst = 3 - w
      buckets[oldestFirst].push(pct(s.value, s.max))
    }
    const weeklySeries: number[] = []
    let lastSeen = homeworkAvg || 0
    for (const bucket of buckets) {
      if (bucket.length === 0) {
        weeklySeries.push(lastSeen)
      } else {
        const avg = Math.round((bucket.reduce((a, b) => a + b, 0) / bucket.length) * 10) / 10
        weeklySeries.push(avg)
        lastSeen = avg
      }
    }

    out.push({ subject, homeworkAvg, examLatest, weeklySeries })
  }
  return out.sort((a, b) => a.subject.localeCompare(b.subject))
}

export function buildEmotionTrendSkeleton(
  history: WeeklyEmotion[]
): GrowthReport["emotionTrend"] {
  return history
    .slice()
    .sort((a, b) => a.week - b.week)
    .map((h) => ({ week: h.week, dominant: h.dominant, summary: "" }))
}

export function countActiveDays(scores: ScoreEntry[]): number {
  return new Set(scores.map((s) => s.date)).size
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test lib/reportAggregation.test.mts`
Expected: all 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/reportAggregation.ts lib/reportAggregation.test.mts
git commit -m "feat(reports): add deterministic aggregation helpers"
```

---

## Task 4: Install recharts

**Files:**
- Modify: `deliclaw-demo/package.json` (and lockfile)

- [ ] **Step 1: Install recharts**

Run from `deliclaw-demo/`:
```bash
npm install recharts
```

Expected: `recharts` appears in `dependencies` of `package.json`. May add ~100KB gzipped to client bundle.

- [ ] **Step 2: Verify dev server still starts**

Run: `npm run build`
Expected: build completes (it may already complete without `recharts` being imported anywhere yet — that's fine).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(reports): add recharts dependency"
```

---

## Task 5: Add report prompt strings

**Files:**
- Create: `deliclaw-demo/lib/reportPrompts.ts`

No test — these are static strings. They are validated indirectly by the API endpoint working.

- [ ] **Step 1: Create prompt file**

Create `lib/reportPrompts.ts`:

```ts
export const WRONG_QUESTION_REPORT_PROMPT = `你是一名教学辅导分析师。基于学生的错题清单，输出严格 JSON。

输出 JSON 必须只包含三个字段：
{
  "weakPoints": [{ "knowledgePoint": string, "subject": string, "occurrences": number, "diagnosis": string }],
  "errorPatterns": [{ "pattern": string, "evidence": string, "fileRefs": string[] }],
  "actionPlan": [{ "priority": "高"|"中"|"低", "action": string, "estimatedGain": string, "targetWeakPoint"?: string }]
}

要求：
- weakPoints 最多 5 条；按 occurrences 由高到低排
- errorPatterns 最多 4 条，pattern 是简洁短语（如"单位换算遗漏"）；evidence 是跨题归纳；fileRefs 引用 canonicalName
- actionPlan 最多 5 条；action 必须具体可执行（如"本周重做二次函数例题 10 道"）；estimatedGain 形如"+5 分"
- 全中文输出
- 只返回 JSON，不要 markdown 代码块、不要解释文字
- 当输入错题数量为 0 时，返回 weakPoints=[] errorPatterns=[] actionPlan=[{"priority":"高","action":"先上传几张错题，AI 才能分析","estimatedGain":"--"}]
`

export const GROWTH_REPORT_PROMPT = `你是一名给家长的成长报告写作者。基于学生近 30 天的学习轨迹、分数、情绪历史，输出严格 JSON。

输出 JSON 必须只包含三个字段：
{
  "emotionTrendSummaries": string[4],
  "highlights": string[],
  "parentAdvice": { "strengthen": string[], "remind": string[], "encourage": string[] }
}

要求：
- emotionTrendSummaries 数组长度恰好 4，每条对应输入中按 week 升序的情绪条目（week 1 -> index 0），用一句话描述孩子那一周的学习状态
- highlights 2-3 条，是学生这个月的真实亮点（可以引用具体科目分数变化）
- parentAdvice 三类各 1-3 条：
  - strengthen：需要加强的具体学科或知识点（基于分数趋势）
  - remind：需要家长留意的状态（基于情绪历史 + 偶发低分）
  - encourage：可以鼓励孩子的具体表扬点（用具体的数据支撑）
- 语气温和，面向家长，避免责备
- 全中文输出
- 只返回 JSON，不要 markdown 代码块、不要解释文字
`
```

- [ ] **Step 2: Commit**

```bash
git add lib/reportPrompts.ts
git commit -m "feat(reports): add report prompts"
```

---

## Task 6: Extend openrouter helper with response_format

**Files:**
- Modify: `deliclaw-demo/lib/server/openrouter.ts`

The existing `openrouterChatJson` works but doesn't pass `response_format`, so the model isn't strictly forced to JSON. Add an optional flag.

- [ ] **Step 1: Add `responseFormat` option to `openrouterChatJson`**

Edit `lib/server/openrouter.ts`. Find the function signature:

```ts
export async function openrouterChatJson<T>(params: {
  model: string
  system: string
  user: string
  timeoutMs?: number
}): Promise<T> {
```

Replace with:

```ts
export async function openrouterChatJson<T>(params: {
  model: string
  system: string
  user: string
  timeoutMs?: number
  responseFormat?: "json_object"
}): Promise<T> {
```

Then find the destructuring line:

```ts
  const { model, system, user, timeoutMs = 20000 } = params
```

Replace with:

```ts
  const { model, system, user, timeoutMs = 20000, responseFormat } = params
```

Then find the body line:

```ts
      body: JSON.stringify({ model, messages, temperature: 0.1 }),
```

Replace with:

```ts
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.1,
        ...(responseFormat ? { response_format: { type: responseFormat } } : {}),
      }),
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Verify existing tests still pass**

Run from `deliclaw-demo/`:
```bash
node --experimental-strip-types --test lib/proxyConvention.test.mts lib/prompts.test.mts
```
Expected: PASS (these files import nothing from openrouter, but smoke-check that the module didn't break compilation elsewhere).

- [ ] **Step 4: Commit**

```bash
git add lib/server/openrouter.ts
git commit -m "feat(openrouter): support response_format option"
```

---

## Task 7: Add `/api/reports/[type]` endpoint

**Files:**
- Create: `deliclaw-demo/app/api/reports/[type]/route.ts`

This is the orchestration layer. It does NOT have a unit test — exercising it requires real LLM calls. Behavior is covered by manual smoke at the end of the plan.

- [ ] **Step 1: Look at how an existing route reads SQLite**

Open `app/api/files/list/route.ts` to understand the pattern for SQLite access. (Read-only; no edits.)

Run: `cat app/api/files/list/route.ts | head -40`
Expected: see how it imports from `lib/server/sqlite.ts` and queries.

- [ ] **Step 2: Create the endpoint**

Create `app/api/reports/[type]/route.ts`:

```ts
import { NextResponse } from "next/server"
import type { MemoryEntry } from "@/types"
import { openrouterChatJson } from "@/lib/server/openrouter"
import {
  aggregateFileOverview,
  aggregateScores,
  buildEmotionTrendSkeleton,
  countActiveDays,
} from "@/lib/reportAggregation"
import type { FileForOverview } from "@/lib/reportAggregation"
import { getScoresForWindow, MOCK_EMOTION_HISTORY } from "@/lib/mockScores"
import {
  WRONG_QUESTION_REPORT_PROMPT,
  GROWTH_REPORT_PROMPT,
} from "@/lib/reportPrompts"
import type {
  GrowthReport,
  ReportType,
  WrongQuestionReport,
} from "@/lib/reportTypes"
import { listFiles } from "@/lib/server/sqlite"

const TEXT_MODEL = process.env.OPENROUTER_CHAT_MODEL_TEXT ?? "qwen/qwen3.6-plus"

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

type SqliteFileTags = {
  subject?: string
  questionType?: string
  knowledgePoints?: string[]
  date?: string
}

function readFilesForOverview(): FileForOverview[] {
  try {
    const rows = listFiles()
    return rows.map((r) => {
      let tags: SqliteFileTags = {}
      try {
        tags = JSON.parse(r.tags_json || "{}") as SqliteFileTags
      } catch {
        tags = {}
      }
      return {
        subject: tags.subject ?? "",
        questionType: tags.questionType ?? "",
        knowledgePoints: Array.isArray(tags.knowledgePoints) ? tags.knowledgePoints : [],
        canonicalName: r.title || r.fileName,
        description: r.description ?? "",
      }
    })
  } catch (err) {
    console.error("[reports] readFilesForOverview failed:", err)
    return []
  }
}

async function buildWrongQuestionReport(): Promise<WrongQuestionReport> {
  const files = readFilesForOverview()
  const overview = aggregateFileOverview(files)

  const userPayload = JSON.stringify({
    overview,
    files: files.map((f) => ({
      canonicalName: f.canonicalName,
      subject: f.subject,
      questionType: f.questionType,
      knowledgePoints: f.knowledgePoints,
      description: f.description,
    })),
  })

  type LlmOut = {
    weakPoints: WrongQuestionReport["weakPoints"]
    errorPatterns: WrongQuestionReport["errorPatterns"]
    actionPlan: WrongQuestionReport["actionPlan"]
  }
  const llm = await openrouterChatJson<LlmOut>({
    model: TEXT_MODEL,
    system: WRONG_QUESTION_REPORT_PROMPT,
    user: userPayload,
    responseFormat: "json_object",
  })

  return {
    generatedAt: new Date().toISOString(),
    windowDays: 30,
    overview,
    weakPoints: Array.isArray(llm.weakPoints) ? llm.weakPoints : [],
    errorPatterns: Array.isArray(llm.errorPatterns) ? llm.errorPatterns : [],
    actionPlan: Array.isArray(llm.actionPlan) ? llm.actionPlan : [],
  }
}

async function buildGrowthReport(memorySnapshot: MemoryEntry): Promise<GrowthReport> {
  const today = todayIso()
  const files = readFilesForOverview()
  const scoresWindow = getScoresForWindow(30)
  const scores = aggregateScores(scoresWindow, today)
  const emotionSkeleton = buildEmotionTrendSkeleton(MOCK_EMOTION_HISTORY)

  const trajectory = {
    filesUploaded: files.length,
    subjectsCovered: Array.from(new Set(files.map((f) => f.subject).filter(Boolean))),
    activeDays: countActiveDays(scoresWindow),
  }

  const userPayload = JSON.stringify({
    trajectory,
    scores,
    emotionTrend: emotionSkeleton.map((e) => ({ week: e.week, dominant: e.dominant })),
    memory: {
      factual: memorySnapshot.factual ?? {},
      inferred: memorySnapshot.inferred ?? {},
    },
  })

  type LlmOut = {
    emotionTrendSummaries: string[]
    highlights: string[]
    parentAdvice: GrowthReport["parentAdvice"]
  }
  const llm = await openrouterChatJson<LlmOut>({
    model: TEXT_MODEL,
    system: GROWTH_REPORT_PROMPT,
    user: userPayload,
    responseFormat: "json_object",
  })

  const summaries = Array.isArray(llm.emotionTrendSummaries) ? llm.emotionTrendSummaries : []
  const emotionTrend = emotionSkeleton.map((e, i) => ({
    ...e,
    summary: typeof summaries[i] === "string" ? summaries[i] : "",
  }))

  return {
    generatedAt: new Date().toISOString(),
    windowDays: 30,
    trajectory,
    scores,
    emotionTrend,
    highlights: Array.isArray(llm.highlights) ? llm.highlights : [],
    parentAdvice: {
      strengthen: llm.parentAdvice?.strengthen ?? [],
      remind: llm.parentAdvice?.remind ?? [],
      encourage: llm.parentAdvice?.encourage ?? [],
    },
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ type: string }> }
): Promise<Response> {
  const { type } = await context.params
  const reportType = type as ReportType

  let body: any = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }
  const memorySnapshot: MemoryEntry =
    body && typeof body === "object" && body.memorySnapshot ? body.memorySnapshot : {}

  try {
    if (reportType === "wrong-questions") {
      const report = await buildWrongQuestionReport()
      return NextResponse.json({ ok: true, report })
    }
    if (reportType === "growth") {
      const report = await buildGrowthReport(memorySnapshot)
      return NextResponse.json({ ok: true, report })
    }
    return NextResponse.json({ ok: false, error: "unknown_report_type" }, { status: 400 })
  } catch (err) {
    console.error(`[reports/${reportType}] build failed:`, err)
    const msg = err instanceof Error ? err.message : "report_build_failed"
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/reports
git commit -m "feat(reports): add /api/reports/[type] endpoint"
```

> Note: `listFiles()` already exists in `lib/server/sqlite.ts` (verified during plan authoring). It returns rows with `tags_json` (a JSON string containing `subject` / `questionType` / `knowledgePoints` / `date`). The `readFilesForOverview` helper above parses it into the flat shape `aggregateFileOverview` expects.

---

## Task 8: WrongQuestionReportView component + test

**Files:**
- Create: `deliclaw-demo/components/WrongQuestionReportView.tsx`
- Create: `deliclaw-demo/components/WrongQuestionReportView.test.mts`

- [ ] **Step 1: Write failing test (regex-match the source — same convention as `DatabaseHub.test.mts`)**

The project's component tests do source-text regex matching, not React SSR. The `--experimental-strip-types` loader does not handle `.tsx` imports anyway, so component-test files never import `.tsx`.

Create `components/WrongQuestionReportView.test.mts`:

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test components/WrongQuestionReportView.test.mts`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Write the component**

Create `components/WrongQuestionReportView.tsx`:

```tsx
"use client"

import type { WrongQuestionReport } from "@/lib/reportTypes"
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

const SUBJECT_COLORS = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4"]

interface Props {
  report: WrongQuestionReport
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="h-3 w-1 rounded-full bg-indigo-500" />
      <h3 className="text-sm font-bold text-slate-800">{children}</h3>
    </div>
  )
}

function OverviewCard({ overview }: { overview: WrongQuestionReport["overview"] }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <SectionTitle>错题总览</SectionTitle>
      <div className="mb-3 text-xs text-slate-500">共 {overview.total} 道</div>
      <div className="grid grid-cols-2 gap-3">
        <div className="h-44">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">学科分布</p>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={overview.bySubject}
                dataKey="count"
                nameKey="subject"
                outerRadius={50}
                label={({ subject }) => subject}
              >
                {overview.bySubject.map((_, i) => (
                  <Cell key={i} fill={SUBJECT_COLORS[i % SUBJECT_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="h-44">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">题型分布</p>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={overview.byQuestionType}>
              <XAxis dataKey="type" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#6366F1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  )
}

function WeakPointsCard({ weakPoints }: { weakPoints: WrongQuestionReport["weakPoints"] }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <SectionTitle>薄弱知识点</SectionTitle>
      {weakPoints.length === 0 ? (
        <p className="text-xs text-slate-400">暂无足够数据</p>
      ) : (
        <div className="space-y-2">
          {weakPoints.map((wp, i) => (
            <div key={i} className="rounded-xl border border-indigo-50 bg-indigo-50/30 p-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-bold text-slate-800">{wp.knowledgePoint}</span>
                <span className="text-[10px] text-slate-500">
                  {wp.subject} · 出现 {wp.occurrences} 次
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

function ErrorPatternsCard({ errorPatterns }: { errorPatterns: WrongQuestionReport["errorPatterns"] }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <SectionTitle>错误模式</SectionTitle>
      {errorPatterns.length === 0 ? (
        <p className="text-xs text-slate-400">暂未识别出共性错误模式</p>
      ) : (
        <div className="space-y-2">
          {errorPatterns.map((p, i) => (
            <div key={i} className="rounded-xl border border-amber-100 bg-amber-50/40 p-3">
              <p className="text-sm font-bold text-amber-800">{p.pattern}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{p.evidence}</p>
              {p.fileRefs.length > 0 && (
                <p className="mt-1 text-[10px] text-slate-400">涉及：{p.fileRefs.join("、")}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function priorityColor(priority: "高" | "中" | "低") {
  if (priority === "高") return "bg-red-50 text-red-600 border-red-100"
  if (priority === "中") return "bg-amber-50 text-amber-600 border-amber-100"
  return "bg-emerald-50 text-emerald-600 border-emerald-100"
}

function ActionPlanCard({ actionPlan }: { actionPlan: WrongQuestionReport["actionPlan"] }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <SectionTitle>提分行动</SectionTitle>
      {actionPlan.length === 0 ? (
        <p className="text-xs text-slate-400">暂无行动建议</p>
      ) : (
        <div className="space-y-2">
          {actionPlan.map((a, i) => (
            <div key={i} className="flex items-start gap-2 rounded-xl border border-slate-100 p-3">
              <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold ${priorityColor(a.priority)}`}>
                {a.priority}
              </span>
              <div className="flex-1">
                <p className="text-sm leading-relaxed text-slate-800">{a.action}</p>
                <p className="mt-1 text-[10px] text-slate-500">
                  预估提升 {a.estimatedGain}
                  {a.targetWeakPoint ? ` · 目标：${a.targetWeakPoint}` : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default function WrongQuestionReportView({ report }: Props) {
  return (
    <div className="space-y-3">
      <OverviewCard overview={report.overview} />
      <WeakPointsCard weakPoints={report.weakPoints} />
      <ErrorPatternsCard errorPatterns={report.errorPatterns} />
      <ActionPlanCard actionPlan={report.actionPlan} />
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test components/WrongQuestionReportView.test.mts`
Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add components/WrongQuestionReportView.tsx components/WrongQuestionReportView.test.mts
git commit -m "feat(reports): add WrongQuestionReportView"
```

---

## Task 9: GrowthReportView component

**Files:**
- Create: `deliclaw-demo/components/GrowthReportView.tsx`

No standalone test (rendering is covered indirectly by Task 10's panel test plus the wrong-question test pattern is sufficient validation that recharts works).

- [ ] **Step 1: Create the component**

Create `components/GrowthReportView.tsx`:

```tsx
"use client"

import type { GrowthReport } from "@/lib/reportTypes"
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

const SUBJECT_COLORS = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"]

interface Props {
  report: GrowthReport
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="h-3 w-1 rounded-full bg-emerald-500" />
      <h3 className="text-sm font-bold text-slate-800">{children}</h3>
    </div>
  )
}

function TrajectoryCard({ trajectory }: { trajectory: GrowthReport["trajectory"] }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <SectionTitle>本月学习轨迹</SectionTitle>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-slate-50 p-3 text-center">
          <p className="text-xl font-black text-slate-800">{trajectory.filesUploaded}</p>
          <p className="text-[10px] text-slate-500">上传文件</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 text-center">
          <p className="text-xl font-black text-slate-800">{trajectory.subjectsCovered.length}</p>
          <p className="text-[10px] text-slate-500">覆盖学科</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 text-center">
          <p className="text-xl font-black text-slate-800">{trajectory.activeDays}</p>
          <p className="text-[10px] text-slate-500">活跃天数</p>
        </div>
      </div>
    </section>
  )
}

function ScoreTrendCard({ scores }: { scores: GrowthReport["scores"] }) {
  // Reshape into [{ week: "W1", 数学: 80, 英语: 90, ... }, ...]
  const weeks = ["W1", "W2", "W3", "W4"]
  const data = weeks.map((label, i) => {
    const row: Record<string, string | number> = { week: label }
    for (const s of scores) row[s.subject] = s.weeklySeries[i] ?? 0
    return row
  })

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <SectionTitle>本月分数趋势（百分制）</SectionTitle>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" tick={{ fontSize: 11 }} />
            <YAxis domain={[60, 100]} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {scores.map((s, i) => (
              <Line
                key={s.subject}
                type="monotone"
                dataKey={s.subject}
                stroke={SUBJECT_COLORS[i % SUBJECT_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {scores.map((s) => (
          <div key={s.subject} className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5">
            <p className="text-[10px] text-slate-400">{s.subject}</p>
            <p className="text-xs font-bold text-slate-700">作业均分 {s.homeworkAvg}</p>
            {s.examLatest && (
              <p className="text-[10px] text-slate-500">
                最近考试 {s.examLatest.value}/{s.examLatest.max}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

function EmotionTrendCard({ emotionTrend }: { emotionTrend: GrowthReport["emotionTrend"] }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <SectionTitle>情绪轨迹</SectionTitle>
      <div className="space-y-2">
        {emotionTrend.map((w) => (
          <div key={w.week} className="flex items-start gap-2 rounded-xl border border-slate-100 p-3">
            <span className="shrink-0 rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-600">
              第 {w.week} 周
            </span>
            <div className="flex-1">
              <p className="text-xs font-bold text-slate-700">主导情绪：{w.dominant}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{w.summary}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function HighlightsCard({ highlights }: { highlights: string[] }) {
  return (
    <section className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 shadow-sm">
      <SectionTitle>亮点与进步</SectionTitle>
      {highlights.length === 0 ? (
        <p className="text-xs text-slate-400">暂未识别出明显亮点</p>
      ) : (
        <ul className="space-y-1.5">
          {highlights.map((h, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
              <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              <span className="leading-relaxed">{h}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function ParentAdviceCard({ advice }: { advice: GrowthReport["parentAdvice"] }) {
  const cols: { title: string; items: string[]; color: string }[] = [
    { title: "需要加强", items: advice.strengthen, color: "bg-red-50 text-red-700 border-red-100" },
    { title: "需要提醒", items: advice.remind, color: "bg-amber-50 text-amber-700 border-amber-100" },
    { title: "需要鼓励", items: advice.encourage, color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  ]
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <SectionTitle>给家长的建议</SectionTitle>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cols.map((c) => (
          <div key={c.title} className={`rounded-xl border p-3 ${c.color}`}>
            <p className="text-xs font-bold mb-2">{c.title}</p>
            {c.items.length === 0 ? (
              <p className="text-[11px] opacity-70">暂无</p>
            ) : (
              <ul className="space-y-1">
                {c.items.map((item, i) => (
                  <li key={i} className="text-[11px] leading-relaxed">· {item}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

export default function GrowthReportView({ report }: Props) {
  return (
    <div className="space-y-3">
      <TrajectoryCard trajectory={report.trajectory} />
      <ScoreTrendCard scores={report.scores} />
      <EmotionTrendCard emotionTrend={report.emotionTrend} />
      <HighlightsCard highlights={report.highlights} />
      <ParentAdviceCard advice={report.parentAdvice} />
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/GrowthReportView.tsx
git commit -m "feat(reports): add GrowthReportView"
```

---

## Task 10: Cache helpers (extracted) + ReportCenterPanel + tests

**Files:**
- Create: `deliclaw-demo/lib/reportCache.ts`
- Create: `deliclaw-demo/lib/reportCache.test.mts`
- Create: `deliclaw-demo/components/ReportCenterPanel.tsx`
- Create: `deliclaw-demo/components/ReportCenterPanel.test.mts`

The cache helpers are pure runtime functions and live in `lib/` so the test can import them via the `--experimental-strip-types` loader (which does not handle `.tsx`). The component test follows the project's source-regex convention.

### Step 1-5: Cache helpers + their unit test

- [ ] **Step 1: Write failing cache test**

Create `lib/reportCache.test.mts`:

```ts
import test from "node:test"
import assert from "node:assert/strict"

import {
  REPORT_STORAGE_KEYS,
  readCachedReport,
  writeCachedReport,
  clearCachedReport,
} from "./reportCache.ts"

// Minimal localStorage shim
function installShim() {
  const store = new Map<string, string>()
  ;(globalThis as any).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  }
}

test("REPORT_STORAGE_KEYS exposes both report keys", () => {
  assert.equal(REPORT_STORAGE_KEYS["wrong-questions"], "deliclaw_report_wrong-questions")
  assert.equal(REPORT_STORAGE_KEYS["growth"], "deliclaw_report_growth")
})

test("writeCachedReport / readCachedReport round-trip", () => {
  installShim()
  writeCachedReport("wrong-questions", { generatedAt: "x", windowDays: 30 } as any)
  const back = readCachedReport("wrong-questions")
  assert.equal((back as any).generatedAt, "x")
})

test("clearCachedReport removes the key", () => {
  installShim()
  writeCachedReport("growth", { generatedAt: "y", windowDays: 30 } as any)
  clearCachedReport("growth")
  assert.equal(readCachedReport("growth"), null)
})

test("readCachedReport returns null when missing or invalid", () => {
  installShim()
  assert.equal(readCachedReport("growth"), null)
  ;(globalThis as any).localStorage.setItem("deliclaw_report_growth", "not json")
  assert.equal(readCachedReport("growth"), null)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test lib/reportCache.test.mts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the cache helper module**

Create `lib/reportCache.ts`:

```ts
import type {
  GrowthReport,
  ReportType,
  WrongQuestionReport,
} from "./reportTypes.ts"

export const REPORT_STORAGE_KEYS: Record<ReportType, string> = {
  "wrong-questions": "deliclaw_report_wrong-questions",
  growth: "deliclaw_report_growth",
}

type AnyReport = WrongQuestionReport | GrowthReport

export function readCachedReport<T extends AnyReport = AnyReport>(type: ReportType): T | null {
  try {
    const raw = localStorage.getItem(REPORT_STORAGE_KEYS[type])
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return null
    return parsed as T
  } catch {
    return null
  }
}

export function writeCachedReport(type: ReportType, report: AnyReport) {
  try {
    localStorage.setItem(REPORT_STORAGE_KEYS[type], JSON.stringify(report))
  } catch {
    // ignore quota / unavailable
  }
}

export function clearCachedReport(type: ReportType) {
  try {
    localStorage.removeItem(REPORT_STORAGE_KEYS[type])
  } catch {
    // ignore
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test lib/reportCache.test.mts`
Expected: all 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/reportCache.ts lib/reportCache.test.mts
git commit -m "feat(reports): add localStorage cache helpers"
```

### Step 6-9: ReportCenterPanel component + regex-style test

- [ ] **Step 6: Write failing panel source test**

Create `components/ReportCenterPanel.test.mts`:

```ts
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
```

- [ ] **Step 7: Run test to verify it fails**

Run: `node --experimental-strip-types --test components/ReportCenterPanel.test.mts`
Expected: FAIL — file not found.

- [ ] **Step 8: Create the panel component**

Create `components/ReportCenterPanel.tsx`:

```tsx
"use client"

import { useEffect, useState } from "react"
import type { MemoryEntry } from "@/types"
import type {
  GrowthReport,
  ReportType,
  WrongQuestionReport,
} from "@/lib/reportTypes"
import {
  clearCachedReport,
  readCachedReport,
  writeCachedReport,
} from "@/lib/reportCache"
import WrongQuestionReportView from "./WrongQuestionReportView"
import GrowthReportView from "./GrowthReportView"

type AnyReport = WrongQuestionReport | GrowthReport

interface Props {
  memory: MemoryEntry
}

type Status = "idle" | "loading" | "ready" | "error"

export default function ReportCenterPanel({ memory }: Props) {
  const [active, setActive] = useState<ReportType>("wrong-questions")
  const [report, setReport] = useState<AnyReport | null>(null)
  const [status, setStatus] = useState<Status>("idle")
  const [errMsg, setErrMsg] = useState<string>("")

  // When tab changes, load cached report (or reset to idle)
  useEffect(() => {
    const cached = readCachedReport(active)
    if (cached) {
      setReport(cached)
      setStatus("ready")
    } else {
      setReport(null)
      setStatus("idle")
    }
    setErrMsg("")
  }, [active])

  async function generate() {
    setStatus("loading")
    setErrMsg("")
    try {
      const res = await fetch(`/api/reports/${active}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memorySnapshot: memory }),
      })
      const json = await res.json()
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `HTTP ${res.status}`)
      }
      const r = json.report as AnyReport
      writeCachedReport(active, r)
      setReport(r)
      setStatus("ready")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "未知错误"
      setErrMsg(msg)
      setStatus("error")
    }
  }

  function regenerate() {
    clearCachedReport(active)
    setReport(null)
    generate()
  }

  return (
    <div className="flex h-full flex-col bg-slate-50">
      {/* Tabs */}
      <div className="border-b border-slate-100 bg-white px-6 py-3">
        <div className="inline-flex rounded-xl border border-slate-100 bg-slate-50 p-1">
          {(["wrong-questions", "growth"] as ReportType[]).map((t) => {
            const label = t === "wrong-questions" ? "错题报告" : "成长报告"
            return (
              <button
                key={t}
                type="button"
                onClick={() => setActive(t)}
                className={`rounded-lg px-4 py-1.5 text-xs font-bold transition ${
                  active === t ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-indigo-600"
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {status === "idle" && (
          <EmptyState onGenerate={generate} reportType={active} />
        )}
        {status === "loading" && <LoadingState />}
        {status === "error" && <ErrorState message={errMsg} onRetry={generate} />}
        {status === "ready" && report && (
          <div className="mx-auto max-w-3xl space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-slate-400">
                生成于 {new Date(report.generatedAt).toLocaleString("zh-CN")}
              </p>
              <button
                onClick={regenerate}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-500 hover:bg-slate-50"
              >
                重新生成
              </button>
            </div>
            {active === "wrong-questions" ? (
              <WrongQuestionReportView report={report as WrongQuestionReport} />
            ) : (
              <GrowthReportView report={report as GrowthReport} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState({ onGenerate, reportType }: { onGenerate: () => void; reportType: ReportType }) {
  const title = reportType === "wrong-questions" ? "错题分析报告" : "本月成长报告"
  const desc =
    reportType === "wrong-questions"
      ? "分析最近上传的错题，识别薄弱知识点，给出具体提分行动。"
      : "汇总本月学习轨迹、分数趋势与情绪表现，给家长一份直观的成长报告。"
  return (
    <div className="mx-auto mt-12 max-w-md rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50">
        <svg className="h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-6h13M9 5v6m0-6L4 11l5 6" />
        </svg>
      </div>
      <p className="text-base font-black text-slate-800">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-slate-500">{desc}</p>
      <button
        onClick={onGenerate}
        className="mt-5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
      >
        生成报告
      </button>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="mx-auto max-w-3xl space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-32 animate-pulse rounded-2xl bg-white" />
      ))}
      <p className="text-center text-xs text-slate-400">AI 正在分析…</p>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mx-auto mt-12 max-w-md rounded-2xl border border-red-100 bg-red-50/40 p-6 text-center">
      <p className="text-sm font-bold text-red-600">生成失败</p>
      <p className="mt-2 text-xs text-slate-600">{message}</p>
      <button
        onClick={onRetry}
        className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700"
      >
        重试
      </button>
    </div>
  )
}
```

- [ ] **Step 9: Run panel test to verify it passes**

Run: `node --experimental-strip-types --test components/ReportCenterPanel.test.mts`
Expected: all 6 tests PASS.

- [ ] **Step 10: Commit**

```bash
git add components/ReportCenterPanel.tsx components/ReportCenterPanel.test.mts
git commit -m "feat(reports): add ReportCenterPanel with cache + regenerate"
```

---

## Task 11: Wire third view into page.tsx + ChatPanel

**Files:**
- Modify: `deliclaw-demo/app/page.tsx`
- Modify: `deliclaw-demo/components/ChatPanel.tsx`

- [ ] **Step 1: Extend `activeView` type and storage cleanup in page.tsx**

Edit `app/page.tsx`. Find:

```ts
const [activeView, setActiveView] = useState<"chat" | "files">("chat")
```

Replace with:

```ts
const [activeView, setActiveView] = useState<"chat" | "files" | "reports">("chat")
```

Find the reset block:

```ts
    localStorage.removeItem(MEMORY_STORAGE_KEY)
    localStorage.removeItem(FILES_STORAGE_KEY)
    localStorage.removeItem(STAGE_STORAGE_KEY)
    localStorage.removeItem(PENDING_INFERRED_STORAGE_KEY)
    localStorage.removeItem(FILE_CENTER_ONBOARDING_STORAGE_KEY)
```

Replace with:

```ts
    localStorage.removeItem(MEMORY_STORAGE_KEY)
    localStorage.removeItem(FILES_STORAGE_KEY)
    localStorage.removeItem(STAGE_STORAGE_KEY)
    localStorage.removeItem(PENDING_INFERRED_STORAGE_KEY)
    localStorage.removeItem(FILE_CENTER_ONBOARDING_STORAGE_KEY)
    localStorage.removeItem("deliclaw_report_wrong-questions")
    localStorage.removeItem("deliclaw_report_growth")
```

(The `DatabaseHub` block already gates on `activeView === "chat"`, so no change needed — `reports` view will hide the right pane automatically.)

- [ ] **Step 2: Extend `activeView` type in ChatPanel.tsx**

Edit `components/ChatPanel.tsx`. Find:

```ts
  activeView: "chat" | "files"
  onActiveViewChange: (view: "chat" | "files") => void
```

Replace with:

```ts
  activeView: "chat" | "files" | "reports"
  onActiveViewChange: (view: "chat" | "files" | "reports") => void
```

- [ ] **Step 3: Add the 3rd tab button in ChatPanel header**

Edit `components/ChatPanel.tsx`. Find the existing two-button block (around line 906):

```tsx
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-1 shadow-sm">
          <button
            type="button"
            onClick={() => onActiveViewChange("chat")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeView === "chat"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-indigo-700"
            }`}
          >
            对话
          </button>
          <button
            type="button"
            onClick={() => onActiveViewChange("files")}
            className={`rounded-xl px-4 py-1.5 text-left transition-all ${
              activeView === "files"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-indigo-600 hover:bg-white/70"
            }`}
          >
            <span className="block text-xs font-black">文件中心</span>
            <span className="block text-[9px] font-semibold opacity-70">点我找文件</span>
          </button>
        </div>
```

Replace with:

```tsx
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-1 shadow-sm">
          <button
            type="button"
            onClick={() => onActiveViewChange("chat")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeView === "chat"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-indigo-700"
            }`}
          >
            对话
          </button>
          <button
            type="button"
            onClick={() => onActiveViewChange("files")}
            className={`rounded-xl px-4 py-1.5 text-left transition-all ${
              activeView === "files"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-indigo-600 hover:bg-white/70"
            }`}
          >
            <span className="block text-xs font-black">文件中心</span>
            <span className="block text-[9px] font-semibold opacity-70">点我找文件</span>
          </button>
          <button
            type="button"
            onClick={() => onActiveViewChange("reports")}
            className={`rounded-xl px-4 py-1.5 text-left transition-all ${
              activeView === "reports"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-indigo-600 hover:bg-white/70"
            }`}
          >
            <span className="block text-xs font-black">报告中心</span>
            <span className="block text-[9px] font-semibold opacity-70">错题 / 成长</span>
          </button>
        </div>
```

- [ ] **Step 4: Render `ReportCenterPanel` when `activeView === "reports"`**

Edit `components/ChatPanel.tsx`. Find the body conditional (around line 933):

```tsx
      {activeView === "chat" ? (
        <>
          ...
        </>
      ) : (
        <FileManagerPanel ... />
      )}
```

Locate the closing of the existing ternary. Wrap it in a 3-way switch. The simplest, least-invasive shape:

Find the line:

```tsx
      {activeView === "chat" ? (
```

Just before it, add an import at the top of the file (search for the existing imports of `FileManagerPanel` and add):

```tsx
import ReportCenterPanel from "./ReportCenterPanel"
```

Then change the conditional. The current shape is:

```tsx
      {activeView === "chat" ? (
        <>
          {/* chat body */}
        </>
      ) : (
        <FileManagerPanel ... />
      )}
```

Replace with:

```tsx
      {activeView === "chat" && (
        <>
          {/* chat body — unchanged */}
        </>
      )}
      {activeView === "files" && (
        <FileManagerPanel ... />
      )}
      {activeView === "reports" && (
        <ReportCenterPanel memory={memory} />
      )}
```

(Keep the existing FileManagerPanel props exactly the same — only the surrounding ternary changes shape.)

**Important:** verify the chat body's `</>` close still aligns and nothing inside changes. Use `npx tsc --noEmit` to catch JSX issues.

- [ ] **Step 5: Pass `memory` prop is already in scope**

`memory` is already a prop on ChatPanel (search for `memory:` in the Props interface). No new prop wiring needed.

- [ ] **Step 6: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Run the full test suite to make sure nothing broke**

Run from `deliclaw-demo/`:
```bash
node --experimental-strip-types --test \
  app/page.test.mts \
  components/ChatPanel.test.mts \
  components/DatabaseHub.test.mts \
  components/FileCenterOnboarding.test.mts \
  components/FileManagerPanel.test.mts \
  components/ReportCenterPanel.test.mts \
  components/WrongQuestionReportView.test.mts \
  lib/chatTurnState.test.mts \
  lib/fileBusinessScene.test.mts \
  lib/fileListRouteSource.test.mts \
  lib/fileResultParser.test.mts \
  lib/fileResultResolver.test.mts \
  lib/fileSourceChannel.test.mts \
  lib/fileUploadFeedback.test.mts \
  lib/launcherScript.test.mts \
  lib/memoryParser.test.mts \
  lib/mockScores.test.mts \
  lib/nextConfig.test.mts \
  lib/pendingInferred.test.mts \
  lib/prompts.test.mts \
  lib/proxyConvention.test.mts \
  lib/quickReplyBehavior.test.mts \
  lib/reportAggregation.test.mts \
  lib/reportCache.test.mts \
  lib/studentState.test.mts \
  lib/turnInsight.test.mts \
  lib/userInputParser.test.mts
```

Expected: all tests pass. If `app/page.test.mts` or `components/ChatPanel.test.mts` reference the old 2-state activeView in assertions, update those assertions to accept the 3-state union.

- [ ] **Step 8: Commit**

```bash
git add app/page.tsx components/ChatPanel.tsx
git commit -m "feat(reports): wire report center as third view"
```

---

## Task 12: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md` at the **project root** (`/Users/kk/Desktop/工作整理/DeliClaw_Demo/CLAUDE.md`). The deliclaw-demo subdirectory does NOT have its own CLAUDE.md.

The project-root CLAUDE.md already has uncommitted changes from earlier work — only **append** the new section, do not touch any other lines.

- [ ] **Step 1: Add a "Report Center" section before the "Critical gotchas" heading**

Locate `## Critical gotchas` in the file and insert this section immediately before it:

```markdown
## Report Center

Third view alongside chat and file center, surfaced via `activeView === "reports"`. New `ReportCenterPanel` (in `deliclaw-demo/components/`) hosts two report types via internal tabs:

- **错题报告** (student-facing) — `WrongQuestionReportView`
- **成长报告** (parent-facing) — `GrowthReportView` with monthly score line chart, emotion trend, and parent advice

### Pipeline

```
ReportCenterPanel
  ↓ POST /api/reports/{wrong-questions | growth} { memorySnapshot }
app/api/reports/[type]/route.ts
  ↓ aggregate SQLite files / mock scores / 4-week emotion history (deterministic)
  ↓ openrouterChatJson(prompt, response_format: json_object)
  ↓ merge LLM output (qualitative only) with deterministic data
  ← JSON envelope { ok: true, report }
ReportCenterPanel writes to localStorage["deliclaw_report_<type>"]
```

### Core principle

**Numbers are computed server-side; the LLM only writes qualitative text.** Never let the model produce score values, counts, or weekly averages — those are aggregated in `lib/reportAggregation.ts`. The LLM only writes diagnoses, error patterns, action plans, weekly summaries, highlights, and parent advice.

### Key files

- `lib/reportTypes.ts` — `WrongQuestionReport` / `GrowthReport` JSON contracts
- `lib/mockScores.ts` — `MOCK_SCORES` (~50 entries, 30 days, 5 subjects) + `MOCK_EMOTION_HISTORY` (4 weeks). Replace this module to ingest real data.
- `lib/reportAggregation.ts` — pure functions: `aggregateFileOverview`, `aggregateScores`, `buildEmotionTrendSkeleton`, `countActiveDays`
- `lib/reportPrompts.ts` — two prompt strings (Chinese, JSON-only)
- `app/api/reports/[type]/route.ts` — orchestration
- `components/ReportCenterPanel.tsx` — container + cache helpers (`readCachedReport` / `writeCachedReport` / `clearCachedReport`)
- `components/WrongQuestionReportView.tsx` / `components/GrowthReportView.tsx` — view layers (recharts)

### LocalStorage cache

- `deliclaw_report_wrong-questions` — `WrongQuestionReport` JSON
- `deliclaw_report_growth` — `GrowthReport` JSON

Both keys are cleared by **重置会话** (in addition to the original 5 keys). Cache is also cleared by the in-panel **重新生成** button.

### Dependencies

- `recharts` — line/bar/pie charts; required by `WrongQuestionReportView` and `GrowthReportView`
```

- [ ] **Step 2: Commit (only the new section, not other CLAUDE.md edits)**

CLAUDE.md may already have uncommitted modifications unrelated to this work. Use interactive add to stage **only** the new "Report Center" section:

```bash
git add -p CLAUDE.md      # accept only the hunk that adds "## Report Center"
git diff --staged CLAUDE.md   # eyeball — confirm only the new section is staged
git commit -m "docs: document report center in CLAUDE.md"
```

If `git diff --staged` shows hunks beyond the new section, unstage with `git restore --staged CLAUDE.md` and try again. Do not stage CLAUDE.md changes that aren't part of this feature.

---

## Manual smoke test

Not a task — but the engineer should run this once before reporting the plan complete:

1. From `deliclaw-demo/`: `npm run dev`
2. Open `http://localhost:3000`
3. Click **报告中心** in the header
4. Default tab is **错题报告**, empty state shows. Click **生成报告**.
5. Wait for OpenRouter call. Sections should appear: 错题总览 / 薄弱知识点 / 错误模式 / 提分行动. Pie + bar charts should render.
6. Click **重新生成** — empty state briefly, then refreshed report.
7. Switch to **成长报告** tab. Click **生成报告**.
8. Sections should appear: 本月学习轨迹 / 本月分数趋势 / 情绪轨迹 / 亮点与进步 / 给家长的建议. Line chart should show 4 weeks across 5 subjects, with 数学 dipping in W2 and recovering in W4.
9. Reload the page → both reports should render from cache instantly without re-calling LLM.
10. Click **重置会话** → cache should clear; next visit to 报告中心 shows empty state.

If any of these steps fail, do NOT mark the work complete. Investigate and fix.

---

## Self-review notes

- Each task self-contained; can be implemented in order without forward references.
- `aggregateScores` is the most complex pure function; its test covers the normal path, the sparse-week fallback, and the homework-only average.
- The endpoint trusts SQLite shape via `r.subject ?? r.question_type ?? ...` because the codebase has both legacy/current column names — defensive but not a placeholder.
- recharts SSR is handled by `"use client"` directive on view files; tests use `react-dom/server` only for HTML smoke and may need to skip recharts internals if SSR throws (note in Task 8 step 4).
- The CLAUDE.md edit in Task 12 is intentionally append-only to avoid colliding with the user's other in-progress edits.
