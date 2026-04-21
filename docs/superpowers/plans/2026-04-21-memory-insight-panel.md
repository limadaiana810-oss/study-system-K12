# Memory Insight Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a right-side memory panel that shows how DeliClaw understood the latest user turn while preserving the existing long-term memory state.

**Architecture:** Add a front-end-only `TurnInsight` type and a pure helper module that derives latest-turn insight from parsed memory and upload results. Keep `ChatPanel` responsible for creating/updating the insight, keep `page.tsx` as shared state owner, and keep `DatabaseHub` as the presentation-only component for `memory + turnInsight`.

**Tech Stack:** Next.js 16 App Router, React 19 client components, TypeScript, Node test runner with `--experimental-strip-types`.

---

### Task 1: Add TurnInsight Types And Helper

**Files:**
- Modify: `deliclaw-demo/types/index.ts`
- Create: `deliclaw-demo/lib/turnInsight.ts`
- Test: `deliclaw-demo/lib/turnInsight.test.mts`

- [ ] **Step 1: Write the failing test**

Create `deliclaw-demo/lib/turnInsight.test.mts` with tests for these behaviors:

```ts
import assert from "node:assert/strict"
import test from "node:test"
import {
  attachFileUnderstanding,
  buildTurnInsightFromMemory,
  markFileUnderstandingFailed,
} from "./turnInsight.ts"

test("builds latest turn insight from confirmed facts, inferred candidates, and emotion", () => {
  const insight = buildTurnInsightFromMemory({
    turnId: "turn-1",
    userText: "我叫小林，最近代数错题有点焦虑",
    extracted: {
      delta: {
        factual: { name: "小林" },
      },
      inferredCandidates: [
        {
          id: "cand-1",
          field: "mood",
          op: "set",
          value: "对代数错题焦虑",
          evidence: "最近代数错题有点焦虑",
          confidence: 0.82,
          createdAt: "2026-04-21T00:00:00.000Z",
          source: "llm",
        },
      ],
      emotionSnapshot: {
        emotion: "焦虑",
        weight: 0.7,
        evidence: "有点焦虑",
        timestamp: "2026-04-21T00:00:00.000Z",
      },
    },
    updatedAt: "2026-04-21T01:00:00.000Z",
  })

  assert.equal(insight.turnId, "turn-1")
  assert.equal(insight.userText, "我叫小林，最近代数错题有点焦虑")
  assert.deepEqual(insight.factualAdded, [{ label: "姓名", value: "小林" }])
  assert.equal(insight.inferredPending[0].label, "情绪状态")
  assert.equal(insight.inferredPending[0].value, "对代数错题焦虑")
  assert.equal(insight.inferredPending[0].evidence, "最近代数错题有点焦虑")
  assert.equal(insight.emotion?.emotion, "焦虑")
  assert.equal(insight.emotion?.evidence, "有点焦虑")
})

test("returns an empty insight when the turn has no memory signal", () => {
  const insight = buildTurnInsightFromMemory({
    turnId: "turn-2",
    userText: "继续",
    extracted: {
      delta: {},
      inferredCandidates: [],
    },
    updatedAt: "2026-04-21T01:00:00.000Z",
  })

  assert.equal(insight.factualAdded.length, 0)
  assert.equal(insight.inferredPending.length, 0)
  assert.equal(insight.emotion, undefined)
  assert.equal(insight.fileUnderstanding, undefined)
})

test("attaches successful file understanding to an existing insight", () => {
  const base = buildTurnInsightFromMemory({
    turnId: "turn-3",
    userText: "帮我整理这个文件",
    extracted: { delta: {}, inferredCandidates: [] },
    updatedAt: "2026-04-21T01:00:00.000Z",
  })

  const next = attachFileUnderstanding(base, {
    originalName: "algebra.png",
    canonicalName: "数学-代数-错题-2026-04-21",
    description: "一张代数错题截图，包含方程变形和计算错误。",
    subject: "数学",
    knowledgePoints: ["代数", "方程"],
    questionType: "错题",
    status: "ready",
  })

  assert.equal(next.fileUnderstanding?.originalName, "algebra.png")
  assert.equal(next.fileUnderstanding?.canonicalName, "数学-代数-错题-2026-04-21")
  assert.equal(next.fileUnderstanding?.description, "一张代数错题截图，包含方程变形和计算错误。")
  assert.deepEqual(next.fileUnderstanding?.tags, ["数学", "错题", "代数", "方程"])
  assert.equal(next.fileUnderstanding?.status, "ready")
})

test("marks file understanding as failed without inventing metadata", () => {
  const base = buildTurnInsightFromMemory({
    turnId: "turn-4",
    userText: "上传这张图",
    extracted: { delta: {}, inferredCandidates: [] },
    updatedAt: "2026-04-21T01:00:00.000Z",
  })

  const next = markFileUnderstandingFailed(base, "broken.png")

  assert.equal(next.fileUnderstanding?.originalName, "broken.png")
  assert.equal(next.fileUnderstanding?.description, "文件未入库")
  assert.deepEqual(next.fileUnderstanding?.tags, [])
  assert.equal(next.fileUnderstanding?.status, "failed")
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd deliclaw-demo && node --experimental-strip-types --test lib/turnInsight.test.mts`

