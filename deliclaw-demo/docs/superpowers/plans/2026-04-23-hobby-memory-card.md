# Hobby Memory Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show long-term hobby memory as a dedicated “爱好” card and automatically persist inferred hobbies into long-term memory.

**Architecture:** Keep `memory.inferred.preferences` as the storage field, but unify user-facing language to “爱好”. Add a small pure helper for expiring `pendingInferred` candidates, then wire it into the page-level timer effect so inferred hobbies actually land in memory without a manual review UI.

**Tech Stack:** Next.js 16, React 19, TypeScript, Node test runner

---

### Task 1: Lock the UI wording and prompt semantics

**Files:**
- Modify: `components/DatabaseHub.tsx`
- Modify: `components/DatabaseHub.test.mts`
- Modify: `lib/prompts.ts`
- Modify: `lib/prompts.test.mts`
- Modify: `lib/turnInsight.ts`
- Modify: `lib/turnInsight.test.mts`

- [ ] **Step 1: Write the failing tests**

Add assertions for:
- `DatabaseHub` showing `爱好` and not `已确认偏好`
- `buildSystemPrompt()` mentioning hobby examples and `field=preferences`
- `buildTurnInsightFromMemory()` mapping `preferences` to `爱好`

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test components/DatabaseHub.test.mts lib/prompts.test.mts lib/turnInsight.test.mts`
Expected: FAIL on missing `爱好` wording and hobby prompt copy.

- [ ] **Step 3: Write minimal implementation**

Update:
- `DatabaseHub` preference card label to `爱好`
- empty-state copy to mention hobbies
- `INFERRED_LABELS.preferences` to `爱好`
- prompt hobby rule/examples while keeping storage field as `preferences`

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test components/DatabaseHub.test.mts lib/prompts.test.mts lib/turnInsight.test.mts`
Expected: PASS

### Task 2: Add pure auto-confirm logic for inferred memories

**Files:**
- Create: `lib/pendingInferred.ts`
- Create: `lib/pendingInferred.test.mts`

- [ ] **Step 1: Write the failing tests**

Add tests for:
- due `preferences` candidate merges into `memory.inferred.preferences`
- future candidate remains pending

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/pendingInferred.test.mts`
Expected: FAIL because helper does not exist.

- [ ] **Step 3: Write minimal implementation**

Create a helper that:
- accepts `memory`, `pendingInferred`, and `nowMs`
- applies due candidates via `applyInferredCandidate()`
- returns `nextMemory`, `nextPendingInferred`, and `acceptedIds`
- exposes a helper for the next timer delay

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lib/pendingInferred.test.mts`
Expected: PASS

### Task 3: Wire auto-confirm into the page state

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/page.test.mts`

- [ ] **Step 1: Write the failing test**

Add static assertions that `page.tsx` imports the pending-inferred helper and schedules a timer to accept due candidates.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test app/page.test.mts`
Expected: FAIL because page does not wire auto-confirm yet.

- [ ] **Step 3: Write minimal implementation**

In `page.tsx`:
- keep refs for latest `memory` and `pendingInferred`
- schedule a timeout for the next due candidate
- apply accepted candidates into memory
- remove accepted ids from both `pendingInferred` and `turnInsight.inferredPending`

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test app/page.test.mts`
Expected: PASS

### Task 4: Full verification

**Files:**
- Test: `components/DatabaseHub.test.mts`
- Test: `lib/prompts.test.mts`
- Test: `lib/turnInsight.test.mts`
- Test: `lib/pendingInferred.test.mts`
- Test: `app/page.test.mts`

- [ ] **Step 1: Run focused regression suite**

Run: `node --test components/DatabaseHub.test.mts lib/prompts.test.mts lib/turnInsight.test.mts lib/pendingInferred.test.mts app/page.test.mts`
Expected: PASS

- [ ] **Step 2: Run full test suite**

Run: `node --test`
Expected: PASS with 0 failures

- [ ] **Step 3: Run production build**

Run: `npm run build`
Expected: build succeeds
