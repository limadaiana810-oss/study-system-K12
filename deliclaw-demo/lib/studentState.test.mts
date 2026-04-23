import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

import { getStudentStateAvatar } from "./studentState.ts"

test("maps user emotions to pixel student avatar assets", () => {
  assert.equal(getStudentStateAvatar("好奇").src, "/student-states/curious.png")
  assert.equal(getStudentStateAvatar("高兴").src, "/student-states/happy.png")
  assert.equal(getStudentStateAvatar("愉悦").src, "/student-states/happy.png")
  assert.equal(getStudentStateAvatar("满足").src, "/student-states/happy.png")
  assert.equal(getStudentStateAvatar("沮丧").src, "/student-states/sad.png")
  assert.equal(getStudentStateAvatar("伤心").src, "/student-states/sad.png")
  assert.equal(getStudentStateAvatar("焦虑").src, "/student-states/worried.png")
  assert.equal(getStudentStateAvatar("担心").src, "/student-states/worried.png")
  assert.equal(getStudentStateAvatar("紧张").src, "/student-states/worried.png")
  assert.equal(getStudentStateAvatar("生气").src, "/student-states/angry.png")
  assert.equal(getStudentStateAvatar("疲惫").src, "/student-states/sad.png")
  assert.equal(getStudentStateAvatar("平静").src, "/student-states/normal.png")
})

test("falls back to a calm student state when no emotion is available", () => {
  const state = getStudentStateAvatar(undefined)

  assert.equal(state.emotion, "平静")
  assert.equal(state.title, "平静")
  assert.equal(state.src, "/student-states/normal.png")
})

test("uses direct child-friendly state labels for parent-facing display", () => {
  assert.equal(getStudentStateAvatar("平静").title, "平静")
  assert.equal(getStudentStateAvatar("焦虑").title, "焦虑")
  assert.equal(getStudentStateAvatar("沮丧").title, "伤心")
  assert.equal(getStudentStateAvatar("疲惫").title, "疲惫")
  assert.equal(getStudentStateAvatar("愉悦").title, "高兴")
  assert.equal(getStudentStateAvatar("高兴").title, "高兴")
  assert.equal(getStudentStateAvatar("生气").title, "生气")
  assert.equal(getStudentStateAvatar("好奇").title, "好奇")
  assert.equal(getStudentStateAvatar("满足").title, "满足")
})

test("avoids system-like or diagnostic wording in state labels and descriptions", () => {
  const states = ["平静", "焦虑", "沮丧", "疲惫", "愉悦", "好奇", "满足", "高兴", "生气"].map((emotion) =>
    getStudentStateAvatar(emotion)
  )
  const copy = states.flatMap((state) => [state.title, state.description]).join("\n")

  assert.doesNotMatch(copy, /待命|在线|探索中|确认|检测到|系统判断|风险|诊断/)
})

test("ships every status image referenced by the avatar mapping", () => {
  const emotions = ["平静", "好奇", "高兴", "生气", "焦虑", "沮丧"]

  for (const emotion of emotions) {
    const state = getStudentStateAvatar(emotion)
    const assetPath = path.join(process.cwd(), "public", state.src.replace(/^\//, ""))

    assert.ok(fs.existsSync(assetPath), `${emotion} image asset is missing: ${state.src}`)
  }
})
