# Memory Insight Panel Design

## Context

DeliClaw currently shows memory as a right-side result panel. The model emits hidden `<memory>` blocks during chat streaming, the client parses them, and the merged memory state is shown in `DatabaseHub`. This proves that memory exists, but it does not make the update process visible enough for a demo viewer.

The new design turns the right panel into a readable explanation of how the system understands the latest user turn, while preserving the existing long-term memory view.

## Goals

- Make the latest memory update understandable to a non-technical demo viewer.
- Show the difference between confirmed facts, inferred hypotheses, emotional state, and file understanding.
- Keep long-term memory visible, but make it secondary to the latest understanding process.
- Preserve the existing chat streaming experience.
- Avoid exposing raw JSON or hidden protocol tags in the UI.

## Non-Goals

- Do not build a full memory debugging console.
- Do not add a historical turn-by-turn timeline in this iteration.
- Do not replace the existing `memory` object as the long-term source of truth.
- Do not add a new server API just to render the right panel.
- Do not redesign the whole chat page layout.

## User Experience

The right panel becomes a two-layer view.

### Top Layer: 本轮理解

The top section explains what the system understood from the latest user turn. It is the most visually prominent section in the right panel and updates whenever a new `<memory>` block or upload result is processed.

It contains readable cards:

- `你刚刚说了`: a short display of the latest user message.
- `我确认的事实`: facts added in this turn.
- `我感知到的状态`: the latest emotion signal and short evidence when available.
- `我准备记住的内容`: inferred memories that still need user confirmation.
- `我如何理解这个文件`: file understanding, shown only when this turn includes an uploaded file.

The top layer represents the latest turn only. A new user message replaces the previous turn insight.

### Bottom Layer: 长期记忆

The bottom section explains what the system currently remembers after merging memory updates.

It is grouped into four sections:

- `事实记忆`: confirmed long-term facts.
- `待确认推测`: inferred memories that still require confirmation.
- `情绪趋势`: the current emotional trend or recent emotional signal.
- `文件索引`: recent file index summaries.

Existing loose file-related cards such as file tags, file actions, and file descriptions are no longer shown as scattered independent cards. Current-turn file understanding belongs in the top layer. Long-term file understanding belongs in the `文件索引` section.

## Data Model

Add a front-end-only state object called `TurnInsight`.

```ts
type TurnInsight = {
  turnId: string;
  userText: string;
  factualAdded: Array<{ label: string; value: string }>;
  inferredPending: Array<{ label: string; value: string; evidence?: string }>;
  emotion?: { emotion: string; evidence?: string; weight?: number };
  fileUnderstanding?: {
    originalName: string;
    description: string;
    tags: string[];
    canonicalName?: string;
    status?: "ready" | "partial" | "failed";
  };
  updatedAt: string;
};
```

`TurnInsight` is derived state. It does not replace or persist over the existing `memory` object.

## Data Flow

1. The user sends a message.
2. `ChatPanel` creates a new turn identifier and stores the latest user text.
3. The chat stream returns text plus a hidden `<memory>` block.
4. The client parses `<memory>` with the existing memory parser.
5. The parser result updates the long-term `memory` state.
6. The same parser result also builds or updates `TurnInsight`.
7. If the turn includes an uploaded file, the upload route returns file understanding metadata.
8. `ChatPanel` merges that upload result into the same `TurnInsight`.
9. `DatabaseHub` receives both `memory` and `turnInsight`.
10. `DatabaseHub` renders the latest understanding at the top and long-term memory below.

## Component Boundaries

`ChatPanel` remains responsible for chat flow, streaming, upload handling, and creating the latest `TurnInsight`.

`page.tsx` remains responsible for owning shared state that must be visible to both the chat panel and the memory panel.

`DatabaseHub` becomes a presentation component for `memory` plus `turnInsight`. It should not parse `<memory>` and should not call file search APIs.

`MemoryCard` can remain a low-level visual card, but the new top layer should use clearer labels and status treatments than the current generic card list.

## Empty and Error States

If the latest turn produces no new facts, inferred memories, emotion signal, or file understanding, the top layer shows:

`这一轮没有新增记忆，但对话上下文已参与理解。`

If `<memory>` parsing fails, the UI keeps the previous long-term memory and does not refresh `TurnInsight` from the failed block. The chat answer still displays normally.

If file upload understanding returns after text memory parsing, the top layer first shows text understanding and then fills in the file understanding card when the upload result arrives.

If file upload fails, the file card shows `文件未入库` and does not invent description, tags, or canonical names.

If a turn contains both facts and inferred memories, facts must be visually marked as confirmed and inferred memories must be marked as pending confirmation.

If long-term memory contains many items, the bottom layer shows summarized sections and recent file index entries rather than trying to render every detail.

## Visual Direction

The right panel should read like an explanation, not a database dump.

The top layer should use warmer, more active language: `我刚刚理解到`, `已确认`, `待确认`, `文件已入库`.

The bottom layer should use quieter state language: `长期记忆`, `当前趋势`, `最近文件`.

The top layer should have a subtle update highlight when a new turn insight arrives. This should be noticeable but not distract from the chat stream.

## Testing Strategy

Add unit tests for any pure helper that converts parsed memory and upload results into `TurnInsight`.

Test cases should cover:

- building a turn insight from confirmed facts.
- building a turn insight from inferred candidates with evidence.
- attaching file understanding after initial text insight exists.
- preserving an empty insight state when no memory delta is present.
- marking file understanding as failed when upload fails.

Run the existing memory and file tests after implementation to avoid regressions.

Run `npm run build` before completion.

## Acceptance Criteria

- A demo viewer can see what the system understood from the latest user message without reading raw JSON.
- Confirmed facts and pending inferred memories are visually distinct.
- File understanding appears as one coherent explanation rather than scattered file cards.
- Long-term memory remains visible below the latest-turn explanation.
- Chat streaming behavior remains intact.
- The feature works without adding a new server API.
