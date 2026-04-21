import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

import { normalizeStructuredFileIndex, readFileIndex, upsertFileIndexEntry } from "./fileIndex.ts"

test("upsertFileIndexEntry writes a single local index document and updates by id", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "deliclaw-file-index-"))

  const entry = normalizeStructuredFileIndex({
    id: "file-1",
    originalName: "IMG_0001.JPG",
    storedPath: "uploads/file-1.jpg",
    subject: "数学",
    knowledgePoints: [" 代数 ", "", "方程"],
    questionType: "",
    indexedAt: "2026-04-21T08:30:00.000Z",
    description:
      "这是一张关于代数与方程的错题照片，包含式子化简、解一元二次方程以及步骤批注，需要在上传时被截断到一百字以内。",
  })

  assert.equal(entry.canonicalName, "数学-代数-unknown-2026-04-21")
  assert.deepEqual(entry.knowledgePoints, ["代数", "方程"])
  assert.equal(entry.questionType, "unknown")
  assert.ok(entry.description.length <= 100)

  upsertFileIndexEntry(entry, root)

  const indexPath = path.join(root, "data", "file-index.json")
  assert.equal(fs.existsSync(indexPath), true)

  const firstRead = readFileIndex(root)
  assert.equal(firstRead.version, 1)
  assert.equal(firstRead.files.length, 1)
  assert.equal(firstRead.files[0]?.canonicalName, "数学-代数-unknown-2026-04-21")

  upsertFileIndexEntry(
    {
      ...entry,
      description: "更新后的描述",
      questionType: "错题",
      canonicalName: "数学-代数-错题-2026-04-21",
    },
    root
  )

  const secondRead = readFileIndex(root)
  assert.equal(secondRead.files.length, 1)
  assert.equal(secondRead.files[0]?.description, "更新后的描述")
  assert.equal(secondRead.files[0]?.questionType, "错题")
  assert.equal(secondRead.files[0]?.canonicalName, "数学-代数-错题-2026-04-21")
})
