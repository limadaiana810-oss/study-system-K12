import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"

test("uses the Next 16 proxy convention instead of deprecated middleware", () => {
  const root = process.cwd()
  const middlewarePath = path.join(root, "middleware.ts")
  const proxyPath = path.join(root, "proxy.ts")

  assert.equal(fs.existsSync(middlewarePath), false)
  assert.equal(fs.existsSync(proxyPath), true)

  const proxySource = fs.readFileSync(proxyPath, "utf8")
  assert.match(proxySource, /export function proxy\s*\(/)
  assert.doesNotMatch(proxySource, /export function middleware\s*\(/)
})
