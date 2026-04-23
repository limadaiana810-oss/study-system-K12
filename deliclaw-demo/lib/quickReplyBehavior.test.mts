import test from "node:test"
import assert from "node:assert/strict"

import { nextQuickReplyInput } from "./quickReplyBehavior.ts"

test("fills upload preset text only the first time the upload quick reply is clicked", () => {
  assert.equal(
    nextQuickReplyInput({ currentInput: "", presetMessage: "我叫凯伦，想提升综合成绩", hasFilledPreset: false }),
    "我叫凯伦，想提升综合成绩"
  )

  assert.equal(
    nextQuickReplyInput({ currentInput: "用户正在输入", presetMessage: "我叫凯伦，想提升综合成绩", hasFilledPreset: true }),
    "用户正在输入"
  )
})
