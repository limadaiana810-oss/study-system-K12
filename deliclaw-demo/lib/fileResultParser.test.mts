import test from "node:test"
import assert from "node:assert/strict"

import { extractFileResults, stripFileResultTags } from "./fileResultParser.ts"

test("extractFileResults keeps file references and ignores malformed payloads", () => {
  const input = `这是正文
<file-result>
{"canonicalName":"数学-代数-错题-2026-04-21","uploadedAt":"2026-04-21","tags":["数学","代数"]}
</file-result>
<file-result>
{"tags":["数学"]}
</file-result>`

  const results = extractFileResults(input)

  assert.deepEqual(results, [
    {
      canonicalName: "数学-代数-错题-2026-04-21",
      uploadedAt: "2026-04-21",
      tags: ["数学", "代数"],
    },
  ])

  assert.equal(stripFileResultTags(input), "这是正文")
})
