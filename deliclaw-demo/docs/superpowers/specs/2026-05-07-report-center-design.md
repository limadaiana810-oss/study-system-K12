# 报告中心设计文档

**日期**：2026-05-07
**目标版本**：DeliClaw Demo
**状态**：已确认设计，待写实现计划

## 背景与目标

当前 DeliClaw 主界面有两个视图：对话与文件中心。用户的两类需求未被满足：

1. **错题解析 + 提分方案**：学生上传了大量错题图片，需要跨题聚合分析薄弱点、错误模式，并给出具体提分行动。
2. **成长报告（家长向）**：家长群里每日作业分数与考试成绩散乱难管理，家长需要直观看到孩子近期表现的可视化总结、AI 分析与行动建议。

新增"报告中心"视图，承载这两份报告。

## 范围

### 在范围内
- 在 `ChatPanel` header 增加第三个视图按钮"报告中心"
- 新建 `ReportCenterPanel` 组件 + 子视图
- 新建 `/api/reports/[type]` 端点，调用 OpenRouter 生成结构化 JSON
- Mock 分数数据（30 天，5 学科）
- 引入 `recharts` 图表库
- 5 个新测试文件
- 更新 `CLAUDE.md` 增加"Report Center"一节

### 不在范围内
- 真实分数数据接入（vision OCR / 表单录入）
- 多时间窗口切换（仅"本月" 30 天）
- 报告分享 / 导出 PDF
- 服务端定时预生成
- 报告历史归档

## 架构总览

```
┌─ ChatPanel header: [对话] [文件中心] [报告中心] ────┐
│                                                     │
│  activeView === "reports" → ReportCenterPanel       │
│    └─ tabs: [错题报告] [成长报告]                   │
│                                                     │
│  右侧 DatabaseHub 在 reports 视图下隐藏（同 files） │
└─────────────────────────────────────────────────────┘
```

`activeView` 类型扩展为 `"chat" | "files" | "reports"`，在 `app/page.tsx` 中维护，传给 `ChatPanel`，`DatabaseHub` 仅在 `activeView === "chat"` 时渲染（沿用现有规则）。

## UI 与组件结构

### 组件树

```
components/ReportCenterPanel.tsx          # 容器，持有 reportType state
  ├─ ReportTypeTabs.tsx                   # [错题报告 | 成长报告]
  ├─ ReportEmptyState.tsx                 # 未生成时空态 + "生成报告"按钮
  ├─ ReportLoadingState.tsx               # 生成中骨架屏
  ├─ ReportError.tsx                      # 失败重试
  ├─ WrongQuestionReportView.tsx
  │    ├─ OverviewCard       (recharts PieChart 学科分布)
  │    ├─ WeakPointsCard     (recharts BarChart TOP N + 列表)
  │    ├─ ErrorPatternsCard  (纯文本卡片列表)
  │    └─ ActionPlanCard     (优先级标签 + 行动列表)
  └─ GrowthReportView.tsx
       ├─ TrajectoryCard     (KPI: 上传文件数 / 学科覆盖 / 活跃天数)
       ├─ ScoreTrendCard     (recharts LineChart 各学科月内趋势)
       ├─ EmotionTrendCard   (4 周文字摘要 + 简单情绪柱)
       ├─ HighlightsCard
       └─ ParentAdviceCard   (三栏: 加强 / 提醒 / 鼓励)
```

### 行为流

1. 进入"报告中心"视图：先读 `localStorage["deliclaw_report_<type>"]`
   - 命中 → 直接渲染缓存 JSON
   - 未命中 → 显示 `ReportEmptyState` + "生成报告"按钮
2. 点击"生成报告" → 切到 `ReportLoadingState` → POST `/api/reports/<type>` → 拿 JSON → 渲染 + 写缓存
3. 报告渲染时顶部右侧固定显示"重新生成"小按钮（仅缓存存在时可见），点击删缓存 → 重发请求

## 数据模型

### Mock 分数模块 `lib/mockScores.ts`

```ts
export type ScoreType = "homework" | "quiz" | "exam";
export type ScoreEntry = {
  id: string;               // "s_001"
  subject: "语文" | "数学" | "英语" | "物理" | "化学";
  type: ScoreType;
  value: number;            // 实得分
  max: number;              // 满分（作业常 100，考试可 120/150）
  date: string;             // ISO "2026-04-15"
  comment?: string;         // 教师/家长留言
};
export const MOCK_SCORES: ScoreEntry[];          // ~60 条
export function getScoresForWindow(days: number): ScoreEntry[];
```

