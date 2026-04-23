import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

test("file list API exposes a demo source channel for each managed file", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "app", "api", "files", "list", "route.ts"), "utf8")

  assert.match(source, /assignDemoSourceChannels/)
  assert.match(source, /sourceChannels\[index\]/)
  assert.match(source, /sourceChannel:/)
})

test("file list API normalizes missing categories without uncategorized UI labels", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "app", "api", "files", "list", "route.ts"), "utf8")

  assert.match(source, /normalizeFileClassification/)
  assert.doesNotMatch(source, /未分类/)
  assert.doesNotMatch(source, /待分类/)
  assert.doesNotMatch(source, /unknown/)
})
