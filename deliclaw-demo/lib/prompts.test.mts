import test from "node:test"
import assert from "node:assert/strict"

import { AI_INTRO, VISION_INDEX_PROMPT, buildSystemPrompt } from "./prompts.ts"

test("intro allows direct upload instead of forcing identity disclosure first", () => {
  assert.doesNotMatch(AI_INTRO, /请先告诉我你是谁/)
  assert.match(AI_INTRO, /直接上传/)
})

test("system prompt keeps agent responses natural and does not assign local storage to the model", () => {
  const prompt = buildSystemPrompt()

  assert.match(prompt, /不要套固定话术/)
  assert.match(prompt, /recentGoal/)
  assert.match(prompt, /高兴/)
  assert.match(prompt, /生气/)
  assert.match(prompt, /文件落盘和索引由服务端上传接口完成/)
  assert.doesNotMatch(prompt, /必须\*\*把该文件写入 fileIndex/)
  assert.doesNotMatch(prompt, /emotionSnapshot（情绪评估）：\*\*每轮必须输出/)
})

test("system prompt asks the model to infer hobbies into preferences", () => {
  const prompt = buildSystemPrompt()

  assert.match(prompt, /爱好（如喜欢篮球、爱看科幻）/)
  assert.match(prompt, /field=preferences/)
})

test("vision index prompt supports personal profile and travel file categories", () => {
  assert.match(VISION_INDEX_PROMPT, /个人资料/)
  assert.match(VISION_INDEX_PROMPT, /旅游/)
  assert.match(VISION_INDEX_PROMPT, /身份证|护照|简历/)
  assert.match(VISION_INDEX_PROMPT, /行程|机票|酒店/)
})
