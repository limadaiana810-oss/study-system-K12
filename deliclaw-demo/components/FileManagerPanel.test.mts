import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const SOURCE = fs.readFileSync(
  path.join(process.cwd(), "components", "FileManagerPanel.tsx"),
  "utf8",
)

test("file manager presents an AI-native command surface (editorial)", () => {
  // V15 minimal: workstation kept; search tier reduced to small label + 52px input + chip rail
  assert.match(SOURCE, /小迪 · 文件助手/, "search tier carries the 小迪 · 文件助手 small label")
  assert.match(SOURCE, /工作台/)
  assert.match(SOURCE, /渠道汇总/)
  assert.match(SOURCE, /sourceChannel/)
  assert.match(SOURCE, /正在查找相关文件/)
  // V15: editorial chrome 使用 design tokens
  assert.match(SOURCE, /var\(--paper\)|var\(--ink-1\)|var\(--brand\)/)
  // V15 dropped — heavy hero copy gone, replaced by single small label
  assert.doesNotMatch(SOURCE, /我是小迪，/, "V15 dropped V14 'I am 小迪' hero")
  assert.doesNotMatch(SOURCE, /你的文件助手。/, "V15 dropped V14 italic accent line")
  assert.doesNotMatch(SOURCE, /说出印象，找回文件/, "V15 dropped V14 secondary subtitle")
  assert.doesNotMatch(SOURCE, /describe what you remember/, "V15 dropped italic English eyebrow")
  assert.doesNotMatch(SOURCE, /想到哪句说哪句/, "V15 dropped uppercase eyebrow")
  assert.doesNotMatch(SOURCE, /可以说时间、来源、内容或场景。/, "V15 dropped subtitle paragraph")
  assert.doesNotMatch(SOURCE, /比如这样说：/, "V15 dropped chip-rail leading label")
  // 旧 V13 hero 文案不复活
  assert.doesNotMatch(SOURCE, /想找哪份文件？/, "V14 dropped V13 hero question")
  assert.doesNotMatch(SOURCE, /多渠道汇总/, "V14 renamed to 渠道汇总 inside workstation")
  // 旧 v0 demo 文案不能复活
  assert.doesNotMatch(SOURCE, /AI 正在根据记忆片段检索/)
  assert.doesNotMatch(SOURCE, /记忆片段/)
  assert.doesNotMatch(SOURCE, /自动分类/)
  assert.doesNotMatch(SOURCE, /示例入口/)
  assert.doesNotMatch(SOURCE, /统一文件池/)
  assert.doesNotMatch(SOURCE, /一句话找回/)
  assert.doesNotMatch(SOURCE, /自动理解/)
  assert.doesNotMatch(SOURCE, /AI 标签/)
  assert.doesNotMatch(SOURCE, /分类树/)
  assert.doesNotMatch(SOURCE, /toggleQt/)
  assert.doesNotMatch(SOURCE, /expandedQt/)
})

test("file manager uses dense thumbnail grid (editorial)", () => {
  // V13: thumbnail 仍为 1:1 占位卡，dense grid（密度由 inline grid-template 控制）
  assert.match(SOURCE, /ThumbnailTile/)
  assert.match(SOURCE, /aspectRatio: "1 \/ 1"|aspect-square/)
  // grid 模板（auto-fill / minmax 或 grid-cols-N）
  assert.match(SOURCE, /grid-cols-|gridTemplateColumns/)
})

test("file manager renders source channels as inline chips", () => {
  assert.match(SOURCE, /SourceChips/)
  assert.match(SOURCE, /渠道汇总/)
  assert.match(SOURCE, /multi-channel inbox/)
  assert.match(SOURCE, /本周新增/)
  // SOURCE_CHANNELS 从 @/lib/fileSourceChannel 导入，循环 render
  assert.match(SOURCE, /SOURCE_CHANNELS/)
  // V13 editorial: 不再用旧的 v0 文案
  assert.doesNotMatch(SOURCE, /家庭常用入口/)
  assert.doesNotMatch(SOURCE, /家长转发、班级群、作业平台、相册资料会汇总到这里/)
})

