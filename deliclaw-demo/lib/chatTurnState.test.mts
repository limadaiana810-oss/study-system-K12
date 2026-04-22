import test from "node:test"
import assert from "node:assert/strict"

import { buildCurrentTurnMessageState } from "./chatTurnState.ts"
import type { Message } from "../types/index.ts"

test("builds an API-safe current turn before React state commits", () => {
  const intro: Message = {
    id: "intro",
    role: "assistant",
    content: "你好",
    timestamp: new Date("2026-04-22T00:00:00.000Z"),
  }
  const user: Message = {
    id: "user-1",
    role: "user",
    content: "我叫凯伦，初一，想提升综合成绩",
    timestamp: new Date("2026-04-22T00:01:00.000Z"),
  }
  const assistant: Message = {
    id: "assistant-1",
    role: "assistant",
    content: "",
    timestamp: new Date("2026-04-22T00:01:01.000Z"),
    isStreaming: true,
  }

  const state = buildCurrentTurnMessageState([intro], user, assistant)

  assert.deepEqual(state.messagesForApi, [intro, user])
  assert.deepEqual(state.messagesForUi, [intro, user, assistant])
  assert.equal(state.messagesForApi.at(-1)?.content, "我叫凯伦，初一，想提升综合成绩")
})
