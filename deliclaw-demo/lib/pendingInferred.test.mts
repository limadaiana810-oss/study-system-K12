import test from "node:test"
import assert from "node:assert/strict"

import { acceptDueInferredCandidates, getNextAutoConfirmDelay } from "./pendingInferred.ts"

test("accepts due hobby candidates into inferred preferences", () => {
  const result = acceptDueInferredCandidates({
    memory: {},
    pendingInferred: [
      {
        id: "cand-hobby",
        field: "preferences",
        op: "add",
        value: "打篮球",
        evidence: "我喜欢打篮球",
        confidence: 0.83,
        createdAt: "2026-04-23T00:00:00.000Z",
        source: "llm",
        autoConfirmAt: 1000,
      },
    ],
    nowMs: 1000,
  })

  assert.deepEqual(result.memory.inferred?.preferences, ["打篮球"])
  assert.deepEqual(result.pendingInferred, [])
  assert.deepEqual(result.acceptedIds, ["cand-hobby"])
})

test("keeps future inferred candidates pending", () => {
  const pending = [
    {
      id: "cand-future",
      field: "preferences",
      op: "add" as const,
      value: "看科幻",
      evidence: "我爱看科幻",
      confidence: 0.76,
      createdAt: "2026-04-23T00:00:00.000Z",
      source: "llm" as const,
      autoConfirmAt: 3000,
    },
  ]

  const result = acceptDueInferredCandidates({
    memory: {},
    pendingInferred: pending,
    nowMs: 1000,
  })

  assert.equal(result.memory.inferred, undefined)
  assert.deepEqual(result.pendingInferred, pending)
  assert.deepEqual(result.acceptedIds, [])
})

test("computes the delay until the next auto confirm", () => {
  const delay = getNextAutoConfirmDelay([
    {
      id: "cand-1",
      field: "preferences",
      op: "add",
      value: "打篮球",
      evidence: "我喜欢打篮球",
      confidence: 0.8,
      createdAt: "2026-04-23T00:00:00.000Z",
      source: "llm",
      autoConfirmAt: 2500,
    },
    {
      id: "cand-2",
      field: "mood",
      op: "set",
      value: "最近容易分心",
      evidence: "最近总分心",
      confidence: 0.6,
      createdAt: "2026-04-23T00:00:00.000Z",
      source: "llm",
      autoConfirmAt: 1800,
    },
  ], 1000)

  assert.equal(delay, 800)
})
