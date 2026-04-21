import test from "node:test"
import assert from "node:assert/strict"

import type { LocalFileIndexEntry } from "./fileIndex.ts"
import { mergeSearchResults, searchLocalFileIndex } from "./fileSearch.ts"

function makeEntry(
  overrides: Partial<LocalFileIndexEntry> & Pick<LocalFileIndexEntry, "id" | "originalName" | "storedPath">
): LocalFileIndexEntry {
  return {
    canonicalName: "数学-代数-错题-2026-04-21",
    subject: "数学",
    knowledgePoints: ["代数"],
    questionType: "错题",
    indexedAt: "2026-04-21",
    description: "一张代数错题照片，包含方程化简和计算步骤。",
    status: "ready",
    ...overrides,
  }
}

test("searchLocalFileIndex returns strong tag hits from the local index first", () => {
  const entries: LocalFileIndexEntry[] = [
    makeEntry({ id: "1", originalName: "IMG_0001.JPG", storedPath: "uploads/1.jpg" }),
    makeEntry({
      id: "2",
      originalName: "IMG_0002.JPG",
      storedPath: "uploads/2.jpg",
      canonicalName: "英语-阅读-错题-2026-04-21",
      subject: "英语",
      knowledgePoints: ["阅读"],
      description: "一张英语阅读错题照片。",
    }),
  ]

  const results = searchLocalFileIndex("帮我找数学代数错题", entries, 5)

  assert.equal(results.length, 1)
  assert.equal(results[0]?.id, "1")
  assert.equal(results[0]?.title, "数学-代数-错题-2026-04-21")
  assert.equal(results[0]?.url, "/api/uploads/1.jpg")
  assert.deepEqual(results[0]?.tags, {
    subject: "数学",
    questionType: "错题",
    knowledgePoints: ["代数"],
    date: "2026-04-21",
  })
  assert.equal(results[0]?.source, "local")
})

test("mergeSearchResults keeps local hits ahead of semantic fallbacks and de-duplicates by id", () => {
  const merged = mergeSearchResults(
    [
      {
        id: "1",
        fileName: "IMG_0001.JPG",
        title: "数学-代数-错题-2026-04-21",
        mimeType: "image/jpeg",
        url: "/api/uploads/1.jpg",
        uploadedAt: "2026-04-21",
        description: "一张代数错题照片。",
        tags: { subject: "数学", questionType: "错题", knowledgePoints: ["代数"], date: "2026-04-21" },
        tagsRaw: ["数学-代数-错题-2026-04-21", "数学", "错题", "代数"],
        score: 8,
        source: "local",
      },
    ],
    [
      {
        id: "1",
        fileName: "IMG_0001.JPG",
        title: "数学-代数-错题-2026-04-21",
        mimeType: "image/jpeg",
        url: "/api/uploads/1.jpg",
        uploadedAt: "2026-04-21",
        description: "一张代数错题照片。",
        tags: { subject: "数学", questionType: "错题", knowledgePoints: ["代数"], date: "2026-04-21" },
        tagsRaw: ["数学-代数-错题-2026-04-21", "数学", "错题", "代数"],
        score: 2.1,
        source: "semantic",
      },
      {
        id: "3",
        fileName: "IMG_0003.JPG",
        title: "物理-力学-错题-2026-04-21",
        mimeType: "image/jpeg",
        url: "/api/uploads/3.jpg",
        uploadedAt: "2026-04-21",
        description: "一张力学错题照片。",
        tags: { subject: "物理", questionType: "错题", knowledgePoints: ["力学"], date: "2026-04-21" },
        tagsRaw: ["物理-力学-错题-2026-04-21", "物理", "错题", "力学"],
        score: 1.4,
        source: "semantic",
      },
    ],
    6
  )

  assert.deepEqual(
    merged.map((item) => ({ id: item.id, source: item.source })),
    [
      { id: "1", source: "local" },
      { id: "3", source: "semantic" },
    ]
  )
})
