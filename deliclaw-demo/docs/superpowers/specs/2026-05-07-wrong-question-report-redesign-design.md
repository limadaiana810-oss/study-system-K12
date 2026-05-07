# 错题报告 V2 改版设计（Focus + Trend + 折叠兜底）

**日期**: 2026-05-07
**作者**: Claude（与 limadaiana810 协作）
**改造范围**: `WrongQuestionReportView` 及其数据契约

---

## 1. 问题陈述

当前 `WrongQuestionReportView` 把一个错题报告切成 4 个并列 section（错题总览 / 薄弱知识点 / 错误模式 / 提分行动），存在两类问题：

**结构错位** — 同一条诊断（例：二次函数 → 符号判断错位 → 专项练习 15 道）被拆到 3 个 section 里平铺，用户必须在 section 之间反复跳转才能拼出"是什么 / 为啥错 / 怎么补"。

**违反学习科学** — 5 条薄弱点 + 4 条行动平铺导致选择悖论；饼图/柱状图是虚荣指标，对决策无价值；缺少时间维度让报告沦为静态快照、无反馈回路。

## 2. 设计目标（按优先级）

1. **5 秒锁定本周该做什么**：首屏只显示 1-2 个最该补的知识点，附带可勾选的具体任务。
2. **诊断纵向打通**：每个焦点知识点把"症结 → 本周任务 → 完成后预期"放在同一张卡内。
3. **加入反馈回路**：以 4 周错题数趋势替代静态总览，让学生看到自己在改善。
4. **合并去重**：消除"薄弱知识点 / 错误模式 / 提分行动"三处对同一根因的重复表述。
5. **保留兜底**：其他薄弱点折叠收起，需要时仍可查看。

## 3. 信息架构（V2）

页面从上到下 4 个区块：

```
┌────────────────────────────────────────┐
│ A. 本周聚焦   (主角，2 张焦点卡)         │
│ B. 错题节奏   (4 周柱状图 + 一句趋势判断)│
│ C. 其他薄弱点 (默认收起，标题显示数量)    │
│ D. 错题分布   (1 行 chip)                │
└────────────────────────────────────────┘
```

**A. 本周聚焦** — 每张焦点卡内容：
- 卡头：序号 + 知识点名 + 学科 chip + 错题数 chip + 优先级标签
- 症结：1 句话讲根因（来自原 `errorPatterns.evidence`）
- 本周任务：2 项 checkbox（来自原 `actionPlan.action`，针对该知识点的拆解）
- 完成后预期：1 句正确率/提分预期（来自原 `actionPlan.estimatedGain`，但说人话）
- 相关错题：原 `errorPatterns.fileRefs` 的文件名，做成 chip（暂不点击）

**B. 错题节奏** — 4 周柱状图：
- X 轴 W1/W2/W3/W4，Y 轴错题数
- 柱条颜色一致（不分学科），高度反映周错题数
- 下方一句趋势判断：例 "本月在好转：从周 5 题降到周 1 题，继续保持。"

**C. 其他薄弱点** — 折叠区块：
- 标题 "其他薄弱点 (3) ▾"，默认收起
- 展开后每条一行卡：知识点 + 学科·次数 + 简短建议
- 不再单独 render 旧的 errorPatterns / actionPlan section

**D. 错题分布** — 单行 chip：
- 形如 `共 12 道 · 数学 5 · 物理 3 · 英语 2 · 化学 1 · 语文 1`
- 移除饼图、柱状图

## 4. 数据契约变更

**决策：扩展 `WrongQuestionReport` 类型**（用户已确认）。在 `lib/reportTypes.ts` 上：

**新增**：
```ts
export type FocusPick = {
  knowledgePoint: string
  subject: string
  occurrences: number
  priority: "高" | "中"            // 焦点卡只允许高/中
  diagnosis: string                 // 症结，1 句话（≤40 字）
  tasks: { id: string; text: string }[]  // 本周任务，长度 1-3
  expectedOutcome: string           // 完成后预期，1 句话
  fileRefs: string[]                // 相关错题文件名
}

export type WeeklyTrendPoint = {
  week: 1 | 2 | 3 | 4
  count: number
}

export type WeeklyTrend = {
  series: WeeklyTrendPoint[]        // 长度 4，按 week 升序
  summary: string                   // 趋势判断，1 句
}
```

