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

test("labels inferred preferences as hobbies in turn insight", () => {
  const insight = buildTurnInsightFromMemory({
    turnId: "turn-hobby",
    userText: "我喜欢打篮球",
    extracted: {
      delta: {},
      inferredCandidates: [
        {
          id: "cand-hobby",
          field: "preferences",
          op: "add",
          value: "打篮球",
          evidence: "我喜欢打篮球",
          confidence: 0.84,
          createdAt: "2026-04-23T00:00:00.000Z",
          source: "llm",
        },
      ],
    },
    updatedAt: "2026-04-23T00:00:00.000Z",
  })

  assert.equal(insight.inferredPending[0].label, "爱好")
  assert.equal(insight.inferredPending[0].value, "打篮球")
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
