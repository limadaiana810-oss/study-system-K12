import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

test("file center onboarding explains the three required modules in plain language", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "components", "FileCenterOnboarding.tsx"), "utf8")

  assert.match(source, /source-rail/)
  assert.match(source, /photo-grid/)
  assert.match(source, /ai-search/)
  assert.match(source, /各种方式交给智能体/)
  assert.match(source, /照片由智能体自动分类/)
  assert.match(source, /比你更懂自己/)
  assert.match(source, /下一步/)
  assert.match(source, /跳过/)
  assert.match(source, /知道了/)
})

test("file center onboarding step two shows the handwriting cleanup flow with fixed before and after images", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "components", "FileCenterOnboarding.tsx"), "utf8")

  assert.match(source, /去手写 AI/)
  assert.match(source, /wrong-question-before\.jpg/)
  assert.match(source, /wrong-question-after\.jpg/)
  assert.match(source, /PHOTO_FLOW_SOURCE_SELECTOR/)
  assert.match(source, /thumbnail-source/)
  assert.match(source, /moving-to-mask/)
  assert.match(source, /arrow-drawing/)
  assert.match(source, /label-visible/)
  assert.match(source, /after-visible/)
  assert.match(source, /PHOTO_FLOW_MOVE_DURATION_MS = 820/)
  assert.match(source, /PHOTO_FLOW_PAUSE_BEFORE_ARROW_MS = 500/)
  assert.match(source, /PHOTO_FLOW_PAUSE_BEFORE_AFTER_MS = 500/)
  assert.match(source, /PHOTO_FLOW_ARROW_DRAW_DURATION_MS/)
  assert.match(source, /PHOTO_FLOW_LABEL_ARROW_GAP = 10/)
  assert.match(source, /querySelector<HTMLElement>\(PHOTO_FLOW_SOURCE_SELECTOR\)/)
})

test("file center onboarding measures targets and supports skip interactions", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "components", "FileCenterOnboarding.tsx"), "utf8")

  assert.match(source, /getBoundingClientRect/)
  assert.match(source, /scrollIntoView/)
  assert.match(source, /prefers-reduced-motion/)
  assert.match(source, /boxShadow/)
  assert.match(source, /Escape/)
  assert.match(source, /onFinish/)
})

test("file center onboarding waits before drawing the arrow and showing the cleaned result", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "components", "FileCenterOnboarding.tsx"), "utf8")

  assert.match(source, /PHOTO_FLOW_SOURCE_HOLD_MS/)
  assert.match(source, /PHOTO_FLOW_PAUSE_BEFORE_ARROW_MS = 500/)
  assert.match(source, /PHOTO_FLOW_PAUSE_BEFORE_AFTER_MS = 500/)
  assert.match(source, /setPhotoFlowPhase\(PHOTO_FLOW_PHASES\.movingToMask\)/)
  assert.match(source, /setPhotoFlowPhase\(PHOTO_FLOW_PHASES\.arrowDrawing\)/)
  assert.match(source, /setPhotoFlowPhase\(PHOTO_FLOW_PHASES\.labelVisible\)/)
  assert.match(source, /setPhotoFlowPhase\(PHOTO_FLOW_PHASES\.afterVisible\)/)
})

test("file center onboarding shows the label only after the arrow stage and keeps reduced motion on the final frame", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "components", "FileCenterOnboarding.tsx"), "utf8")

  assert.match(source, /const showCleanupLabel = photoFlowPhase === PHOTO_FLOW_PHASES\.labelVisible \|\| photoFlowPhase === PHOTO_FLOW_PHASES\.afterVisible/)
  assert.match(source, /const showCleanupResult = photoFlowPhase === PHOTO_FLOW_PHASES\.afterVisible/)
  assert.match(source, /if \(prefersReducedMotion\(\)\) {\s+setPhotoFlowPhase\(PHOTO_FLOW_PHASES\.afterVisible\)/)
  assert.match(source, /labelTop: arrowRect\.top - labelHeight - scaledLabelArrowGap/)
  assert.doesNotMatch(source, /labelTop: flowTop/)
})

test("file center onboarding centers the step-two demo inside the dark zone instead of hugging the grid edge", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "components", "FileCenterOnboarding.tsx"), "utf8")

  assert.match(source, /type PhotoFlowDarkZoneRect =/)
  assert.match(source, /function getPhotoFlowDarkZoneRect\(rect: HighlightRect\)/)
  assert.match(source, /const darkZoneRect = getPhotoFlowDarkZoneRect\(rect\)/)
  assert.match(source, /const flowCenterX = darkZoneRect\.left \+ darkZoneRect\.width \/ 2/)
  assert.match(source, /const flowCenterY = darkZoneRect\.top \+ darkZoneRect\.height \/ 2/)
  assert.match(source, /flowRect:/)
})

test("file center onboarding keeps the explanation card away from the centered demo in step two", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "components", "FileCenterOnboarding.tsx"), "utf8")

  assert.match(source, /function getPhotoStepCardPosition\(layout: PhotoFlowLayout\): CardPosition/)
  assert.match(source, /const stepCardPosition = step\.target === "photo-grid" && photoFlowLayout \? getPhotoStepCardPosition\(photoFlowLayout\) : cardPosition/)
  assert.match(source, /style=\{stepCardStyle\}/)
})

test("file center onboarding reports the active target to its parent", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "components", "FileCenterOnboarding.tsx"), "utf8")

  assert.match(source, /onStepTargetChange\?: \(target: OnboardingTarget \| null\) => void/)
  assert.match(source, /onStepTargetChange\?\.\(active \? step\.target : null\)/)
  assert.match(source, /onStepTargetChange\?\.\(null\)/)
})
