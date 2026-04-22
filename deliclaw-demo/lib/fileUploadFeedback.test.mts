import test from "node:test"
import assert from "node:assert/strict"

import {
  buildFileMemoryDeltaFromUpload,
  buildProcessingFileUnderstanding,
} from "./fileUploadFeedback.ts"

test("builds a visible processing state before the chat model finishes", () => {
  const state = buildProcessingFileUnderstanding("algebra.png")

  assert.equal(state.originalName, "algebra.png")
  assert.equal(state.status, "indexing")
  assert.match(state.description, /正在识别/)
  assert.deepEqual(state.tags, [])
})

test("builds memory delta from upload response without relying on LLM memory tags", () => {
  const delta = buildFileMemoryDeltaFromUpload("algebra.png", {
    canonicalName: "数学-代数-错题-2026-04-21",
    description: "一张代数错题截图，包含方程变形和计算错误。",
    subject: "数学",
    questionType: "错题",
    knowledgePoints: ["代数", "方程"],
    indexedAt: "2026-04-21",
  })

  assert.equal(delta.fileDescription, "一张代数错题截图，包含方程变形和计算错误。")
  assert.deepEqual(delta.fileTags, ["数学", "错题", "代数", "方程"])
  assert.deepEqual(delta.fileIndex, [
    {
      fileName: "algebra.png",
      tags: ["数学", "错题", "代数", "方程"],
      uploadedAt: "2026-04-21",
      description: "一张代数错题截图，包含方程变形和计算错误。",
    },
  ])
})
