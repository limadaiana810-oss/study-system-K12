import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

test("file manager presents an AI-native command surface instead of large modules", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "components", "FileManagerPanel.tsx"), "utf8")

  assert.match(source, /AI 文件系统/)
  assert.match(source, /AI 正在根据记忆片段检索/)
  assert.match(source, /commandSurface/)
  assert.match(source, /多渠道汇总/)
  assert.match(source, /记忆片段/)
  assert.match(source, /sourceChannel/)
  assert.doesNotMatch(source, /rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm/)
  assert.doesNotMatch(source, /rounded-2xl border border-slate-100 bg-white p-3 shadow-sm/)
  assert.doesNotMatch(source, /自动分类/)
  assert.doesNotMatch(source, /示例入口/)
  assert.doesNotMatch(source, /统一文件池/)
  assert.doesNotMatch(source, /一句话找回/)
  assert.doesNotMatch(source, /自动理解/)
  assert.doesNotMatch(source, /AI 标签/)
  assert.doesNotMatch(source, /分类树/)
  assert.doesNotMatch(source, /toggleQt/)
  assert.doesNotMatch(source, /expandedQt/)
})

test("file manager uses dense thumbnail flow for accumulated photos", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "components", "FileManagerPanel.tsx"), "utf8")

  assert.match(source, /ThumbnailTile/)
  assert.match(source, /2xl:grid-cols-10/)
  assert.match(source, /lg:grid-cols-8/)
  assert.match(source, /aspect-square/)
  assert.doesNotMatch(source, /aspect-\[4\/3\]/)
  assert.match(source, /grid grid-cols-3 gap-1\.5/)
})

test("file manager renders source channels as compact inline chips", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "components", "FileManagerPanel.tsx"), "utf8")

  assert.match(source, /SourceChips/)
  assert.match(source, /lg:grid-cols-7/)
  assert.match(source, /多渠道汇总/)
  assert.doesNotMatch(source, /家庭常用入口/)
  assert.doesNotMatch(source, /家长转发、班级群、作业平台、相册资料会汇总到这里/)
  assert.doesNotMatch(source, /rounded-xl border px-2 py-2/)
})

test("file manager places source rail above the AI title and keeps the lower rail scene-only", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "components", "FileManagerPanel.tsx"), "utf8")
  const sourceRailIndex = source.indexOf("<SourceChips files={files} />")
  const aiTitleIndex = source.indexOf("AI 文件系统")
  const lowerRailIndex = source.indexOf('className="space-y-3 border-y')
  const sceneRailIndex = source.indexOf("<SceneTabs files={files} activeScene={activeScene} onSceneChange={setActiveScene} />")

  assert.ok(sourceRailIndex >= 0)
  assert.ok(aiTitleIndex >= 0)
  assert.ok(lowerRailIndex >= 0)
  assert.ok(sceneRailIndex >= 0)
  assert.ok(sourceRailIndex < aiTitleIndex)
  assert.ok(sourceRailIndex < lowerRailIndex)
  assert.ok(sceneRailIndex > lowerRailIndex)
  assert.equal(source.match(/<SourceChips files=\{files\} \/>/g)?.length, 1)
  assert.doesNotMatch(source, /SourceSummary/)
  assert.doesNotMatch(source, /已汇总/)
})

test("file manager separates source import from business scene viewing", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "components", "FileManagerPanel.tsx"), "utf8")

  assert.match(source, /SceneTabs/)
  assert.match(source, /BUSINESS_SCENES/)
  assert.match(source, /getDemoBusinessScenes/)
  assert.match(source, /SCENE_VISUAL_TONES/)
  assert.match(source, /sceneTaskRail/)
  assert.match(source, /sceneIcon/)
  assert.match(source, /activeScene/)
  assert.doesNotMatch(source, /查看按场景/)
  assert.doesNotMatch(source, /不用记来源/)
  assert.doesNotMatch(source, /脚本演示/)
  assert.doesNotMatch(source, /按渠道查看/)
})

test("file manager switches thumbnail badges from source to active scene", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "components", "FileManagerPanel.tsx"), "utf8")

  assert.match(source, /activeScene: BusinessSceneLabel \| "全部"/)
  assert.match(source, /const badgeLabel = activeScene === "全部" \? sourceChannel : activeScene/)
  assert.match(source, /const badgeTone = activeScene === "全部" \? tone\.badge : getSceneVisualTone\(activeScene\)\.badge/)
  assert.match(source, /<ThumbnailTile key=\{file\.id\} file=\{file\} activeScene=\{activeScene\} onDelete=\{handleDelete\} \/>/)
})

test("file manager makes multichannel summary the colorful iOS visual layer", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "components", "FileManagerPanel.tsx"), "utf8")

  assert.match(source, /SOURCE_VISUAL_TONES/)
  assert.match(source, /getSourceVisualTone/)
  assert.match(source, /iosSourceRail/)
  assert.match(source, /bg-gradient-to-br/)
  assert.match(source, /backdrop-blur/)
  assert.match(source, /shadow-\[0_/)
  assert.match(source, /微信/)
  assert.match(source, /QQ/)
  assert.match(source, /钉钉/)
  assert.match(source, /飞书/)
  assert.match(source, /学校平台/)
  assert.match(source, /相册拍照/)
  assert.match(source, /网盘收藏/)
  assert.doesNotMatch(source, /班级群/)
  assert.doesNotMatch(source, /作业平台/)
  assert.doesNotMatch(source, /border border-slate-200 bg-white\/70 px-2\.5 py-1 font-semibold text-slate-600/)
  assert.doesNotMatch(source, /邮箱附件/)
  assert.doesNotMatch(source, /聊天上传/)
  assert.doesNotMatch(source, /AI 自动读取邮件/)
})

test("file thumbnail cards inherit varied source colors without breaking dense flow", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "components", "FileManagerPanel.tsx"), "utf8")

  assert.match(source, /const tone = getSourceVisualTone\(sourceChannel\)/)
  assert.match(source, /tone\.tile/)
  assert.match(source, /tone\.badge/)
  assert.match(source, /tone\.document/)
  assert.match(source, /hover:shadow-\[0_/)
  assert.match(source, /2xl:grid-cols-10/)
  assert.match(source, /aspect-square/)
})

test("file manager submits natural language file queries instead of live filter search", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "components", "FileManagerPanel.tsx"), "utf8")

  assert.match(source, /handleQuerySubmit/)
  assert.match(source, /\/api\/files\/search/)
  assert.match(source, /帮我找到 最近的错题和草原的旅游照片/)
  assert.match(source, /用你的记忆片段找到文件/)
  assert.match(source, /type="submit"/)
  assert.match(source, /发送/)
  assert.match(source, /submittedQuery/)
  assert.doesNotMatch(source, /placeholder="搜索文件"/)
})

test("file manager keeps classification labels out of the default thumbnail surface", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "components", "FileManagerPanel.tsx"), "utf8")

  assert.match(source, /记忆线索/)
  assert.doesNotMatch(source, /buildDisplayTags/)
  assert.doesNotMatch(source, /其他资料/)
  assert.doesNotMatch(source, /资料文件/)
  assert.doesNotMatch(source, /待分类/)
  assert.doesNotMatch(source, /未分类/)
})

test("file manager does not show duplicate warning callouts in the file flow", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "components", "FileManagerPanel.tsx"), "utf8")

  assert.doesNotMatch(source, /检测到 .*重复文件/)
  assert.doesNotMatch(source, /便于后台清理/)
})