数据真实感设计要点：
- 5 学科 × 4 周 × 约 3 项 = 约 60 条
- 数学第二周下滑、第四周回升（让 LLM 在 "encourage" 部分能抓到）
- 英语稳定（让 "鼓励"或"无需提醒"的素材自然存在）
- 物理偶发低分（让 "remind" 自然产生）
- `comment` 字段约 1/4 的记录有值

### Mock 4 周情绪历史

`memory.psychState` 只是"10 轮 rolling"短期窗口，不能直接切出 4 周历史。同模块导出：

```ts
export type WeeklyEmotion = { week: 1 | 2 | 3 | 4; dominant: string };
export const MOCK_EMOTION_HISTORY: WeeklyEmotion[];   // 长度 4，覆盖最近 4 周
```

服务端用这份 mock 拼装 `emotionTrend` 的 `week + dominant`，LLM 只补每周 `summary` 文字（一句话）。同样遵循"事实服务端给、定性 LLM 写"的原则。

### 报告 JSON 契约 `lib/reportTypes.ts`

```ts
export type WrongQuestionReport = {
  generatedAt: string;
  windowDays: 30;
  overview: {
    total: number;
    bySubject: { subject: string; count: number }[];
    byQuestionType: { type: string; count: number }[];
  };
  weakPoints: {
    knowledgePoint: string;
    subject: string;
    occurrences: number;
    diagnosis: string;        // LLM 生成的 1-2 句诊断
  }[];                          // ≤ 5 条
  errorPatterns: {
    pattern: string;            // 例 "单位换算遗漏"
    evidence: string;
    fileRefs: string[];         // canonicalName，前端可点回文件中心
  }[];                          // ≤ 4 条
  actionPlan: {
    priority: "高" | "中" | "低";
    action: string;
    estimatedGain: string;      // 例 "+5 分"
    targetWeakPoint?: string;
  }[];                          // ≤ 5 条
};

export type GrowthReport = {
  generatedAt: string;
  windowDays: 30;
  trajectory: {
    filesUploaded: number;
    subjectsCovered: string[];
    activeDays: number;
  };
  scores: {
    subject: string;
    homeworkAvg: number;        // 0-100 归一化百分制
    examLatest: { value: number; max: number; date: string } | null;
    weeklySeries: number[];     // 长度 4，归一化百分制
  }[];
  emotionTrend: {
    week: 1 | 2 | 3 | 4;
    dominant: string;
    summary: string;            // LLM 一句总结
  }[];
  highlights: string[];          // 2-3 条
  parentAdvice: {
    strengthen: string[];
    remind: string[];
    encourage: string[];
  };
};
```

## 服务端管线

### 端点

```
POST /api/reports/wrong-questions
POST /api/reports/growth
Body: { memorySnapshot: MemoryEntry }
Response: WrongQuestionReport | GrowthReport | { error: string }
```

### 核心原则

**LLM 只负责定性，确定性数字一律服务端算好。**

理由：
- 避免家长/学生看到错位数字（LLM 写"数学 87 分"实际是 78 分）
- 减少 token 消耗
- 服务端聚合可单测

### `wrong-questions` 流程

1. 服务端从 SQLite `files` 表读全部行
2. 服务端聚合 → `overview` 三块（总数 / 学科分布 / 题型分布）
3. 把所有错题的 `subject + knowledgePoints + description` 拼成清单丢给 LLM
4. LLM 用 `response_format: { type: "json_object" }` 输出 `{ weakPoints, errorPatterns, actionPlan }`
5. 服务端 `JSON.parse` + 字段存在性校验 → 与 `overview` 合并 → 返回完整 `WrongQuestionReport`

### `growth` 流程

1. SQLite 文件聚合 → `trajectory`
2. `getScoresForWindow(30)` → 服务端聚合 `scores` 数组（学科 / homeworkAvg / examLatest / 4 周归一化序列）
3. 服务端读 `MOCK_EMOTION_HISTORY` → 4 周 `{ week, dominant }` 骨架；LLM 只补 `summary` 文字
4. 把 `trajectory + scores + emotionTrend(无 summary) + memorySnapshot.factual + memorySnapshot.inferred` 喂给 LLM
5. LLM 输出 `{ emotionTrendSummaries: string[4], highlights, parentAdvice }`（注意：`emotionTrend` 的数字字段服务端给，LLM 只回填 `summary` 数组）
6. 服务端把 LLM 的 `emotionTrendSummaries` 按下标合并到 `emotionTrend` → 返回完整 `GrowthReport`

### Prompt 文件 `lib/reportPrompts.ts`

