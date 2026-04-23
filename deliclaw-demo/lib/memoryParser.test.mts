import test from "node:test"
import assert from "node:assert/strict"

import { extractMemory } from "./memoryParser.ts"

test("accepts the expanded student status fields from model memory output", () => {
  for (const emotion of ["高兴", "生气"]) {
    const result = extractMemory(`<memory>{"emotionSnapshot":{"emotion":"${emotion}","weight":0.6}}</memory>`)

    assert.equal(result?.emotionSnapshot?.emotion, emotion)
  }
})

test("keeps worried language represented by the canonical 焦虑 field", () => {
  const result = extractMemory('<memory>{"emotionSnapshot":{"emotion":"焦虑","weight":0.7,"evidence":"很担心"}}</memory>')

  assert.equal(result?.emotionSnapshot?.emotion, "焦虑")
  assert.equal(result?.emotionSnapshot?.evidence, "很担心")
})
