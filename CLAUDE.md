# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

DeliClaw Demo — a Next.js web demo for a **local-first** AI file management agent with:
- real-time "memory" visualization (facts / inferred candidates / file index)
- **real-time understanding panel**: client-side capture of user intent + AI-confirmed facts + candidate queue with auto-confirm
- server-side upload ingestion (original file on disk + local JSON index + SQLite row)
- emotion tracking across turns (rolling 10 snapshots)
- streaming chat via OpenRouter
- **file management center**: browse by questionType → subject, preview, delete, clear-all, dedupe hints

Full product spec is in `DEMO_SPEC.md` (note: some details there may lag behind the actual code).

## Stack

- **Next.js 16 App Router** with TypeScript (**Next 16.2.4**, **React 19.2.4**)
- Dev server uses **webpack** (not Turbopack — see gotcha below)
- **TailwindCSS v4** via `@tailwindcss/postcss`
- **OpenRouter API** → Qwen models (text + vision)
- **SQLite** for server-side file search metadata (system `sqlite3` CLI first; optional `better-sqlite3` fallback)
- local files stored under `deliclaw-demo/data/uploads/`
- `data/file-index.json` for fast local structured lookup
- localStorage for browser-side memory/metadata only (no base64 — quota concern)
- Streaming responses via SSE (`fetch` + `ReadableStream`)

## Commands

All commands run from `deliclaw-demo/`:

```bash
npm run dev      # start dev server at localhost:3000 (webpack mode)
npm run build    # production build (next build)
npm start        # serve production build (next start)
```

No lint or test scripts are configured. Targeted tests are run directly, for example:

```bash
node --experimental-strip-types --test \
  lib/userInputParser.test.mts \
  lib/prompts.test.mts \
  lib/fileUploadFeedback.test.mts \
  lib/server/sqliteOptional.test.mts \
  lib/nextConfig.test.mts \
  lib/launcherScript.test.mts \
  lib/mockReports.test.mts \
  lib/reportCache.test.mts \
  lib/reportTaskState.test.mts \
  components/WrongQuestionReportView.test.mts
```

## Critical Gotcha — Turbopack disabled for dev

On some macOS environments, a stray `~/package.json` (or similar) can cause Turbopack to mis-detect the workspace root, breaking Tailwind v4's `@import "tailwindcss"` resolution. This repo pins dev to:

```bash
next dev --webpack
```

Avoid switching dev back to Turbopack unless you've removed the conflicting root marker or verified Tailwind import resolution.

## Architecture

### State & persistence

**Top-level state** lives in `app/page.tsx` (client component):
- `memory: MemoryEntry` — structured memory + file index + emotion-derived `psychState`
- `stage: DemoStage` — `"intro" | "uploaded" | "done"`
- `uploadedFiles: UploadedFile[]` — browser-side file metadata for UI compatibility; `base64` is intentionally empty after handoff
- `pendingInferred: InferredCandidate[]` — LLM "inferred memory" waiting for user confirmation
- `turnInsight: TurnInsight | null` — right-pane real-time understanding of the current turn

All are persisted to `localStorage`:
- `deliclaw_memory`
- `deliclaw_files` (dates are restored on load)
- `deliclaw_stage`
- `deliclaw_inferred_pending`

"重置会话" clears the browser keys and reloads the page (also clears the chat history in-memory). It does **not** delete server-side files under `data/uploads/`, `data/file-index.json`, or `data/deliclaw.sqlite`.

### Real-time understanding panel (DatabaseHub)

The right pane has two tabs: **记忆中心** and **文件中心**.

**记忆中心** contains three blocks:
1. **本轮捕捉信息** (`capturedItems`) — client-side immediate parse of user input into `task_progress` / `emotion` / `fact` / `file_intent`, shown instantly upon send (no AI round-trip delay)
2. **信息依据** — AI-confirmed `factualAdded` + `emotion` + `fileUnderstanding`
3. **新增记忆候选** (`inferredPending`) — each candidate supports 接受 / 编辑后接受 / 忽略 / 拒绝. Pending candidates auto-accept after a 5-second countdown unless the user intervenes.

**文件中心** (`FileManagerPanel`) shows all uploaded files grouped by `questionType` → `subject` with:
- lazy-loaded image previews
- per-file delete (double-click confirm within 3s)
- "清空全部" with double-click confirm
- duplicate detection by `canonicalName` (yellow banner hint)

### Upload ingestion flow

Uploads are indexed **outside** the chat completion path:

1. User selects a file in `ChatPanel`
2. Client immediately shows a `TurnInsight.fileUnderstanding.status = "indexing"` state in the right pane
3. Client POSTs to `app/api/files/upload/route.ts`
4. Server writes the original file to `data/uploads/<id>.<ext>`
5. Server calls the vision model with `VISION_INDEX_PROMPT` to produce:
   - a ≤100-character description
   - structured tags (`subject`, `knowledgePoints`, `questionType`)
6. Server writes:
   - normalized entry to `data/file-index.json`
   - SQLite row with `file_path`, description, tags, optional embedding
7. Client merges the upload response into memory using `buildFileMemoryDeltaFromUpload()` and updates the right-pane status to `ready` or `partial`

Important boundary: chat/model responses may supplement memory, but file persistence is owned by `/api/files/upload`. Do not rely on `<memory>` output for guaranteed file storage.

### File management APIs

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/files/upload` | POST | Upload + index a file (disk + SQLite + JSON) |
| `/api/files/search` | POST | Semantic/lexical search returning URLs |
| `/api/files/list` | GET | List all files with tags (for file center) |
| `/api/files/[id]` | DELETE | Delete one file (syncs disk + SQLite + JSON) |
| `/api/files/clear` | POST | Delete all files (syncs disk + SQLite + JSON) |
| `/api/uploads/[name]` | GET | Static file server for stored uploads |

### AI call flow (OpenRouter streaming)

1. User action → `ChatPanel` builds model payload from recent messages (`MAX_HISTORY = 10`)
2. POST to `app/api/chat/route.ts`:
   - calls `buildSystemPrompt()` per request (dynamic date; `/no_think` prefix disables Qwen3 thinking tokens)
   - optionally injects `memorySnapshot` (used for retrieval consistency; not to be repeated verbatim)
   - optionally injects a slimmed `pendingInferredSnapshot` (to avoid re-suggesting the same candidates)
3. Model selection (current code):
   - image present: `qwen/qwen2.5-vl-72b-instruct`
   - text only: `qwen/qwen-2.5-72b-instruct`
4. Client reads SSE with `fetch` + `ReadableStream` — **not** `EventSource` (POST unsupported)
5. While streaming, UI displays the assistant message with all hidden tags stripped:
   - `stripMemoryTags()` and `stripFileResultTags()`
   - **Real-time memory update**: once `</memory>` is seen in the stream, memory merges immediately (not one turn late)
6. After stream completes, client parses remaining tags if not already merged:
   - `<memory>...</memory>` and merges state
   - one or more `<file-result>...</file-result>` tags and renders `FileThumbnailCard`(s)
7. For uploads, `/api/files/upload` may already have updated file memory before chat streaming finishes; chat memory is treated as supplemental dialogue memory.

**Hidden tag protocol** — AI embeds two tag types in every response (invisible to user):
- `<memory>{...}</memory>` → parsed by `lib/memoryParser.ts`
  - `delta` fields merge into `memory`
  - `emotionSnapshot` is optional; when present, it is appended (rolling 10) to compute `memory.psychState`
  - `inferredCandidates` are **NOT** merged directly; they go into the "待确认推测" queue with a 5s auto-confirm timer
  - upload file index entries from `/api/files/upload` are authoritative; LLM file memory only supplements the UI/memory narrative
- `<file-result>{...}</file-result>` → parsed by `lib/fileResultParser.ts`
  - **multiple tags are supported** (`extractFileResults()` returns an array)
  - each tag is rendered as a file card inside the assistant bubble (`Message.fileCards: FileCard[]`)

### Client-side user input capture

`lib/userInputParser.ts` runs **immediately** when the user sends a message (before AI responds). It extracts:
- `task_progress`: 整理/检索/上传/清理/总结 intents
- `emotion`: 开心/累/焦虑/难过/好奇/平静/满足
- `fact`: name, grade, school, age, position (regex-based)
- `file_intent`: mentions of 图片/截图/文件/文档

These populate `TurnInsight.capturedItems` and appear in the right pane instantly, solving the previous one-round delay.

### Deterministic local retrieval (no LLM call)

Three retrieval paths exist in `ChatPanel`:
1. **Path ①** — SQLite semantic search via `POST /api/files/search` (hybrid cosine + lexical, threshold 0.5)
2. **Path ②** — Local fuzzy match: if retrieval intent detected without file upload, match against `memory.fileIndex` tags and return from `uploadedFiles`
3. **Path ③** — LLM `<file-result>` tags parsed post-stream

**`fillMissingBase64` helper** (in `ChatPanel.tsx`): after paths ② and ③ build `FileCard[]`, any card with empty `base64` (lost after page reload — localStorage stores metadata only) is re-fetched from SQLite via `/api/files/search`. This ensures images render correctly after reload.

### Demo stage machine

`DemoStage` (in `types/index.ts`):
- `"intro"` → shows the intro quick reply (currently "上传文件")
- `"uploaded"` → shows the retrieve quick reply ("帮我整理错题")
- `"done"` → no quick replies

**Customizing the demo**: edit `lib/demoScript.ts` — change `USER_NAME` and `QUICK_REPLIES`.

### AI system prompt

`lib/prompts.ts` defines:
- `buildSystemPrompt()` — called per request (not module-level) so date is always current. Instructs:
  - Chinese reply, usually 2–4 natural sentences; avoid fixed/repetitive wording
  - append `<memory>...</memory>`; use `<memory>{}</memory>` if there is no new memory
  - `emotionSnapshot` must be output every turn (even if calm)
  - `inferredCandidates` require evidence and confidence; they enter a 5s user-confirm queue
  - when user expresses retrieval intent, output one or more `<file-result>` tags
  - when user uploads a file, explain/understand the content, but do **not** claim direct local disk access; storage and index writes are handled by `/api/files/upload`
- `VISION_INDEX_PROMPT` — used by `/api/files/upload` for multimodal indexing. It requires strict JSON only:
  - `description` within 100 Chinese characters
  - `subject`
  - `knowledgePoints`
  - `questionType`
  - `confidence`
- `AI_INTRO` — the initial assistant message displayed on page load

**Key file inventory**:
- **Components**: `ChatPanel` (main chat UI, file upload and upload-index feedback), `DatabaseHub` (right pane with memory + file manager tabs), `FileManagerPanel` (file browse/delete/clear/dedupe), `MemoryCard`/`FileThumbnailCard`/`MessageBubble`/`QuickReplyBar` (display sub-components)
- **Parsers**: `memoryParser.ts` (extracts & merges `<memory>` tags + emotion), `fileResultParser.ts` (handles one-or-many `<file-result>` tags), `userInputParser.ts` (client-side immediate user intent capture)
- **Upload/index helpers**: `fileUploadFeedback.ts`, `server/fileIndex.ts`, `server/storage.ts`, `server/sqlite.ts`, `app/api/files/upload/route.ts`
- **File management APIs**: `app/api/files/list/route.ts`, `app/api/files/[id]/route.ts`, `app/api/files/clear/route.ts`
- **Config**: `next.config.ts` disables image optimization, allows `*.trycloudflare.com` dev origins for Cloudflare quick tunnels, and sets `outputFileTracingRoot` to suppress workspace warnings

## Report Center

Third view alongside chat and file center, surfaced via `activeView === "reports"`. `ReportCenterPanel` (in `deliclaw-demo/components/`) hosts two report types via internal tabs:

- **错题报告** (student-facing) — `WrongQuestionReportView` (V4 layout — see below)
- **成长报告** (parent-facing) — `GrowthReportView` with monthly score line chart, emotion trend, and parent advice

### Pipeline (current: demo / mock mode)

```
ReportCenterPanel
  ↓ POST /api/reports/{wrong-questions | growth} { memorySnapshot }