```ts
export const WRONG_QUESTION_REPORT_PROMPT: string;
export const GROWTH_REPORT_PROMPT: string;
```

每个 prompt 包含：
- 角色与任务说明
- 输出 JSON schema（与 TS 类型对齐）
- 1-2 个 few-shot 示例
- 强制 JSON only，无 markdown，无解释文字
- 中文输出，语气适配（错题报告→学生友好、成长报告→家长友好）

## 缓存策略

```
localStorage["deliclaw_report_wrong-questions"]   // JSON 字符串
localStorage["deliclaw_report_growth"]            // JSON 字符串
```

- **写入**：`/api/reports` 成功返回后，由 `ReportCenterPanel` 写入。失败不写。
- **清空**：
  - "重新生成"按钮：删对应键 → 重发请求
  - "重置会话"：现有的 5-key 清单扩到 7 个，追加这两个报告键
- **不主动失效**：mock 分数 / 文件聚合变化不会自动重算，由用户决定（与 demo 性质一致）。

## 错误处理

| 失败点 | 行为 |
|---|---|
| `/api/reports` HTTP 5xx / 超时 | `ReportError` 显示"生成失败"+"重试"按钮，**不写缓存** |
| LLM 返回非合法 JSON | 服务端 `try/catch JSON.parse` → 返回 `{ error: "model_output_invalid" }`，前端提示"模型输出格式异常，请重试" |
| SQLite 读失败 | 服务端降级为空 `overview`，错题报告仍能生成（LLM 在空数据下产出 actionPlan = `["暂无错题数据，先上传几张错题"]`） |
| Mock 分数为空（兜底） | 服务端返回 400 `{ error: "no_score_data" }` |
| `memorySnapshot` 缺失 | 服务端用空对象兜底；不阻塞报告生成 |

## 测试

新增 5 个测试文件，沿用 `node --experimental-strip-types --test`：

| 文件 | 覆盖 |
|---|---|
| `lib/mockScores.test.mts` | `getScoresForWindow(30)` 长度合理、覆盖全 5 学科、日期递增；`MOCK_EMOTION_HISTORY` 长度为 4 |
| `lib/reportAggregation.test.mts` | 错题 overview 聚合 / scores 周序列归一化 / emotionTrend 模板化（**核心逻辑测试**） |
| `lib/reportTypes.test.mts` | 运行时 JSON shape sanity check |
| `components/ReportCenterPanel.test.mts` | 缓存命中 / 空态 / 重新生成清缓存 |
| `components/WrongQuestionReportView.test.mts` | 接收 fixture JSON 渲染不崩溃；缺字段 fallback |

成长报告视图层测试合并进 `ReportCenterPanel.test.mts`。

**不测的部分**：
- recharts 内部渲染（信任三方）
- 真实 LLM 输出（非确定性，靠服务端 JSON parse + schema 校验防御）
- `/api/reports` 真实 HTTP（demo 无 e2e 框架）

## 依赖变更

新增 `recharts` 到 `deliclaw-demo/package.json`。约 +100KB gzipped；接受。

## CLAUDE.md 更新

实现完成后追加 "Report Center" 一节，包含：
- 三态视图入口与 `activeView` 转换
- 两份报告的 JSON 契约路径（`lib/reportTypes.ts`）
- Mock 分数模块入口（`lib/mockScores.ts`）以及替换为真实数据的扩展点
- **"LLM 只负责定性、确定性数字一律服务端算"** 这条原则要写进去
- localStorage 报告缓存 key 列表，加入"重置会话"清理范围

## 决策摘要

| 决策点 | 选择 |
|---|---|
| 入口形式 | 独立"报告中心"视图（第 3 个 tab） |
| 生成时机 | 点击"生成报告"才跑 LLM；缓存到 localStorage；提供"重新生成" |
| 错题报告内容 | 总览 + 薄弱知识点 TOP N + 错误模式 + 提分行动计划 |
| 成长报告内容 | 学习轨迹 + 分数图表 + 情绪轨迹 + 亮点 + 家长行动建议（强化/提醒/鼓励） |
| 受众 | 错题→学生；成长→家长 |
| 分数来源 | Mock 数据（demo 阶段）；预留替换为真实数据的扩展点 |
| 时间窗口 | 30 天（本月） |
| 图表库 | recharts |
| LLM 输出 | 严格 JSON（`response_format: json_object`） |
| 数字与定性分工 | 数字一律服务端算；LLM 只产出定性段落 |

## 未决项

无。所有关键决策已经在 brainstorming 阶段拍板。