**修改 `WrongQuestionReport`**：
```ts
export type WrongQuestionReport = {
  generatedAt: string
  windowDays: 30
  overview: { ... }                 // 保留（仍为 D 区块的数据源）
  focusPicks: FocusPick[]           // 新增，长度 1-2
  weeklyTrend: WeeklyTrend          // 新增
  weakPoints: { ... }[]             // 保留（C 区块的数据源）
  // 删除：errorPatterns、actionPlan
}
```

**删除字段说明**：原 `errorPatterns` 与 `actionPlan` 的内容已被合并进 `focusPicks[].diagnosis` / `focusPicks[].tasks` / `focusPicks[].fileRefs`。前端不再直接消费这两个数组，因此从类型上一并删除（避免"类型存在但无人使用"的代码异味）。

**对 `lib/reportPrompts.ts` 的影响**：`WRONG_QUESTION_REPORT_PROMPT` 中的 JSON schema 字符串需要同步更新，否则未来切回 LLM 模式时输出无法匹配类型。本改造一并修复。

**对缓存的影响**：`reportCache.ts` 的 `isWrongQuestionReportShape` 需更新为校验新字段；旧形状的缓存会被自动 discard 并重新生成，无需迁移。

## 5. 任务勾选状态持久化

**决策：写入 localStorage**（用户已确认）。

**Key 设计**：
```
deliclaw_report_wq_tasks: {
  generatedAt: string                   // 必须匹配当前 report.generatedAt
  done: { [taskId: string]: true }
}
```

**行为**：
- 读取时：若 `generatedAt` 不匹配当前 report，视作无效，全部 task 视为未完成
- 写入时：勾选/取消勾选立即同步
- "重新生成"按钮触发时：清除该 key（与 `clearCachedReport` 同步）
- "重置会话"按钮触发时：清除该 key（与现有 7 个 key 一同清理）

**Task ID 规则**：mock 数据生成时分配 `focus-{i}-task-{j}` 形式的稳定 id（i = focusPicks 索引，j = tasks 索引）。LLM 模式回归时需要让 prompt 也产出 id，否则前端可在反序列化时按位置补 id（兜底）。

**新建模块 `lib/reportTaskState.ts`**，导出：
```ts
export function readTaskState(generatedAt: string): Record<string, true>
export function setTaskDone(generatedAt: string, taskId: string, done: boolean): void
export function clearTaskState(): void
```

`reportTaskState.ts` 同时被 `重置会话` 与 `重新生成` 调用以确保清理。

## 6. Mock 数据更新

`lib/mockReports.ts` 的 `buildMockWrongQuestionReport()` 需要重写以匹配新类型。要求：

**focusPicks 长度 = 2**，挑 2 个最高优先级、错题数最多的：
1. 二次函数图像与开口方向（数学，4 题，高）
2. 物理单位换算（物理，3 题，高）

每张焦点卡的字段从旧 mock 的对应记录中迁移内容（仅是写 mock 时的内容来源——`errorPatterns` / `actionPlan` 已从类型上删除，不在运行时存在）：
- `diagnosis` ← 旧 `errorPatterns[*].evidence` 中针对该知识点的那条
- `tasks[0]` ← 旧 `actionPlan` 中 `targetWeakPoint` 对应该知识点的那条 `action`
- `tasks[1]` ← 在原 `actionPlan` 基础上补一条更具体的子动作（例：看口诀 5 分钟 / 写换算式）
- `expectedOutcome` ← 把旧 `estimatedGain`（"+5 分"）改写为正确率口径（例："正确率 33% → 80%"）
- `fileRefs` ← 旧 `errorPatterns[*].fileRefs` 中对应该知识点的文件名

每张焦点卡 `tasks` 长度恒为 2（mock 模式约束；类型层允许 1-3，留余地）。

**weeklyTrend.series**：硬编码 4 周分布合计为 12（与 `overview.total` 一致）。设计为 `[w1=4, w2=5, w3=2, w4=1]`，呈现"先升后降"的好转曲线。

**weeklyTrend.summary**：固定文案 "本月在好转：从周 5 题降到周 1 题，继续保持。"

**weakPoints**：保留原 5 条不动（C 区块直接消费）。注意：focusPicks 中的 2 条与 weakPoints 中的对应条目重叠是允许的——C 区块在渲染时会过滤掉已经在 focusPicks 中出现过的知识点（按 `knowledgePoint` 去重）。

