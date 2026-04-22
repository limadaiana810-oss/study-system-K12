import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"

test("allows Cloudflare quick tunnel origins in Next dev", () => {
  const configPath = path.join(process.cwd(), "next.config.ts")
  const config = fs.readFileSync(configPath, "utf8")

  assert.match(config, /allowedDevOrigins\s*:/)
  assert.match(config, /["']\*\.trycloudflare\.com["']/)
})
