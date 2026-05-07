# 错题报告 V4 · 首屏行动突出 · 设计

> V4 在 V3 基础上把"现在做这一件"做成首屏 hero。学生打开报告第一眼看到三件事：进步、不足、现在该做什么。
>
> 决策原则：写给 14 岁的人看。他周三晚上 9 点 47 分打开这份报告，他想知道**今晚要不要做点什么、做哪个、做多久**。多一个字都嫌烦。

---

## 1. 数据契约变更（`lib/reportTypes.ts`）

`WrongQuestionReport` 新增两个字段：

```ts
type TodayPick = {
  taskId: string         // 关联到 focusPicks[i].tasks[j].id（按钮跳转用）
  taskText: string       // "重做 4/12 那道二次函数"
  durationMinutes: number // 5
  whyLine: string        // "上次你把 h = -2 写成了 2"
  fileRef: string        // 老错题文件名（可选预览）
}

type WrongQuestionReport = {
  // ...existing V3 fields
  progressSignal: string   // ✓ 行（已存在，文案更新）
  gapSignal: string        // ⚠ 行（NEW）
  todayPick: TodayPick     // 现在做这一件（NEW）
  // ...
}
```

`gapSignal` 和 `todayPick` 都是 required（mock 永远会给）。空状态在视图层处理（progressSignal/gapSignal 为空字符串时跳过该行；todayPick.taskId 为空时显示空状态文案）。

---

## 2. 页面布局（从上到下）

### 2.1 Header

```
错题报告
4 月 8 日 — 5 月 7 日                          [ 重新生成 ]
```

标题就两个字。日期写月日，不写"近 30 天"。

### 2.2 HeroSignalsBar（替换 V3 的 ProgressSignalBar）

```
┌──────────────────────────────────────────┐
│ ✓ 这周错题从 5 道降到 1 道               │
│ ⚠ 物理单位换算又冒头，第 3 次了          │
└──────────────────────────────────────────┘
```

**✓ 行（progressSignal）**：一句话，**必须带具体数字**。用对比：这周 vs 上周、连着 N 天、第 N 次。

**⚠ 行（gapSignal）**：一句话，**点名具体知识点 + 出现次数**。用"又冒头"/"还没断根"/"连错 N 道"。

**空状态**：
- 没进步：跳过 ✓ 这行
- 没不足：写「✓ 这周没新错点，老错题也都翻过了」，⚠ 跳过
- 都空：整个 bar 不显示

### 2.3 TodayPickCard（NEW）

```
┌──────────────────────────────────────────┐
│  ▶  现在做这一件                         │
│                                          │
│  5 分钟，重做 4/12 那道二次函数          │
│  上次你把 h = -2 写成了 2                │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │             开  始               │    │
│  └──────────────────────────────────┘    │
└──────────────────────────────────────────┘
```

**Header**：「现在做这一件」。不是「今日任务」「立即行动」「本日推荐」。

**第一行（taskText）**：句式 `N 分钟，[动词] [具体老错题]`。时间永远在最前面。动词用「重做」「翻一遍」「圈出」「代回去」。

**第二行（whyLine）**：一句话写"上次卡在哪"，让学生马上想起当时。

**按钮「开始」**：点击行为——平滑滚到匹配 FocusCard 的第一个任务（沿用 `#task-${taskId}` 跳转模式 + 高亮动画）。

**做完之后**：

```
┌──────────────────────────────────────────┐
│  ✓  今天这件做完了                       │
│                                          │
│  4/12 二次函数 · 6 分 28 秒              │
│  下面还有计划，想继续就往下翻            │
└──────────────────────────────────────────┘
```

「做完」状态的判断：复用 `reportTaskState`，当 `todayPick.taskId` 在 `done[taskId]` 中时显示完成态。

> V4 第一版：暂不做"6 分 28 秒"计时（数据没采），只显示「✓ 今天这件做完了 / 下面还有计划，想继续就往下翻」。计时留待后续。

**空状态**：
- 还没上传过错题：「还没有老错题可重做。先去聊天里上传一张试试。」
- 全做完：「这周计划全做完了。等下一道错题来。」

### 2.4 分隔提示

```
              ↓ 想看完整本周计划，往下翻
```

居中、灰、小字。不写「了解更多」「展开查看」。

### 2.5 FocusCards 区（保留 V3，文案 polish）

Section header：「这周先把这两道拿下」  
副标题（小字）：「做完这两道，这周就算过去了。」

每张 FocusCard 结构不变（V3 的 Hattie 三问保留），只把文案按新 banned-words 过一遍：
- "稳"、"节奏"、"提升"、"持续" 全删
- 关闭句不写「整道题就稳了」，写「后面就不会跑偏」

### 2.6 WeeklyTrendCard（保留 V3，文案 polish）