Expected: FAIL because `lib/turnInsight.ts` does not exist.

- [ ] **Step 3: Add the minimal type and helper implementation**

Add these exported types to `deliclaw-demo/types/index.ts`:

```ts
export type TurnInsightFileStatus = "ready" | "partial" | "failed"

export interface TurnInsight {
  turnId: string
  userText: string
  factualAdded: Array<{ label: string; value: string }>
  inferredPending: Array<{ label: string; value: string; evidence?: string }>
  emotion?: { emotion: string; evidence?: string; weight?: number }
  fileUnderstanding?: {
    originalName: string
    description: string
    tags: string[]
    canonicalName?: string
    status?: TurnInsightFileStatus
  }
  updatedAt: string
}
```

Create `deliclaw-demo/lib/turnInsight.ts` with these exports:

```ts
import type { MemoryExtractionResult, TurnInsight, TurnInsightFileStatus } from "@/types"

type BuildTurnInsightInput = {
  turnId: string
  userText: string
  extracted: MemoryExtractionResult
  updatedAt?: string
}

type UploadUnderstandingInput = {
  originalName: string
  canonicalName?: string
  description?: string
  subject?: string
  knowledgePoints?: string[]
  questionType?: string
  status?: TurnInsightFileStatus
}

const FACT_LABELS: Record<string, string> = {
  name: "姓名",
  age: "年龄",
  grade: "年级",
  school: "学校",
  position: "职位",
}

const INFERRED_LABELS: Record<string, string> = {
  sleepPattern: "作息习惯",
  mood: "情绪状态",
  preferences: "偏好",
}

function uniqueStrings(values: Array<string | undefined>) {
  return values
    .map((value) => (value || "").trim())
    .filter((value, index, array) => value.length > 0 && array.indexOf(value) === index)
}

function stringifyValue(value: string | string[]) {
  return Array.isArray(value) ? value.join("，") : value
}

export function buildTurnInsightFromMemory(input: BuildTurnInsightInput): TurnInsight {
  const factual = input.extracted.delta.factual || {}

  return {
    turnId: input.turnId,
    userText: input.userText,
    factualAdded: Object.entries(factual)
      .filter(([, value]) => !!value)
      .map(([key, value]) => ({
        label: FACT_LABELS[key] || key,
        value: String(value),
      })),
    inferredPending: input.extracted.inferredCandidates.map((candidate) => ({
      label: INFERRED_LABELS[candidate.field] || candidate.field,
      value: stringifyValue(candidate.value),
      evidence: candidate.evidence,
    })),
    emotion: input.extracted.emotionSnapshot
      ? {
          emotion: input.extracted.emotionSnapshot.emotion,
          evidence: input.extracted.emotionSnapshot.evidence,
          weight: input.extracted.emotionSnapshot.weight,
        }
      : undefined,
    updatedAt: input.updatedAt || new Date().toISOString(),
  }
}

export function attachFileUnderstanding(insight: TurnInsight, file: UploadUnderstandingInput): TurnInsight {
  return {
    ...insight,
    fileUnderstanding: {
      originalName: file.originalName,
      canonicalName: file.canonicalName,
      description: (file.description || "（暂未解析）").trim(),
      tags: uniqueStrings([file.subject, file.questionType, ...(file.knowledgePoints || [])]),
      status: file.status || "partial",
    },
    updatedAt: new Date().toISOString(),
  }
}

export function markFileUnderstandingFailed(insight: TurnInsight, originalName: string): TurnInsight {
  return {
    ...insight,
    fileUnderstanding: {
      originalName,
      description: "文件未入库",
      tags: [],
      status: "failed",
    },
    updatedAt: new Date().toISOString(),
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd deliclaw-demo && node --experimental-strip-types --test lib/turnInsight.test.mts`

