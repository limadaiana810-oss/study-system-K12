import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

import { listFiles, tryUpsertFile } from "./sqlite.ts"

test("sqlite backend avoids node:sqlite because Next production bundling cannot externalize it", () => {
  const source = fs.readFileSync(new URL("./sqlite.ts", import.meta.url), "utf8")

  assert.doesNotMatch(source, /node:sqlite/)
  assert.match(source, /sqlite3/)
})

test("tryUpsertFile persists rows with an available sqlite backend", () => {
  const originalCwd = process.cwd()
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deliclaw-sqlite-optional-"))
  process.chdir(tmp)

  try {
    let result: ReturnType<typeof tryUpsertFile> | undefined
    assert.doesNotThrow(() => {
      result = tryUpsertFile({
        id: "file-1",
        fileName: "algebra.png",
        title: "数学-代数-错题-2026-04-21",
        mimeType: "image/png",
        filePath: "uploads/file-1.png",
        uploadedAt: "2026-04-21",
        description: "一张代数错题截图。",
        tags: {
          subject: "数学",
          questionType: "错题",
          knowledgePoints: ["代数"],
          date: "2026-04-21",
        },
        tagsRaw: ["数学-代数-错题-2026-04-21", "数学", "错题", "代数"],
        createdAt: "2026-04-21T00:00:00.000Z",
        updatedAt: "2026-04-21T00:00:00.000Z",
      })
    })

    assert.ok(result)
    assert.equal(result.ok, true)

    const rows = listFiles()
    assert.equal(rows.length, 1)
    assert.equal(rows[0]?.id, "file-1")
    assert.equal(rows[0]?.fileName, "algebra.png")
  } finally {
    process.chdir(originalCwd)
  }
})