app/api/reports/[type]/route.ts
  ↓ buildMockWrongQuestionReport() | buildMockGrowthReport()
  ← JSON envelope { ok: true, report }
ReportCenterPanel writes to localStorage["deliclaw_report_<type>"]
```

The route currently returns hardcoded fixtures from `lib/mockReports.ts` so the demo runs without an OpenRouter call. The growth report's `scores` array still flows through `aggregateScores(getScoresForWindow(30), today)` so the line chart shows the crafted `MOCK_SCORES` narrative (math dip+recovery, physics low week 3, etc.). Only the qualitative text (wrong-question diagnoses + growth highlights/parentAdvice) is hardcoded.

### 错题报告 V4 layout

Top-down render order in `WrongQuestionReportView`:

1. **HeroSignalsBar** — two compact rows (✓ progress + ⚠ gap), either side hidden when its signal is empty
2. **TodayPickCard** — hero card with title 「本日重点」, the day's single 5-min task, "上次卡在哪" reminder, and a 48px-min 「开始」 button that scrolls to `#task-${todayPick.taskId}`. Done-state title is 「本日已完成」.
3. **本周聚焦** section — FocusCards with formal labels 「错因回顾」 / 「本周练习」 / 「解题要点」 (Hattie 三问 mapped to feed-back / feed-up / feed-forward). Each card has at least one `isReDo: true` task (Roediger retrieval-practice priority).
4. **本月错题趋势** — `WeeklyTrendCard` with recharts BarChart + 2-3 sentence summary
5. **其他薄弱点（N）** — `MoreToPracticeCard`, default-collapsed list of weak points not in this week's focus
6. **Footer** — totalErrorCount + subjectsCount derived from `weakPoints`

