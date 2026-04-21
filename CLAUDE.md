# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

DeliClaw Demo — a Next.js web demo for a **local-first** AI file management agent with:
- real-time “memory” visualization (facts / inferred candidates / file index)
- emotion tracking across turns (rolling 10 snapshots)
- streaming chat via OpenRouter

Full product spec is in `DEMO_SPEC.md` (note: some details there may lag behind the actual code).

## Stack

- **Next.js 16 App Router** with TypeScript (**Next 16.2.4**, **React 19.2.4**)
- Dev server uses **webpack** (not Turbopack — see gotcha below)
- **TailwindCSS v4** via `@tailwindcss/postcss`
- **OpenRouter API** → Qwen models (text + vision)
- **SQLite** (`better-sqlite3`) for server-side file storage (base64, tags, embeddings)
- localStorage for metadata only (no base64 — quota concern)
- Streaming responses via SSE (`fetch` + `ReadableStream`)

## Commands

All commands run from `deliclaw-demo/`:

```bash
npm run dev      # start dev server at localhost:3000 (webpack mode)
npm run build    # production build (next build)
npm start        # serve production build (next start)
```

No lint or test scripts are configured.

## Critical Gotcha — Turbopack disabled for dev

On some macOS environments, a stray `~/package.json` (or similar) can cause Turbopack to mis-detect the workspace root, breaking Tailwind v4’s `@import "tailwindcss"` resolution. This repo pins dev to:

```bash
next dev --webpack
```

Avoid switching dev back to Turbopack unless you’ve removed the conflicting root marker or verified Tailwind import resolution.

## Architecture

### State & persistence

**Top-level state** lives in `app/page.tsx` (client component):
- `memory: MemoryEntry` — structured memory + file index + emotion-derived `psychState`
- `stage: DemoStage` — `"intro" | "uploaded" | "done"`
- `uploadedFiles: UploadedFile[]` — local file store (Base64 + mime + uploadedAt)
- `pendingInferred: InferredCandidate[]` — LLM “inferred memory” waiting for user confirmation

All are persisted to `localStorage`:
- `deliclaw_memory`
- `deliclaw_files` (dates are restored on load)
- `deliclaw_stage`
- `deliclaw_inferred_pending`

“重置会话” clears the above keys and reloads the page (also clears the chat history in-memory).

### AI call flow (OpenRouter streaming)

1. User action → `ChatPanel` builds model payload from recent messages (`MAX_HISTORY = 10`)
2. POST to `app/api/chat/route.ts`:
   - calls `buildSystemPrompt()` per request (dynamic date; `/no_think` prefix disables Qwen3 thinking tokens)
   - optionally injects `memorySnapshot` (used for retrieval consistency; not to be repeated verbatim)
   - optionally injects a slimmed `pendingInferredSnapshot` (to avoid re-suggesting the same candidates)
3. Model selection (current code):
   - image present: `qwen/qwen3-vl-8b-instruct`
   - text only: `qwen/qwen3.6-plus`
4. Client reads SSE with `fetch` + `ReadableStream` — **not** `EventSource` (POST unsupported)
5. While streaming, UI displays the assistant message with all hidden tags stripped:
   - `stripMemoryTags()` and `stripFileResultTags()`
   - **Real-time memory update**: once `</memory>` is seen in the stream, memory merges immediately (not one turn late)
6. After stream completes, client parses remaining tags if not already merged:
   - `<memory>...</memory>` and merges state
   - one or more `<file-result>...</file-result>` tags and renders `FileThumbnailCard`(s)

**Hidden tag protocol** — AI embeds two tag types in every response (invisible to user):
- `<memory>{...}</memory>` → parsed by `lib/memoryParser.ts`
  - `delta` fields merge into `memory`
  - `emotionSnapshot` is appended (rolling 10) to compute `memory.psychState`
  - `inferredCandidates` are **NOT** merged directly; they go into the “待确认推测” queue
- `<file-result>{...}</file-result>` → parsed by `lib/fileResultParser.ts`
  - **multiple tags are supported** (`extractFileResults()` returns an array)
  - each tag is rendered as a file card inside the assistant bubble (`Message.fileCards: FileCard[]`)

### Deterministic local retrieval (no LLM call)

Three retrieval paths exist in `ChatPanel`:
1. **Path ①** — SQLite semantic search via `POST /api/files/search` (hybrid cosine + lexical, threshold 0.5)
2. **Path ②** — Local fuzzy match: if retrieval intent detected without file upload, match against `memory.fileIndex` tags and return from `uploadedFiles`
3. **Path ③** — LLM `<file-result>` tags parsed post-stream

**`fillMissingBase64` helper** (in `ChatPanel.tsx`): after paths ② and ③ build `FileCard[]`, any card with empty `base64` (lost after page reload — localStorage stores metadata only) is re-fetched from SQLite via `/api/files/search`. This ensures images render correctly after reload.

### Demo stage machine

`DemoStage` (in `types/index.ts`):
- `"intro"` → shows the intro quick reply (currently “上传文件”)
- `"uploaded"` → shows the retrieve quick reply (“帮我整理错题”)
- `"done"` → no quick replies

**Customizing the demo**: edit `lib/demoScript.ts` — change `USER_NAME` and `QUICK_REPLIES`.

### AI system prompt

`lib/prompts.ts` defines:
- `buildSystemPrompt()` — called per request (not module-level) so date is always current. Instructs:
  - Chinese reply, ≤120 chars
  - always append `<memory>...</memory>` (and always include `emotionSnapshot`)
  - when user expresses retrieval intent, output one or more `<file-result>` tags
  - when user uploads a file, **must** index it in `fileIndex` with `fileName` from the attachment metadata
- `AI_INTRO` — the initial assistant message displayed on page load

**Key file inventory**:
- **Components**: `ChatPanel` (main chat UI, file upload), `DatabaseHub` (right pane, memory + inferred-candidate review), `MemoryCard`/`FileThumbnailCard`/`MessageBubble`/`QuickReplyBar` (display sub-components)
- **Parsers**: `memoryParser.ts` (extracts & merges `<memory>` tags + emotion), `fileResultParser.ts` (handles one-or-many `<file-result>` tags)
- **Config**: `next.config.ts` disables image optimization and sets `outputFileTracingRoot` to suppress workspace warnings

## Environment

```
OPENROUTER_API_KEY=sk-or-...   # deliclaw-demo/.env.local

# Protect public sharing (middleware checks token via ?token= or x-demo-token header)
DEMO_ACCESS_TOKEN=wuyanzu

# Optional model overrides (recommended to keep defaults unless testing)
OPENROUTER_CHAT_MODEL_TEXT=qwen/qwen3.6-plus
OPENROUTER_CHAT_MODEL_VISION=qwen/qwen3-vl-8b-instruct
OPENROUTER_TAGGER_MODEL=qwen/qwen3.6-plus
OPENROUTER_EMBED_MODEL=qwen/qwen3-embedding-0.6b
```

## One-click launcher

`开始演示.command` (in repo root) — double-click on Mac to start the dev server, launch Cloudflare Tunnel, and open the browser. Checks for Node.js, installs deps on first run, checks for unconfigured API key, prints the public tunnel URL and access token.

## Public access (Cloudflare Tunnel)

`cloudflared tunnel --url http://localhost:3000` is launched by `开始演示.command`. Access requires `?token=wuyanzu` in the URL (enforced by `middleware.ts`).
