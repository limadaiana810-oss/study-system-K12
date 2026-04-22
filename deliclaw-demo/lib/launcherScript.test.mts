import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"

test("launcher cleans stale project dev servers before starting port 3000", () => {
  const scriptPath = path.join(process.cwd(), "..", "开始演示.command")
  const script = fs.readFileSync(scriptPath, "utf8")

  assert.match(script, /cleanup_project_port_processes\(\)/)
  assert.match(script, /cleanup_next_dev_lock\(\)/)
  assert.match(script, /lsof -tiTCP:"\$port" -sTCP:LISTEN/)
  assert.match(script, /lsof -a -p "\$pid" -d cwd -Fn/)
  assert.match(script, /\.next\/dev\/lock/)
  assert.match(script, /wait_for_local_port_3000\(\)/)
})

test("launcher braces variables before non-ASCII punctuation", () => {
  const scriptPath = path.join(process.cwd(), "..", "开始演示.command")
  const script = fs.readFileSync(scriptPath, "utf8")

  assert.doesNotMatch(script, /\$[A-Za-z_][A-Za-z0-9_]*[^\x00-\x7F]/u)
})

test("launcher waits for the quick tunnel URL before opening the browser", () => {
  const scriptPath = path.join(process.cwd(), "..", "开始演示.command")
  const script = fs.readFileSync(scriptPath, "utf8")

  assert.match(script, /wait_for_public_url\(\)/)
  assert.match(script, /curl -I -L --max-time 8 "\$PUBLIC_URL"/)
  assert.match(script, /wait_for_public_url \|\| PUBLIC_URL=""/)
})

test("launcher includes the access token when falling back to localhost", () => {
  const scriptPath = path.join(process.cwd(), "..", "开始演示.command")
  const script = fs.readFileSync(scriptPath, "utf8")

  assert.match(script, /LOCAL_URL="http:\/\/127\.0\.0\.1:3000"/)
  assert.match(script, /LOCAL_URL="\$LOCAL_URL\/\?token=\$DEMO_TOKEN"/)
  assert.match(script, /open "\$LOCAL_URL"/)
  assert.match(script, /open "\$PUBLIC_URL"/)
})