### 文案分层 (chrome 正式 / body 学生)

This is a load-bearing distinction enforced by tests:

- **Chrome (titles, section labels, button text)**: formal product-grade copy ("本日重点", "本周聚焦", "错因回顾", "解题要点", "本月错题趋势", "其他薄弱点")
- **Body (goal / stepDiagnosis / closingLine / progressSignal / gapSignal / footer)**: student voice ("4/12 那道，你顶点写对了，但 h = -2 写成了 2"; "物理单位换算又冒头，第 3 次了")

Banned-words guards live in two layers:
- **Mock layer** (`lib/mockReports.test.mts`): `JSON.stringify(report)` must not contain 稳 / 节奏 / 拆 / 提升 / 持续 / 整体呈 / 立即 / 马上 (V4) plus V3 legacy: 症结 / 优先级 / 孩子需要 / 正确率 / 掌握 / 夯实 / 精进
- **View chrome layer** (`components/WrongQuestionReportView.test.mts`): the .tsx source must not contain those words PLUS removed casual titles (现在做这一件 / 今天这件做完了 / 这周先把这两道拿下 / 本月错题，一周一根 / 其他还在冒头的 / 上次卡在哪 / 这周怎么补 / 下次再遇到 / 想看完整本周计划)

When polishing copy, run both test files — they are how regressions get caught.

### Re-enabling the real LLM pipeline

The full LLM-driven implementation is preserved in commit history and in the plan file `deliclaw-demo/docs/superpowers/plans/2026-05-07-report-center.md` (Task 7). It still relies on these supporting files (kept in the repo, currently unused by the route): `lib/reportAggregation.ts`, `lib/reportPrompts.ts`, `lib/server/openrouter.ts`'s `responseFormat` option, and the SQLite read in `lib/server/sqlite.ts`. To switch back: replace the route body with the LLM orchestration from that plan; the original principle below still governs.

### Core principle (when LLM is on)

**Numbers are computed server-side; the LLM only writes qualitative text.** Never let the model produce score values, counts, or weekly averages — those are aggregated in `lib/reportAggregation.ts`. The LLM only writes diagnoses, error patterns, action plans, weekly summaries, highlights, and parent advice.

### Key files

- `lib/reportTypes.ts` — `WrongQuestionReport` / `GrowthReport` JSON contracts. V4 wrong-question shape: `progressSignal` + `gapSignal` + `todayPick` (with `taskId`/`taskText`/`durationMinutes`/`whyLine`/`fileRef`) + `focusPicks` + `weeklyTrend` + `weakPoints`.
- `lib/mockReports.ts` — **active in demo mode**: `buildMockWrongQuestionReport()` / `buildMockGrowthReport()`. Wrong-question mock derives `todayPick.taskId` from `focusPicks[0].tasks[0].id` to keep the scroll-target in sync with the FocusCard task.
- `lib/mockScores.ts` — `MOCK_SCORES` (~50 entries, 30 days, 5 subjects) + `MOCK_EMOTION_HISTORY` (4 weeks). Powers the growth report's score chart even in mock mode.
- `lib/reportAggregation.ts` — pure functions: `aggregateFileOverview`, `aggregateScores`, `buildEmotionTrendSkeleton`, `countActiveDays`. Used by `mockReports.ts` for score aggregation; otherwise reserved for the LLM path.
- `lib/reportPrompts.ts` — prompt strings (used only when LLM mode is restored)
- `app/api/reports/[type]/route.ts` — thin orchestration; currently delegates straight to `mockReports`
- `lib/reportCache.ts` — `readCachedReport` / `writeCachedReport` / `clearCachedReport` + `REPORT_STORAGE_KEYS`. Cache validator (`isWrongQuestionReportShape`) auto-discards V2/V3 cached reports that lack V4 fields, so users with stale localStorage re-generate cleanly.
- `lib/reportTaskState.ts` — `readTaskState` / `setTaskDone` / `clearTaskState` + `TASK_STATE_STORAGE_KEY`. localStorage-backed task checkbox persistence keyed on `report.generatedAt`. Used by both TodayPickCard's done-state and FocusCard's checkboxes — the parent `WrongQuestionReportView` owns the React state and passes `taskState` + `onToggle` down to FocusCards (single source of truth, so checking a task in FocusCard immediately flips TodayPickCard to done).
- `components/ReportCenterPanel.tsx` — container that consumes those helpers
- `components/WrongQuestionReportView.tsx` — V4 view: HeroSignalsBar / TodayPickCard / FocusCards / WeeklyTrendCard / MoreToPracticeCard / footer. Shared `scrollToTask(id)` helper used by both FocusCard's "现在就做" and TodayPickCard's "开始" buttons.
- `components/GrowthReportView.tsx` — view layer (recharts)

