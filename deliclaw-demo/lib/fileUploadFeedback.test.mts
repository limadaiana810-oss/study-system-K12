import test from "node:test"
import assert from "node:assert/strict"

import {
  buildUploadClassificationReply,
  buildFileMemoryDeltaFromUpload,
  buildProcessingFileUnderstanding,
  isFileClassificationOnlyRequest,
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

test("detects classification-only upload requests without swallowing problem-solving turns", () => {
  assert.equal(isFileClassificationOnlyRequest("分类这个文件"), true)
  assert.equal(isFileClassificationOnlyRequest("帮我整理一下这个文件"), true)
  assert.equal(isFileClassificationOnlyRequest(""), true)
  assert.equal(isFileClassificationOnlyRequest("这道题怎么做，顺便帮我分类"), false)
  assert.equal(isFileClassificationOnlyRequest("讲解一下这个错题"), false)
})

test("builds a classification reply from the authoritative upload index", () => {
  const reply = buildUploadClassificationReply("area-unit.jpg", {
    canonicalName: "数学-面积单位-错题-2026-04-22",
    description: "题目要求用 cm²、dm² 或 m² 填空，涉及报纸面积和教室面积。",
    subject: "数学",
    questionType: "错题",
    knowledgePoints: ["面积单位", "单位换算"],
    status: "ready",
  })

  assert.match(reply, /已分类为：数学 \/ 错题 \/ 面积单位、单位换算/)
  assert.match(reply, /题目要求用 cm²、dm² 或 m² 填空/)
  assert.match(reply, /area-unit\.jpg/)
})
