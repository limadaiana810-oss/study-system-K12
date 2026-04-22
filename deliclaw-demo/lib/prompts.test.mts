import test from "node:test"
import assert from "node:assert/strict"

import { AI_INTRO, buildSystemPrompt } from "./prompts.ts"

test("intro allows direct upload instead of forcing identity disclosure first", () => {
  assert.doesNotMatch(AI_INTRO, /请先告诉我你是谁/)
  assert.match(AI_INTRO, /直接上传/)
})

test("system prompt keeps agent responses natural and does not assign local storage to the model", () => {
  const prompt = buildSystemPrompt()

  assert.match(prompt, /不要套固定话术/)
  assert.match(prompt, /文件落盘和索引由服务端上传接口完成/)
  assert.doesNotMatch(prompt, /必须\*\*把该文件写入 fileIndex/)
  assert.doesNotMatch(prompt, /emotionSnapshot（情绪评估）：\*\*每轮必须输出/)
})
