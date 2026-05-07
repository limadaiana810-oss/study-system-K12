# 错题报告 V4 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to execute task-by-task.

**Goal:** 在 V3 基础上加首屏行动卡（HeroSignalsBar + TodayPickCard），让学生进入报告就知道"现在做什么"；同步把所有文案按新 banned-words 表回扫一遍。

**Architecture:** 现有 V3 数据契约 + 视图保留；新增 `gapSignal` + `todayPick` 字段，新增 `HeroSignalsBar`（替换 `ProgressSignalBar`）+ `TodayPickCard` 组件，全局文案按新口吻 polish。完成态复用 `reportTaskState` 的 `done[taskId]`。

**Tech Stack:** Next.js 16 webpack / React 19 / TypeScript / TailwindCSS v4 / recharts

**Spec:** `deliclaw-demo/docs/superpowers/specs/2026-05-07-wrong-question-report-v4-design.md`

---

## Task 1: 数据契约 + Mock + Cache 校验

**Files:**
- Modify: `deliclaw-demo/lib/reportTypes.ts` — 加 `gapSignal`、`todayPick`
- Modify: `deliclaw-demo/lib/mockReports.ts` — 新字段 + 4 处文案改写
- Modify: `deliclaw-demo/lib/reportCache.ts` — `isWrongQuestionReportShape` 加新字段校验
- Test: `deliclaw-demo/lib/mockReports.test.mts` — 新断言 + banned-words 增补
- Test: `deliclaw-demo/lib/reportCache.test.mts` — V3 旧 shape 拒绝 / V4 通过

**Acceptance:**
- `WrongQuestionReport` 类型含 `gapSignal: string` 和 `todayPick: TodayPick`
- mock 通过 `WrongQuestionReport` 类型检查；4 处旧文案改为新版（见 spec §4）
- mock 不出现：稳稳的 / 稳住 / 拆开 / 拆解 / 提升 / 持续 / 整体呈 / 立即（旧的 banned-words 也保留）
- cache 校验在缺 `gapSignal` 或 `todayPick` 时返回 null（auto-discard V3）
- `node --experimental-strip-types --test lib/mockReports.test.mts lib/reportCache.test.mts` 全绿

**TDD 步骤：**

- [ ] 1.1 在 `mockReports.test.mts` 加 RED 测试：断言 `gapSignal === "物理单位换算又冒头，第 3 次了"`、`todayPick.taskText === "5 分钟，重做 4/12 那道二次函数"`、`todayPick.durationMinutes === 5`、`todayPick.whyLine === "上次你把 h = -2 写成了 2"`、`todayPick.taskId === "focus-0-task-0"`、`todayPick.fileRef` 含 "数学-错题-2026-04-12"。运行确认 FAIL。

- [ ] 1.2 在 `mockReports.test.mts` 加 banned-words 增补：JSON.stringify 不含 稳 / 节奏 / 拆 / 提升 / 持续 / 整体呈 / 立即 / 马上。运行确认 FAIL（V3 现 mock 含"节奏稳住"）。

- [ ] 1.3 在 `reportTypes.ts` 加 `TodayPick` 类型 + `WrongQuestionReport` 加两个字段。

- [ ] 1.4 在 `mockReports.ts` 把 `progressSignal` / `focusPicks[0].stepDiagnosis` / `focusPicks[0].closingLine` / `weeklyTrend.summary` 按 spec §4 改写；加 `gapSignal` 和 `todayPick`。

- [ ] 1.5 运行 mockReports 测试，全绿。

- [ ] 1.6 在 `reportCache.test.mts` 加 RED 测试：传 V3 旧 shape（无 gapSignal/todayPick）→ `isWrongQuestionReportShape` 返回 false；传完整 V4 shape → 返回 true；传 todayPick.durationMinutes 为字符串 → false。运行确认 FAIL。

- [ ] 1.7 在 `reportCache.ts` 给 `isWrongQuestionReportShape` 加两段 guard：检查 gapSignal 是 string；检查 todayPick 是 object 且含 taskId/taskText/durationMinutes/whyLine/fileRef 五个字段，类型对得上。

- [ ] 1.8 跑两个测试文件，全绿。

- [ ] 1.9 Commit：`feat(reports v4): contract + mock + cache for hero signals & today pick`

**注意：**
- `todayPick.taskId` 必须真实指向 `focusPicks[0].tasks[0].id`（"focus-0-task-0"），否则后续滚动跳转会断。test 要断言这个一致性。
- `whyLine` 不要直接复用 stepDiagnosis 整段，是单独一句聚焦"上次卡在哪"的话。

---

## Task 2: HeroSignalsBar + TodayPickCard 视图

**Files:**
- Modify: `deliclaw-demo/components/WrongQuestionReportView.tsx` — 重写顶部块
- Test: `deliclaw-demo/components/WrongQuestionReportView.test.mts` — V4 source-regex 断言

