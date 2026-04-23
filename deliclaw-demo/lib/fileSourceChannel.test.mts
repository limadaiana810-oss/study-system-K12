import test from "node:test"
import assert from "node:assert/strict"

import { SOURCE_CHANNELS, assignDemoSourceChannels, getDemoSourceChannel } from "./fileSourceChannel.ts"

test("uses parent-friendly everyday source channels", () => {
  const labels = SOURCE_CHANNELS.map((channel) => channel.label)

  assert.deepEqual(labels, ["微信", "QQ", "钉钉", "飞书", "学校平台", "相册拍照", "网盘收藏"])
  assert.doesNotMatch(labels.join(" "), /邮箱附件|聊天上传|网页收藏/)
})

test("chooses a stable demo source channel from file identity", () => {
  const first = getDemoSourceChannel({ id: "file-1", fileName: "math.png" })
  const second = getDemoSourceChannel({ id: "file-1", fileName: "math.png" })

  assert.equal(first, second)
  assert.ok(SOURCE_CHANNELS.some((channel) => channel.label === first))
})

test("falls back to wechat when file identity is missing", () => {
  assert.equal(getDemoSourceChannel({ id: "", fileName: "" }), "微信")
})

test("balances demo source channels across a visible batch", () => {
  const files = Array.from({ length: 14 }, (_, index) => ({
    id: `file-${index + 1}`,
    fileName: `demo-${index + 1}.jpg`,
  }))

  const first = assignDemoSourceChannels(files)
  const second = assignDemoSourceChannels(files)
  const counts = new Map<string, number>()
  for (const channel of first) counts.set(channel, (counts.get(channel) || 0) + 1)

  assert.deepEqual(first, second)
  assert.equal(counts.size, SOURCE_CHANNELS.length)
  assert.ok(SOURCE_CHANNELS.every((channel) => (counts.get(channel.label) || 0) >= 1))
})