test("V14: AI 工具箱 has 通用处理 + 学习场景 tiers with badges, smart actions header, and 11 tools", () => {
  // 工作台 chrome — inner header carries smart actions + 项/类 counter
  assert.match(SOURCE, /AI 工具箱/)
  assert.match(SOURCE, /smart actions/)
  assert.match(SOURCE, / 项/)
  assert.match(SOURCE, / 类/)
  // Tier 1 — 通用处理 (UTILITY)
  assert.match(SOURCE, /通用处理/)
  assert.match(SOURCE, /UTILITY/)
  assert.match(SOURCE, /图片处理/)
  assert.match(SOURCE, /去背景/)
  assert.match(SOURCE, /去笔迹/)
  assert.match(SOURCE, /试卷切割/)
  assert.match(SOURCE, /试卷切题/)
  assert.match(SOURCE, /内容提取/)
  assert.match(SOURCE, /文档处理/)
  assert.match(SOURCE, /PDF 转 Word/)
  assert.match(SOURCE, /Word 转 PDF/)
  // Tier 2 — 学习场景 (LEARNING)
  assert.match(SOURCE, /学习场景/)
  assert.match(SOURCE, /LEARNING/)
  assert.match(SOURCE, /错题回顾/)
  assert.match(SOURCE, /举一反三/)
  assert.match(SOURCE, /深度学习/)
  assert.match(SOURCE, /题目批改/)
  // V13 旧组名带「类」后缀，V14 已去掉
  assert.doesNotMatch(SOURCE, /图片处理类/, "V14 dropped 类 suffix")
  assert.doesNotMatch(SOURCE, /文档处理类/)
  assert.doesNotMatch(SOURCE, /学习场景类/)
  // V14 转 字两侧用空格，旧无空格写法不复活
  assert.doesNotMatch(SOURCE, /PDF转Word/, "V14 uses spaced 'PDF 转 Word'")
  assert.doesNotMatch(SOURCE, /Word转PDF/, "V14 uses spaced 'Word 转 PDF'")
})

test("V14: 渠道汇总 renders bars with 最近一次 footer + 本周新增 pill", () => {
  assert.match(SOURCE, /渠道汇总/)
  assert.match(SOURCE, /multi-channel inbox/)
  assert.match(SOURCE, /本周新增/)
  assert.match(SOURCE, /最近一次/)
  assert.match(SOURCE, / 份/)
  assert.match(SOURCE, / 渠道/)
})

test("V15: search tier carries 4 example hint chips (no leading label)", () => {
  // V15 dropped the "比如这样说：" prefix — chips stand alone below the input
  assert.doesNotMatch(SOURCE, /比如这样说：/, "V15 chip rail has no leading label")
  assert.match(SOURCE, /上周做错的那道英语题/)
  assert.match(SOURCE, /妈妈在钉钉里发的考试通知/)
  assert.match(SOURCE, /暑假在草原拍的那张照片/)
  assert.match(SOURCE, /老师讲化学时的那份讲义/)
})

test("file manager exposes stable onboarding targets for first-open guidance", () => {
  assert.match(SOURCE, /data-onboarding-target="source-rail"/)
  assert.match(SOURCE, /data-onboarding-target="ai-search"/)
  assert.match(SOURCE, /data-onboarding-target="photo-grid"/)
  assert.match(SOURCE, /data-onboarding-photo-origin=\{isOnboardingWrongQuestion \? "wrong-question" : undefined\}/)
  assert.match(SOURCE, /isWrongQuestionCandidate\(file\)/)
  assert.match(SOURCE, /getDemoBusinessScenes\(file\)\.includes\("最近错题"\)/)
})

test("file manager scene viewing uses BUSINESS_SCENES + getDemoBusinessScenes", () => {
  assert.match(SOURCE, /SceneTabs/)
  assert.match(SOURCE, /BUSINESS_SCENES/)
  assert.match(SOURCE, /getDemoBusinessScenes/)
  assert.match(SOURCE, /activeScene/)
  assert.doesNotMatch(SOURCE, /查看按场景/)
  assert.doesNotMatch(SOURCE, /不用记来源/)
  assert.doesNotMatch(SOURCE, /脚本演示/)
  assert.doesNotMatch(SOURCE, /按渠道查看/)
})