**Acceptance:**
- 把 V3 的 `ProgressSignalBar` 改名/重写为 `HeroSignalsBar`，吃 `progressSignal` + `gapSignal`，渲染两行（✓ 行用绿色调，⚠ 行用警示色）
- 空字符串字段对应行不渲染
- 新增 `TodayPickCard`：渲染 header「现在做这一件」、`N 分钟，[taskText]`、whyLine、「开始」按钮
- 「开始」按钮：`onClick` 调用 `jumpToFirstTask` 风格的滚动到 `#task-${todayPick.taskId}`，复用 V3 既有滚动 + 高亮模式
- 完成态：当 `taskState[todayPick.taskId]` 为 true 时，TodayPickCard 显示「✓ 今天这件做完了 / [fileRef 简写] / 下面还有计划，想继续就往下翻」
- 渲染顺序：Header → HeroSignalsBar → TodayPickCard → 「↓ 想看完整本周计划，往下翻」分隔 → FocusCards → WeeklyTrend → MoreToPractice
- chrome 不出现：稳 / 节奏 / 拆 / 提升 / 持续 / 立即 / 马上 / 今日任务 / 立即行动 / 本日推荐
- 测试全绿

**TDD 步骤：**

- [ ] 2.1 在 `WrongQuestionReportView.test.mts` 加 RED 断言：source 含 "现在做这一件"、含 "HeroSignalsBar"、含 "TodayPickCard"、不含 "ProgressSignalBar"、含 progressSignal 渲染（✓ 前缀）、含 gapSignal 渲染（⚠ 前缀）、含「开始」按钮、含 `#task-${...todayPick.taskId}`-风格的滚动。运行确认 FAIL。

- [ ] 2.2 chrome banned-words 测试：source 不含 稳 / 节奏 / 拆 / 提升 / 持续 / 立即 / 马上 / 今日任务 / 立即行动 / 本日推荐 / 了解更多 / 展开查看。运行确认 FAIL（V3 chrome 没出现这些，但要锁住）。

- [ ] 2.3 在 `WrongQuestionReportView.tsx`：
  - 删 `ProgressSignalBar` 组件，新增 `HeroSignalsBar({ progressSignal, gapSignal })`：两行结构，空字符串对应行隐藏
  - 新增 `TodayPickCard({ todayPick, taskState, onStart })`：完整态 + 完成态两路分支
  - 「开始」按钮 `onClick={() => onStart(todayPick.taskId)}`，`onStart` 沿用 jumpToFirstTask 的 `document.getElementById('task-' + id)?.scrollIntoView({ behavior: 'smooth' })` + flash class
  - 主组件渲染顺序按 acceptance 列出的来；分隔提示用 `<p className="text-center text-xs text-neutral-500">↓ 想看完整本周计划，往下翻</p>`

- [ ] 2.4 跑测试，全绿。

- [ ] 2.5 在 `app/page.tsx`（或合适位置）烟测：从聊天打开 ReportCenterPanel → 错题报告，确认顶部布局符合 mockup B；按「开始」滚动到 focusPicks[0].tasks[0]，高亮 1.5 秒。

- [ ] 2.6 Commit：`feat(reports v4): HeroSignalsBar + TodayPickCard hero block`

**注意：**
- 完成态判断必须读 `taskState`，不要新建 state。
- 「开始」按钮高度做大（>= 48px tap target），文字「开始」不要带 emoji 或修饰。

---

## Task 3: 全局文案 polish + section header

**Files:**
- Modify: `deliclaw-demo/components/WrongQuestionReportView.tsx` — section header / WeeklyTrend title / MoreToPractice title / FocusCard ─── 段标
- Test: `deliclaw-demo/components/WrongQuestionReportView.test.mts` — section copy 断言

**Acceptance:**
- FocusCards 区 section header：「这周先把这两道拿下」（V3 是别的），副标题「做完这两道，这周就算过去了。」
- WeeklyTrendCard title：「本月错题，一周一根」
- MoreToPracticeCard title：「其他还在冒头的（N）」（N 是动态计数）
- FocusCard 段标：「上次卡在哪」/「这周怎么补」/「下次再遇到」（V3 已是这套，确认无修改即可；如有偏差则改齐）
- 页面底部：「本月一共 N 道错题，覆盖 M 个学科 / 下次错题进来，会自动加进这份报告」（N、M 从 weakPoints 推断或固定 12/5 demo 数）
- chrome banned-words 锁住（Task 2 已加，本任务确认未引入新违规）
- 测试全绿

**TDD 步骤：**

- [ ] 3.1 在 `WrongQuestionReportView.test.mts` 加 RED 断言：source 含 "这周先把这两道拿下"、"做完这两道"、"本月错题，一周一根"、"其他还在冒头的"、"下次错题进来，会自动加进这份报告"。运行确认 FAIL。

- [ ] 3.2 改 `WrongQuestionReportView.tsx`：FocusCards 区 header / WeeklyTrendCard title / MoreToPracticeCard title / 页面底部文案。

- [ ] 3.3 跑测试，全绿。

- [ ] 3.4 整套测试跑一遍：`node --experimental-strip-types --test lib/userInputParser.test.mts lib/prompts.test.mts lib/fileUploadFeedback.test.mts lib/server/sqliteOptional.test.mts lib/nextConfig.test.mts lib/launcherScript.test.mts lib/mockReports.test.mts lib/reportCache.test.mts lib/reportTaskState.test.mts components/WrongQuestionReportView.test.mts`

- [ ] 3.5 `npm run build`：通过。

- [ ] 3.6 Commit：`feat(reports v4): section copy polish & banned-words sweep`

---

## 完工后

跑 `superpowers:finishing-a-development-branch` 收尾：测试全绿 → 用户选 1（merge to master）/ 2（PR）/ 3（保留）/ 4（discard）。
