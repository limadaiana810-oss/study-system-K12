import test from "node:test"
import assert from "node:assert/strict"

import { buildFileResultQuery, pickResolvedSearchResult } from "./fileResultResolver.ts"

test("buildFileResultQuery prefers fileName then canonicalName", () => {
  assert.equal(
    buildFileResultQuery({
      fileName: "IMG_0001.JPG",
      canonicalName: "数学-代数-错题-2026-04-21",
    }),
    "IMG_0001.JPG"
  )

  assert.equal(
    buildFileResultQuery({
      canonicalName: "数学-代数-错题-2026-04-21",
      tags: ["数学", "代数"],
    }),
    "数学-代数-错题-2026-04-21"
  )
})

test("pickResolvedSearchResult prefers exact canonical name match", () => {
  const picked = pickResolvedSearchResult(
    { canonicalName: "数学-代数-错题-2026-04-21" },
    [
      { fileName: "IMG_0002.JPG", title: "英语-阅读-错题-2026-04-21", uploadedAt: "2026-04-21" },
      { fileName: "IMG_0001.JPG", title: "数学-代数-错题-2026-04-21", uploadedAt: "2026-04-21" },
    ]
  )

  assert.equal(picked?.fileName, "IMG_0001.JPG")
})