test("file manager switches thumbnail badges from source to active scene", () => {
  assert.match(SOURCE, /activeScene: BusinessSceneLabel \| "全部"/)
  assert.match(SOURCE, /shouldShowSceneBadge = thumbnailBadgeMode === "scene" \|\| activeScene !== "全部"/)
  assert.match(SOURCE, /badgeScene = activeScene === "全部" \? getDemoBusinessScenes\(file\)\[0\] : activeScene/)
  assert.match(SOURCE, /badgeLabel = shouldShowSceneBadge \? badgeScene \?\? "已分类" : sourceChannel/)
  assert.match(SOURCE, /<ThumbnailTile/)
  assert.match(SOURCE, /thumbnailBadgeMode=\{thumbnailBadgeMode\}/)
  assert.match(SOURCE, /isOnboardingWrongQuestion=\{isOnboardingWrongQuestion\}/)
  assert.match(SOURCE, /onDelete=\{handleDelete\}/)
})

test("file manager accepts thumbnailBadgeMode without changing default view", () => {
  assert.match(SOURCE, /thumbnailBadgeMode\?: "default" \| "scene"/)
  assert.match(SOURCE, /thumbnailBadgeMode = "default"/)
  assert.match(SOURCE, /thumbnailBadgeMode=\{thumbnailBadgeMode\}/)
  assert.match(SOURCE, /thumbnailBadgeMode: "default" \| "scene"/)
  assert.match(SOURCE, /shouldShowSceneBadge/)
  assert.match(SOURCE, /sourceChannel/)
  assert.match(SOURCE, /已分类/)
})

test("file manager submits natural language file queries", () => {
  assert.match(SOURCE, /handleQuerySubmit/)
  assert.match(SOURCE, /\/api\/files\/search/)
  // V15: placeholder shortened — "时间、来源、内容、场景——说一句就行"
  assert.match(SOURCE, /时间、来源、内容、场景/, "V15 placeholder uses minimal phrasing")
  assert.match(SOURCE, /说一句就行/)
  assert.match(SOURCE, /submittedQuery/)
  assert.doesNotMatch(SOURCE, /placeholder="搜索文件"/)
  assert.doesNotMatch(SOURCE, /用你的记忆片段找到文件/)
  assert.doesNotMatch(SOURCE, /发送/)
  // V15: 查找 button removed — Enter triggers submit; chip rail / × clear handle the rest
  assert.doesNotMatch(SOURCE, />查找</, "V15 dropped 查找 button — Enter submits")
  assert.doesNotMatch(SOURCE, /找上周的英语错题，或者草原旅行照片/, "V15 dropped V13 example placeholder")
  assert.match(SOURCE, /没找到相关文件。可以换个时间、来源或内容再试。/)
})

test("file manager keeps classification labels out of the default thumbnail surface", () => {
  assert.match(SOURCE, /记忆线索/)
  assert.doesNotMatch(SOURCE, /buildDisplayTags/)
  assert.doesNotMatch(SOURCE, /其他资料/)
  assert.doesNotMatch(SOURCE, /资料文件/)
  assert.doesNotMatch(SOURCE, /待分类/)
  assert.doesNotMatch(SOURCE, /未分类/)
})

test("file manager does not show duplicate warning callouts in the file flow", () => {
  assert.doesNotMatch(SOURCE, /检测到 .*重复文件/)
  assert.doesNotMatch(SOURCE, /便于后台清理/)
})

test("V15 editorial: source uses serif/italic editorial markers (no v0 demo flavor)", () => {
  // editorial design tokens
  assert.match(SOURCE, /var\(--font-display\)/, "must reference serif display font")
  assert.match(SOURCE, /File Center/, "italic English subtitle in top eyebrow")
  // 已替换的旧 v0 / V13 / V14 文案不复活
  assert.doesNotMatch(SOURCE, /commandSurface/, "V13 dropped commandSurface wrapper class")
  assert.doesNotMatch(SOURCE, /AI 文件系统/, "V13/14 hero never used 'AI 文件系统' eyebrow")
  assert.doesNotMatch(SOURCE, /想找哪份文件？/, "V14 dropped V13 hero question")
  assert.doesNotMatch(SOURCE, /我是小迪，/, "V15 dropped V14 hero — search tier now uses small label only")
})
