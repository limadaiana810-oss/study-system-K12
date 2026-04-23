import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

test("chat panel exposes file center as a header peer to the online DeliClaw identity", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "components", "ChatPanel.tsx"), "utf8")

  const onlineIdentity = source.indexOf("在线")
  const fileCenterNav = source.indexOf('onActiveViewChange("files")')
  const messagesRender = source.indexOf("messages.map")

  assert.match(source, /activeView/)
  assert.match(source, /onActiveViewChange:\s*\(view:\s*"chat" \| "files"\) => void/)
  assert.match(source, /onActiveViewChange\("chat"\)/)
  assert.match(source, /onActiveViewChange\("files"\)/)
  assert.doesNotMatch(source, /const \[activeView, setActiveView\] = useState/)
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

test("chat panel starts first-open onboarding by switching into file center", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "components", "ChatPanel.tsx"), "utf8")
  const storageSource = fs.readFileSync(path.join(process.cwd(), "lib", "onboardingStorage.ts"), "utf8")

  assert.match(storageSource, /deliclaw_file_onboarding_done/)
  assert.match(source, /FileCenterOnboarding/)
  assert.match(source, /showFileOnboarding/)
  assert.match(source, /localStorage\.getItem\(FILE_CENTER_ONBOARDING_STORAGE_KEY\)/)
  assert.match(source, /onActiveViewChange\(FILE_CENTER_VIEW\)/)
  assert.match(source, /localStorage\.setItem\(FILE_CENTER_ONBOARDING_STORAGE_KEY, "1"\)/)
  assert.match(source, /active=\{showFileOnboarding && activeView === "files"\}/)
})

test("chat panel limits scene badge mode to onboarding photo-grid step", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "components", "ChatPanel.tsx"), "utf8")

  assert.match(source, /const \[fileOnboardingTarget, setFileOnboardingTarget\] = useState<OnboardingTarget \| null>\(null\)/)
  assert.match(source, /const fileThumbnailBadgeMode = fileOnboardingTarget === "photo-grid" \? "scene" : "default"/)
  assert.match(source, /<FileManagerPanel thumbnailBadgeMode=\{fileThumbnailBadgeMode\} \/>/)
  assert.match(source, /onStepTargetChange=\{setFileOnboardingTarget\}/)
})

test("reset clears first-open onboarding completion so demos can replay it", () => {
  const pageSource = fs.readFileSync(path.join(process.cwd(), "app", "page.tsx"), "utf8")

  assert.match(pageSource, /FILE_CENTER_ONBOARDING_STORAGE_KEY/)
  assert.match(pageSource, /localStorage\.removeItem\(FILE_CENTER_ONBOARDING_STORAGE_KEY\)/)
})