```
本月错题，一周一根

      ▮▮
  ▮▮  ▮▮
  ▮▮  ▮▮  ▮▮
  ▮▮  ▮▮  ▮▮  ▮
  W1  W2  W3  W4
   4   5   2   1

从 W2 最高的 5 道，到这周只错 1 道。
W2 那周数学连错三天，后面两周缓过来了。
```

Title 改：「本月错题，一周一根」（不写「错题趋势」「周度统计」）。

Summary 重写规则：必须说出**哪一周发生了什么**，落到学科或天数上。

### 2.7 MoreToPracticeCard（保留 V3，文案 polish）

Title：「其他还在冒头的（N）」（不写「薄弱知识点」「待提升项」）。默认折叠。

每行：学科 + 知识点 / 错过 N 次 / 一句诊断。诊断写「什么地方没做对」。

### 2.8 页面底部

```
        本月一共 12 道错题，覆盖 5 个学科
        下次错题进来，会自动加进这份报告
```

居中小字。不写「持续优化」「敬请期待」。

---

## 3. 文案口吻 · banned-words 增补

V3 既有的 banned-words 全部保留（症结 / 正确率% / 优先级 / 孩子需要 等）。本次新增：

| 禁 | 用 |
|---|---|
| 稳稳的 / 稳住 / 节奏稳了 / 稳了 | 写出具体数字（"这周错 1 道"） |
| 拆开 / 拆解 | 写动作（"先看 h、k 的符号"） |
| 整体良好 / 表现稳定 / 整体呈... | 写出具体周/天/学科 |
| 立即 / 马上 / 即刻 | 「现在」或省掉 |
| 提升 / 优化 / 精进 | 写动作（"重做"/"翻一遍"） |
| 持续 / 不断 / 始终 | 删掉或换具体频次 |

测试守护：在 mock JSON.stringify check + view chrome `.tsx` source check 两层都加这些词。

---

## 4. Mock 数据更新

`lib/mockReports.ts` 改 4 处字段以对齐新口吻：

| 字段 | V3 现状 | V4 改为 |
|---|---|---|
| progressSignal | "这周错题少了一半，节奏稳住了——继续。" | "这周错题从 5 道降到 1 道" |
| focusPicks[0].stepDiagnosis | "...符号翻转是这道题最常卡的地方——不是你不会，是这个陷阱挺隐蔽的。" | "4/12 那道，你顶点写对了，但 h = -2 写成了 2。这一翻，整道题就走偏了。" |
| focusPicks[0].closingLine | "...这一步过了，整道题就稳了。" | "...这一步对了，后面就不会跑偏。" |
| weeklyTrend.summary | "本月错题在好转——从最高一周 5 道降到这周 1 道。" | "从 W2 最高的 5 道，到这周只错 1 道。W2 那周数学连错三天，后面两周缓过来了。" |

新增字段 mock：
- `gapSignal`: "物理单位换算又冒头，第 3 次了"
- `todayPick`: 指向 focusPicks[0].tasks[0]，5 分钟，"重做 4/12 那道二次函数"，"上次你把 h = -2 写成了 2"，fileRef 指向 4/12 那张图

---

## 5. 校验层（`lib/reportCache.ts`）

`isWrongQuestionReportShape` 加两个字段检查：
- `gapSignal: string`
- `todayPick: { taskId: string, taskText: string, durationMinutes: number, whyLine: string, fileRef: string }`

V3 旧缓存（无这两字段）自动废弃 → 重新生成。

---

## 6. 测试要求

- `lib/mockReports.test.mts`：覆盖 V4 新字段；新 banned-words 全过；progressSignal/gapSignal/closingLine/summary 文案断言对齐表 4。
- `lib/reportCache.test.mts`：V3-shape 自动废弃；V4-shape 通过；缺字段拒绝。
- `components/WrongQuestionReportView.test.mts`：HeroSignalsBar 渲染 ✓ + ⚠；TodayPickCard 渲染（含「开始」按钮、taskText、whyLine）；新 banned-words 不出现在 chrome；OverviewStripCard 仍然不存在；保留 V3 既有断言。
- `lib/reportTaskState.test.mts`：todayPick 完成态读取（复用现有 done[taskId] 机制，无新行为）。

---

## 7. 实现顺序（subagent 串行）

1. **V4-1**：数据契约 + mock + cache 校验 + 测试
2. **V4-2**：HeroSignalsBar + TodayPickCard 视图组件 + 测试
3. **V4-3**：FocusCards / WeeklyTrend / MoreToPractice section header & copy polish + 测试

每个任务完成后：spec 评审 → 质量评审 → commit → 下一个。

---

## 8. 不在本次范围

- 「开始」按钮的 lightbox 预览模式（V4 用滚动跳转 + 高亮即可）
- TodayPick 的实际计时（"6 分 28 秒"）
- LLM pipeline 重启（仍然走 mock 模式）
- 父母端「成长报告」的对应改造
