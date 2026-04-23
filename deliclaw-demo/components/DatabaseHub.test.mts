import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

test("memory center keeps only student state avatar and long-term memory cards", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "components", "DatabaseHub.tsx"), "utf8")

  assert.match(source, /StudentStateAvatar/)
  assert.match(source, /长期记忆/)
  assert.match(source, /孩子状态 \+ 成长记忆/)
  assert.match(source, /MemoryCard/)
  assert.doesNotMatch(source, /FileManagerPanel/)
  assert.doesNotMatch(source, /activeTab/)
  assert.doesNotMatch(source, /setActiveTab/)
  assert.doesNotMatch(source, /文件中心/)
  assert.doesNotMatch(source, /实时理解/)
  assert.doesNotMatch(source, /短期记忆/)
  assert.doesNotMatch(source, /新增记忆候选/)
  assert.doesNotMatch(source, /待确认推测/)
  assert.doesNotMatch(source, /情绪趋势/)
  assert.doesNotMatch(source, /文件索引/)
  assert.doesNotMatch(source, /待命/)
})

test("student avatar animates when the active state image changes", () => {
  const componentSource = fs.readFileSync(path.join(process.cwd(), "components", "DatabaseHub.tsx"), "utf8")
  const cssSource = fs.readFileSync(path.join(process.cwd(), "app", "globals.css"), "utf8")

  assert.match(componentSource, /key=\{state\.src\}/)
  assert.match(componentSource, /student-avatar-enter/)
  assert.match(cssSource, /@keyframes student-avatar-enter/)
  assert.match(cssSource, /\.student-avatar-enter/)
})

test("student state card exposes only the user-facing state label", () => {
  const componentSource = fs.readFileSync(path.join(process.cwd(), "components", "DatabaseHub.tsx"), "utf8")

  assert.ok(componentSource.includes('alt={`${state.title}状态的Q版学生`}'))
  assert.doesNotMatch(componentSource, /\{state\.emotion\}/)
})