Expected: PASS.

### Task 2: Wire TurnInsight State Into Chat Flow

**Files:**
- Modify: `deliclaw-demo/app/page.tsx`
- Modify: `deliclaw-demo/components/ChatPanel.tsx`
- Test: `deliclaw-demo/lib/turnInsight.test.mts`

- [ ] **Step 1: Add props and state ownership**

In `page.tsx`, import `TurnInsight`, add `const [turnInsight, setTurnInsight] = useState<TurnInsight | null>(null)`, pass `onTurnInsightUpdate={setTurnInsight}` into `ChatPanel`, and pass `turnInsight={turnInsight}` into `DatabaseHub`.

In `ChatPanel.tsx`, extend props with:

```ts
onTurnInsightUpdate: (insight: TurnInsight) => void
```

- [ ] **Step 2: Build insight when memory is parsed**

In `ChatPanel.tsx`, import `TurnInsight`, `attachFileUnderstanding`, `buildTurnInsightFromMemory`, and `markFileUnderstandingFailed`.

Inside each send loop, create a stable `turnId` from the user message id. Whenever final `extractMemory(fullContent)` succeeds, call:

```ts
let latestInsight = buildTurnInsightFromMemory({
  turnId: userMsg.id,
  userText: userMsg.content,
  extracted,
})
onTurnInsightUpdate(latestInsight)
```

- [ ] **Step 3: Merge upload response into the same insight**

Replace fire-and-forget upload indexing with a helper that awaits `/api/files/upload`, then calls `attachFileUnderstanding` on success and `markFileUnderstandingFailed` on failure.

Keep chat streaming independent: upload understanding is appended after the assistant text is parsed and does not block text rendering.

- [ ] **Step 4: Run the helper test**

Run: `cd deliclaw-demo && node --experimental-strip-types --test lib/turnInsight.test.mts`

Expected: PASS.

### Task 3: Render The Two-Layer Memory Panel

**Files:**
- Modify: `deliclaw-demo/components/DatabaseHub.tsx`
- Modify: `deliclaw-demo/components/MemoryCard.tsx` only if needed for reusable display.

- [ ] **Step 1: Accept turnInsight**

Add `turnInsight: TurnInsight | null` to `DatabaseHub` props.

- [ ] **Step 2: Render top layer**

At the top of the scroll area, render a highlighted `本轮理解` panel.

It must show:

- `你刚刚说了` with `turnInsight.userText`.
- `我确认的事实` when `turnInsight.factualAdded.length > 0`.
- `我感知到的状态` when `turnInsight.emotion` exists.
- `我准备记住的内容` when `turnInsight.inferredPending.length > 0`.
- `我如何理解这个文件` when `turnInsight.fileUnderstanding` exists.
- Empty state text `这一轮没有新增记忆，但对话上下文已参与理解。` when no insight detail exists.

- [ ] **Step 3: Render bottom layer**

Rename the existing memory card area into quieter long-term sections:

- `事实记忆`
- `待确认推测`
- `情绪趋势`
- `文件索引`

Stop rendering standalone `文件标签`, `操作`, and `文件描述` cards. Instead, show recent `memory.fileIndex` entries in `文件索引` with file name, tags, description, and uploaded date.

- [ ] **Step 4: Preserve accept/reject controls**

Keep existing accept/reject buttons for pending inferred candidates.

### Task 4: Verify Project Logic

**Files:**
- All touched files.

- [ ] **Step 1: Run targeted tests**

Run: `cd deliclaw-demo && node --experimental-strip-types --test lib/turnInsight.test.mts lib/fileResultParser.test.mts lib/fileResultResolver.test.mts lib/server/fileIndex.test.mts lib/server/fileSearch.test.mts`

Expected: PASS.

- [ ] **Step 2: Run production build**

Run: `cd deliclaw-demo && npm run build`

Expected: PASS. The existing Next 16 middleware deprecation warning may still appear.

- [ ] **Step 3: Inspect the end-to-end flows**

Check that these flows are internally consistent:

- `说`: chat response parses `<memory>`, updates long-term memory, and updates `TurnInsight`.
- `传`: upload route response updates file understanding in `TurnInsight`.
- `取`: search results still render file cards with URL support.
- `记忆展示`: `DatabaseHub` displays latest understanding above long-term memory.