### LocalStorage cache

- `deliclaw_report_wrong-questions` — `WrongQuestionReport` JSON
- `deliclaw_report_growth` — `GrowthReport` JSON
- `deliclaw_report_wq_tasks` — task checkbox state, keyed on `generatedAt` so a regenerated report resets all checkboxes

All three keys are cleared by **重置会话** (alongside the chat/memory/files keys). Report-cache keys are also cleared by the in-panel **重新生成** button (which calls `clearCachedReport(type)` + for wrong-questions also `clearTaskState()`).

### Dependencies

- `recharts` — line/bar charts; required by `WrongQuestionReportView` and `GrowthReportView` (no PieChart in V4 wrong-question report — locked by test)

## Environment

```
OPENROUTER_API_KEY=sk-or-...   # deliclaw-demo/.env.local

# Public sharing token used by launcher URLs
DEMO_ACCESS_TOKEN=wuyanzu

# Optional model overrides (recommended to keep defaults unless testing)
OPENROUTER_CHAT_MODEL_TEXT=qwen/qwen-2.5-72b-instruct
OPENROUTER_CHAT_MODEL_VISION=qwen/qwen2.5-vl-72b-instruct
OPENROUTER_TAGGER_MODEL=qwen/qwen-2.5-72b-instruct
OPENROUTER_EMBED_MODEL=qwen/qwen3-embedding-0.6b
```

## One-click launcher

`开始演示.command` (in repo root) — double-click on Mac to start the dev server, launch Cloudflare Tunnel, and open the public browser URL. The Terminal window stays attached to the session; closing that window stops both the dev server and the tunnel.

Launcher behavior:
- checks for Node.js and `cloudflared`
- installs deps on first run
- checks for unconfigured API key
- cleans old recorded dev/tunnel PIDs
- cleans project-owned port `3000` processes, but refuses to kill unrelated processes
- removes stale `.next/dev/lock` if its recorded PID is missing/dead
- starts Next dev on `127.0.0.1:3000` and waits for that local service before starting the tunnel
- waits briefly for the public `trycloudflare.com` URL to resolve
- opens the tokenized local URL first, then opens the tokenized public URL when a tunnel URL is available

Cloudflare dev-origin gotcha:
- Next dev blocks cross-origin dev resources by default. `next.config.ts` must keep `allowedDevOrigins: ["*.trycloudflare.com"]`; otherwise public tunnel pages can stay on the SSR loading screen (`正在加载记忆...`) because the client dev resources/HMR origin is rejected.

Launcher Bash gotcha:
- `开始演示.command` runs with `set -u`. When a shell variable is followed immediately by Chinese/full-width punctuation, always write `${var}` instead of `$var`, e.g. `PID ${pid}）` and `token=${DEMO_TOKEN}）`. Without braces, Bash can treat the punctuation as part of the variable name and abort with `unbound variable`.
- `lib/launcherScript.test.mts` includes a regression test that rejects unbraced `$var` before non-ASCII punctuation.

## Public access (Cloudflare Tunnel)

`cloudflared tunnel --url http://127.0.0.1:3000` is launched by `开始演示.command`. Access URLs include `?token=wuyanzu` when `DEMO_ACCESS_TOKEN=wuyanzu` is configured.

## Current Code Progress — 2026-04-21

