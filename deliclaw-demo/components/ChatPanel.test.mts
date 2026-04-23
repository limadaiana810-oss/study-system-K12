import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

test("chat panel exposes file center as a header peer to the online DeliClaw identity", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "components", "ChatPanel.tsx"), "utf8")

  const onlineIdentity = source.indexOf("在线")
  const fileCenterNav = source.indexOf('setActiveView("files")')
  const messagesRender = source.indexOf("messages.map")

  assert.match(source, /activeView/)
  assert.match(source, /setActiveView\("chat"\)/)
  assert.match(source, /setActiveView\("files"\)/)
  assert.match(source, /文件中心/)
  assert.match(source, /点我找文件/)
  assert.notEqual(onlineIdentity, -1)
  assert.notEqual(fileCenterNav, -1)
  assert.notEqual(messagesRender, -1)
  assert.ok(onlineIdentity < fileCenterNav)
})

test("chat panel switches to file center in-page instead of embedding it above messages", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "components", "ChatPanel.tsx"), "utf8")

  const fileCenterRender = source.indexOf("<FileManagerPanel")
  const messagesRender = source.indexOf("messages.map")

  assert.notEqual(fileCenterRender, -1)
  assert.notEqual(messagesRender, -1)
  assert.ok(messagesRender < fileCenterRender)
  assert.match(source, /activeView === "chat"/)
  assert.match(source, /activeView === "files"/)
  assert.doesNotMatch(source, /window\.open/)
  assert.doesNotMatch(source, /target="_blank"/)
})
