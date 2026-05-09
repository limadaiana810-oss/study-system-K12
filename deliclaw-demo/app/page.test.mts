import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

test("reset uses a guarded replace flow instead of flashing old state before reload", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "app", "page.tsx"), "utf8")

  assert.match(source, /const \[isResetting, setIsResetting\] = useState\(false\)/)
  assert.match(source, /const isResettingRef = useRef\(false\)/)
  assert.match(source, /isResettingRef\.current = true/)
  assert.match(source, /setIsResetting\(true\)/)
  assert.match(source, /window\.requestAnimationFrame\(\(\) => \{\s+window\.location\.replace\(window\.location\.pathname \+ window\.location\.search\)/)
  assert.doesNotMatch(source, /window\.location\.reload\(/)
})

test("reset skips persistence writes while a controlled reset navigation is in progress", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "app", "page.tsx"), "utf8")

  assert.match(source, /if \(!isLoaded \|\| isResetting\) return/)
  assert.match(source, /if \(isResettingRef\.current\) return/)
  // V13 editorial: 重置过场用 var(--wash-paper) 替代旧 bg-[#FAFAFA]，避免白底断层
  assert.match(source, /if \(isResetting\) {/)
  assert.match(source, /正在重新开始会话…/)
  assert.doesNotMatch(source, /bg-\[#FAFAFA\]/, "V13 dropped white-band loading screen background")
})

test("page owns the active view and passes it down to the chat panel", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "app", "page.tsx"), "utf8")

  assert.match(source, /const \[activeView, setActiveView\] = useState<"chat" \| "files" \| "reports">\("chat"\)/)
  assert.match(source, /<ChatPanel[\s\S]*activeView=\{activeView\}/)
  assert.match(source, /<ChatPanel[\s\S]*onActiveViewChange=\{setActiveView\}/)
})

test("page only renders the memory hub while the chat view is active", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "app", "page.tsx"), "utf8")

  assert.match(source, /activeView === "chat" && \(/)
  assert.match(source, /<DatabaseHub/)
  assert.doesNotMatch(source, /<div className="w-72 flex-shrink-0">\s*<DatabaseHub[\s\S]*<\/div>\s*<\/div>\s*<\/div>/)
})

test("page auto-confirms due inferred candidates into long-term memory", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "app", "page.tsx"), "utf8")

  assert.match(source, /acceptDueInferredCandidates/)
  assert.match(source, /getNextAutoConfirmDelay/)
  assert.match(source, /window\.setTimeout/)
  assert.match(source, /setPendingInferred\(nextPendingInferred\)/)
  assert.match(source, /setMemory\(nextMemory\)/)
})