Implemented and verified:
- **Real-time understanding panel**: client-side `userInputParser` generates `capturedItems` instantly upon user send; right pane shows task/emotion/fact/file_intent before AI responds.
- **Streaming placeholder**: assistant bubble appears immediately with `TypingDots`; content streams in character-by-character.
- **5-second auto-confirm**: inferred candidates enter a countdown; user can accept/edit/ignore/reject; unactioned candidates auto-accept after 5s.
- **File management center**: DatabaseHub has a "文件中心" tab showing files grouped by `questionType` → `subject`, with preview, per-file delete (double-click confirm), and clear-all.
- **File deletion APIs**: `/api/files/list`, `/api/files/[id]` (DELETE), `/api/files/clear` sync disk + SQLite + JSON index atomically.
- **Duplicate detection**: file center highlights files with identical `canonicalName`.
- Upload pipeline decoupled from chat: `/api/files/upload` owns file persistence, multimodal parsing, local JSON index updates, SQLite metadata writes, and optional embeddings.
- UI shows immediate upload understanding feedback (`indexing` → `ready` / `partial` / `failed`) in the right-pane memory module.
- Chat prompt is less rigid: natural 2–4 sentence replies, emotion every turn, and explicit boundary that the model does not directly read/write local disk.
- SQLite no longer requires `better-sqlite3` to be installed; the default backend uses the system `sqlite3` CLI and keeps `better-sqlite3` as an optional fallback.
- Next dev now allows Cloudflare quick tunnel origins via `allowedDevOrigins: ["*.trycloudflare.com"]`, preventing public tunnel pages from getting stuck on `正在加载记忆...`.
- One-click launcher now opens the tokenized local URL first, then opens the tokenized public URL when available, and clears stale Next dev locks before startup.
- One-click launcher braces shell variables before Chinese/full-width punctuation to avoid `set -u` startup crashes such as `pid）: unbound variable`.
- Code slimmed: removed dead `semanticSearch.ts` and `proxy.ts` (~270 lines); removed unnecessary `@next/swc-darwin-arm64` dependency.

Latest verification:
- Targeted Node tests passed: 22 tests, 0 failures.
- Launcher tests passed: 4 tests, 0 failures.
- `npm run build` passed.
- Production API smoke test for `/api/files/upload` returned `ok: true` and `sqliteStored: true`; `/api/files/search` returned the uploaded test file through SQLite search.

## Current Code Progress — 2026-05-07

错题报告 V3 → V4 redesign shipped. Key shifts:

- **V3 (Hattie 三问 + student-voice)**: replaced the V2 four-parallel-section layout (错题总览 / 薄弱知识点 / 错误模式 / 提分行动) with focus-driven `progressSignal` + 1-3 `focusPicks` + `weeklyTrend` + `weakPoints`. Each focus card walked the student through Hattie's feed-up / feed-back / feed-forward via `goal` / `stepDiagnosis` / `closingLine`. Banned diagnostic-report tone (症结 / 正确率% / 优先级 / 孩子需要 etc.) and replaced it with student voice ("你 + 具体动作 + 具体卡点").
- **V4 (hero action card)**: V3 still made the student scan to know "now what". V4 puts three things in the first viewport: ✓ progress + ⚠ gap + ▶ today's single 5-min task with a 「开始」 button that scrolls to the matching FocusCard task. New data fields: `gapSignal`, `todayPick`. New components: `HeroSignalsBar`, `TodayPickCard`. Shared `scrollToTask` helper. `taskState` lifted to parent so TodayPickCard's done-state mirrors FocusCard checkboxes immediately.
- **Formal-titles polish**: section titles (chrome) shifted from coach-y casual ("现在做这一件" / "这周先把这两道拿下" / "本月错题，一周一根") to product-grade formal ("本日重点" / "本周聚焦" / "本月错题趋势" / "其他薄弱点（N）"); body copy stays in student voice. This "chrome 正式 / body 亲切" split is enforced by chrome banned-words tests in `WrongQuestionReportView.test.mts`.

Implementation discipline:
- Subagent-driven development with two-stage review (spec compliance + code quality) per task.
- TDD throughout (RED → GREEN → commit).
- Three feature branches merged to master, all with --no-ff merge commits preserving the V3 → V4 → polish progression.
- 75 targeted tests pass after final merge; `npm run build` clean.

Known nit (deferred): TodayPickCard done-state shows raw filename ("数学-错题-2026-04-12.png") rather than a prettier label like "4/12 二次函数". Spec §2.3 explicitly defers this. The done-state body line "下面还有计划，想继续就往下翻" is also still casual under the formal "本日已完成" title — flag for next polish pass.