## 7. 视觉与交互细节

**焦点卡**：
- 容器 `rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/30 p-5 shadow-sm`
- 序号圆 `❶ ❷` 醒目，indigo-600
- 优先级标签：高 = red-50/red-600，中 = amber-50/amber-600
- task checkbox 已勾选：text-decoration: line-through，opacity-60
- "完成后预期"行：emerald 色文字 + 小图标

**错题节奏卡**：
- 用 recharts BarChart，单色（indigo-500）
- 下方趋势判断字号 text-sm，slate-600

**其他薄弱点**：
- 折叠头：`其他薄弱点 (3) ▾`，点击展开
- 展开后每条一行：`● 阅读题主旨判断    英语 · 错 2 次   建议：做 5 篇英语阅读…`

**错题分布**：
- 单行 chip 行，间距用 `gap-2`
- 圆点 + 学科名 + 数字

## 8. 文件清单

| 文件 | 操作 | 说明 |
|---|---|---|
| `lib/reportTypes.ts` | 修改 | 加 FocusPick / WeeklyTrend / WeeklyTrendPoint，改 WrongQuestionReport |
| `lib/mockReports.ts` | 修改 | 重写 buildMockWrongQuestionReport |
| `lib/reportPrompts.ts` | 修改 | 同步 JSON schema 字符串到新形状 |
| `lib/reportCache.ts` | 修改 | 更新 isWrongQuestionReportShape |
| `lib/reportTaskState.ts` | 新建 | task 勾选状态本地持久化 |
| `lib/reportTaskState.test.mts` | 新建 | 持久化逻辑单测 |
| `components/WrongQuestionReportView.tsx` | 重写 | 4 个新子组件 |
| `components/ReportCenterPanel.tsx` | 修改 | 更新 isValidReport（增加 focusPicks/weeklyTrend 判定） |
| `app/page.tsx` | 修改 | 重置会话时调用 clearTaskState |

## 9. 测试策略

- `reportTaskState.test.mts` — 覆盖：
  - generatedAt 匹配 → 读取已勾选 task
  - generatedAt 不匹配 → 返回空对象
  - setTaskDone 写入 / 取消勾选
  - clearTaskState 清空
- `mockReports` — 没有专门的测试文件，但 `WrongQuestionReportView` 渲染依赖 mock，确保 mock 输出能通过 `isValidReport` 校验。可以在 `reportCache.test.mts` 已有结构上加 1 条断言：`buildMockWrongQuestionReport()` 通过 shape 校验。
- `WrongQuestionReportView` 是视图组件，沿用项目惯例不写组件测试（参考 CLAUDE.md 提到的 "DatabaseHub.test.mts pattern" 但本改造无 source-regex 必要）。
- 手测：`npm run dev` 后人工点击两个 tab、勾选 task、刷新、重新生成、重置会话，逐项验证。

## 10. 范围之外（不在本次做）

- LLM 模式下 prompt 是否需要重写 example 输出（仅同步 schema 字段，不重写 example 段落）
- 焦点卡的"相关错题"chip 是否可点击跳到文件中心（保留为未来增强）
- 错题节奏卡是否按学科分色（保留单色，避免抢镜）
- task checkbox 完成后是否触发庆祝动画（YAGNI）
- 焦点卡内任务的"完成度进度环"（YAGNI）

## 11. 风险与权衡

**风险 1：FocusPick 与 weakPoints 信息重叠**
- 缓解：C 区块按 knowledgePoint 去重，不重复展示
- 副作用：weakPoints 数组中"被升级到焦点"的条目仍存在；这是必要的——保留它便于"下周不同的焦点选项"切换

**风险 2：tasks id 在 mock 模式是位置稳定，但同次会话内多次"重新生成"会复用同 id**
- 缓解：`writeCachedReport` 会更新 `generatedAt`，`reportTaskState` 用 generatedAt gating，旧勾选自动作废

**风险 3：删除 errorPatterns / actionPlan 字段会破坏 LLM 模式回归路径**
- 缓解：`reportPrompts.ts` 同步更新；plan 文档（`2026-05-07-report-center.md`）不再权威，本 spec 与新 prompt 共同构成 V2 形态的真源
- 接受：这是一次明确的契约升级，不做向后兼容
