# DeliClaw Demo — 开发规格文档

> 驱动 Claude Code 生成完整可运行 Demo 的技术规格。

---

## 一、项目概览

**产品定位**：文件管理 Agent + AI Database Hub 的落地演示。
**核心主张**：用户只做三件事——说话、上传、得到反馈。Agent 会记住你。
**演示目标**：让观众在 3 分钟内亲身体验"AI 自动分类文件 + 秒级检索"的完整闭环。

---

## 二、技术栈

| 层级 | 选型 | 说明 |
|------|------|------|
| 框架 | Next.js 14 (App Router) | `npx create-next-app` 生成，`npm run dev` 启动 |
| 样式 | TailwindCSS | 含 `backdrop-blur`、柔和阴影、毛玻璃效果 |
| AI 接口 | OpenRouter → Qwen | 文本用 `qwen/qwen2.5-72b-instruct`，视觉用 `qwen/qwen2.5-vl-72b-instruct` |
| 文件处理 | 浏览器 FileReader API | 读取为 Base64，存入 React 全局状态，不上传云端 |
| 状态管理 | React `useState` / `useRef` | 轻量，无需 Redux |
| 环境变量 | `.env.local` | 存放 `OPENROUTER_API_KEY` |

---

## 三、目录结构

```
deliclaw-demo/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts          # 服务端路由，代理 OpenRouter 请求
│   ├── page.tsx                  # 主页面（左右分栏布局）
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ChatPanel.tsx             # 左侧 70% 聊天区
│   ├── MessageBubble.tsx         # 单条消息气泡
│   ├── FileThumbnailCard.tsx     # 文件缩略图卡片（内嵌于气泡）
│   ├── QuickReplyBar.tsx         # 快捷回复按钮组
│   ├── DatabaseHub.tsx           # 右侧 30% 记忆面板
│   └── MemoryCard.tsx            # 记忆条目卡片（带入场动画）
├── lib/
│   ├── prompts.ts                # 所有系统提示词
│   ├── memoryParser.ts           # 从 AI 响应中提取记忆字段
│   └── demoScript.ts             # 快捷回复按钮的预设台词
├── types/
│   └── index.ts                  # Message、MemoryEntry 等类型定义
├── .env.local                    # OPENROUTER_API_KEY=sk-or-...
└── .env.example
```

---

## 四、页面布局

```
┌─────────────────────────────────────────────────────────┐
│  顶部导航：DeliClaw  [Logo]                    [极简导航] │
├─────────────────────────────────┬───────────────────────┤
│                                 │                       │
│        Chat Panel (70%)         │   Database Hub (30%)  │
│                                 │                       │
│  ┌─────────────────────────┐    │  ┌─────────────────┐  │
│  │ AI 头像 + 消息气泡       │    │  │ Entity          │  │
│  └─────────────────────────┘    │  │ ████████████    │  │
│                                 │  ├─────────────────┤  │
│  ┌─────────────────────────┐    │  │ Identity        │  │
│  │ 用户消息 + 文件缩略图    │    │  │ ████████████    │  │
│  └─────────────────────────┘    │  ├─────────────────┤  │
│                                 │  │ File Tags       │  │
│  [快捷回复按钮组]                │  │ ████████████    │  │
│  [文字输入框] [上传] [发送]      │  ├─────────────────┤  │
│                                 │  │ Actions         │  │
│                                 │  │ ████████████    │  │
└─────────────────────────────────┴───────────────────────┘
```

**颜色方案**：
- 背景：`#FAFAFA`（浅灰白）
- AI 气泡：白色 + `shadow-sm` + `rounded-2xl`
- 用户气泡：`#1A1A1A`（深黑）+ 白字
- Database Hub：白色面板 + `backdrop-blur-sm` + 左边框 `border-l border-gray-100`
- 记忆卡片入场：`animate-slide-in-right` + `opacity-0 → opacity-100`

---

## 五、Demo 演示流程（脚本化）

### 阶段 0：页面加载
- AI 自动发送自我介绍消息（无需用户操作）
- Database Hub 显示空状态："等待建立记忆..."

**AI 自我介绍台词（流式输出）**：
> 你好！我是 DeliClaw，你的专属文件管理助手。我会记住你的习惯，自动整理和分类你上传的每一个文件，让你随时用一句话就能找到它。
> 请先告诉我你是谁，然后上传你想整理的文件吧 🗂️

---

### 阶段 1：用户自我介绍 + 上传文件

**快捷回复按钮**（底部显示，点击即发送）：
```
[ 我来自我介绍 + 上传错题 ]
```

点击后：
1. 自动填充消息文本："我叫[姓名]，是一名大学生，我想整理我的数学错题。"（姓名可在 `demoScript.ts` 中配置）
2. 弹出文件选择器（真实的 `<input type="file" accept="image/*">`）
3. 用户选择图片后，聊天框显示消息 + 图片缩略图预览

**发送内容（多模态）**：
- 文字部分：用户台词
- 图片部分：Base64 编码，发送给 `qwen/qwen2.5-vl-72b-instruct`

---

### 阶段 2：AI 实时记忆反馈

**系统提示词（`prompts.ts`）**：
```
你是 DeliClaw，一个有记忆能力的文件管理 Agent。

当用户发送消息时，你需要：
1. 自然地回复用户
2. 在回复末尾，用以下 JSON 格式输出你提取到的记忆（用 <memory> 标签包裹，用户不可见）：

<memory>
{
  "entity": "用户姓名",
  "identity": ["大学生", "理科"],
  "fileTags": ["数学", "错题", "高数"],
  "actions": ["上传"],
  "fileDescription": "一张数学错题照片，内容涉及..."
}
</memory>

如果没有新记忆，输出 <memory>{}</memory>。
```

**前端处理**：
- `memoryParser.ts` 从流式响应中实时检测 `<memory>` 标签
- 检测到后，解析 JSON，触发 Database Hub 更新
- 每个新字段以卡片形式滑入（带 200ms 延迟错落动画）

**AI 回复示例**：
> 你好！很高兴认识你。我已经记住你了——你是一名大学生，正在整理数学错题。
>
> 我看了你上传的这张图片，这是一道关于**极限运算**的题目，我已经将它标记为：数学 / 高数 / 错题。
>
> 下次你只需要说「找我的高数错题」，我就能立刻把它调出来给你。

**Database Hub 同步显示**：
```
Entity      田凯能           ← 滑入动画
Identity    大学生            ← 滑入动画（+200ms）
File Tags   数学  高数  错题  ← 滑入动画（+400ms）
Actions     上传              ← 滑入动画（+600ms）
```

---

### 阶段 3：用户发出检索指令

**快捷回复按钮**：
```
[ 帮我整理错题 ]
```

发送文字："帮我整理我的数学错题"

---

### 阶段 4：AI 返回文件结果

**系统行为**：
- AI 回复含文字 + 内嵌文件卡片
- 前端检测到响应中含 `<file-result>` 标签，渲染 `FileThumbnailCard` 组件

**AI 回复示例**：
> 好的！根据你之前上传的内容，这是你的数学错题整理结果：

`[FileThumbnailCard 组件渲染：显示图片缩略图 + 文件名 + 标签]`

> 共找到 **1 个文件**，已归类到「数学 / 高数 / 错题」目录下。
>
> 以后你可以直接说：「找高数错题」或「给我看数学题」，我会立刻定位到它。

**FileThumbnailCard 展示内容**：
```
┌──────────────────────────────┐
│  [图片缩略图，可点击放大]      │
│  错题_001.jpg                │
│  📁 数学 / 高数 / 错题        │
│  🕐 2026-04-20 上传          │
└──────────────────────────────┘
```

---

## 六、API 路由设计

### `POST /api/chat`

**请求体**：
```ts
{
  messages: Array<{
    role: "user" | "assistant" | "system",
    content: string | Array<{ type: "text" | "image_url", ... }>
  }>,
  hasImage: boolean  // true 时切换为 qwen-vl 模型
}
```

**服务端逻辑**：
```ts
// app/api/chat/route.ts
const model = hasImage
  ? "qwen/qwen2.5-vl-72b-instruct"
  : "qwen/qwen2.5-72b-instruct"

const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ model, messages, stream: true })
})

// 流式转发给前端
return new Response(response.body, {
  headers: { "Content-Type": "text/event-stream" }
})
```

---

## 七、记忆解析器

```ts
// lib/memoryParser.ts
export function extractMemory(text: string): MemoryEntry | null {
  const match = text.match(/<memory>([\s\S]*?)<\/memory>/)
  if (!match) return null
  try {
    return JSON.parse(match[1])
  } catch {
    return null
  }
}
```

**类型定义**：
```ts
// types/index.ts
export interface MemoryEntry {
  entity?: string
  identity?: string[]
  fileTags?: string[]
  actions?: string[]
  fileDescription?: string
}

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  imageBase64?: string
  fileCard?: FileCard
  timestamp: Date
}

export interface FileCard {
  name: string
  base64: string
  tags: string[]
  uploadedAt: Date
}
```

---

## 八、快捷回复配置

```ts
// lib/demoScript.ts
export const USER_NAME = "田凯能"  // ← 演示时修改此处

export const QUICK_REPLIES = [
  {
    id: "intro",
    label: "我来自我介绍 + 上传错题",
    message: `我叫${USER_NAME}，是一名大学生，我想整理我的数学错题。`,
    triggerUpload: true,  // 点击后弹出文件选择器
  },
  {
    id: "retrieve",
    label: "帮我整理错题",
    message: "帮我整理我的数学错题",
    triggerUpload: false,
  }
]
```

---

## 九、Database Hub 动画规格

- 容器：`overflow-hidden`，右侧面板固定宽度 `w-[30%]`
- 卡片入场：`transform translate-x-4 opacity-0` → `translate-x-0 opacity-100`，`transition duration-300 ease-out`
- 新卡片追加时，已有卡片轻微上移（`transition-all duration-200`）
- 标签（Tag）样式：`bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full`
- Entity 字段：`text-lg font-semibold`，金色左边框 `border-l-4 border-amber-400`

---

## 十、环境配置

**`.env.local`**（不提交 git）：
```
OPENROUTER_API_KEY=sk-or-替换为你的真实Key
```

**`.env.example`**（提交 git）：
```
OPENROUTER_API_KEY=sk-or-your-key-here
```

**`.gitignore` 确认包含**：
```
.env.local
```

---

## 十一、启动方式

```bash
cd deliclaw-demo
npm install
cp .env.example .env.local
# 编辑 .env.local 填入 OpenRouter API Key
npm run dev
# 浏览器打开 http://localhost:3000
```

---

## 十二、开发优先级

| 优先级 | 任务 |
|--------|------|
| P0 | 项目脚手架 + 基础布局（左右分栏） |
| P0 | `/api/chat` 服务端路由（代理 OpenRouter，流式） |
| P0 | ChatPanel：消息发送、流式渲染、AI 气泡 |
| P1 | 文件上传（FileReader → Base64 → 多模态请求） |
| P1 | `memoryParser` + Database Hub 动态更新 |
| P1 | 快捷回复按钮组 |
| P2 | FileThumbnailCard（内嵌于 AI 气泡，支持点击放大） |
| P2 | 入场动画、毛玻璃效果、整体视觉打磨 |
| P3 | 加载态（AI 思考中 typing 动画） |

---

*文档版本：v1.1 | 2026-04-20*

---

## 十三、Demo 阶段状态机

Demo 分 3 个阶段，由 React `useState<DemoStage>` 管理，控制快捷回复按钮的显示与隐藏。

```ts
type DemoStage = "intro" | "uploaded" | "done"
```

| 阶段值 | 触发时机 | 显示的快捷回复按钮 |
|--------|----------|--------------------|
| `"intro"` | 页面加载，AI 自我介绍后 | `[ 我来自我介绍 + 上传错题 ]` |
| `"uploaded"` | 用户上传图片且 AI 记忆卡片渲染完毕后 | `[ 帮我整理错题 ]` |
| `"done"` | AI 返回 `<file-result>` 并渲染缩略图后 | 无按钮（演示结束） |

**状态转移逻辑**（在 `ChatPanel.tsx` 中）：

```ts
// 收到 AI 首条回复 → 仍在 intro，等用户上传
// 用户发送含图片的消息，且 AI 响应解析到非空 memory → 切换到 uploaded
if (memory && memory.fileTags?.length > 0) setStage("uploaded")

// AI 响应含 <file-result> 标签 → 切换到 done
if (fileResult) setStage("done")
```

---

## 十四、`<file-result>` 标签格式

AI 在最后阶段返回文件时，在回复末尾嵌入此标签（前端隐藏标签本身，只渲染卡片）。

**格式定义**：
```
<file-result>
{
  "fileName": "错题_001.jpg",
  "tags": ["数学", "高数", "错题"],
  "uploadedAt": "2026-04-20",
  "base64Ref": "__LAST_UPLOAD__"
}
</file-result>
```

- `base64Ref` 固定值为 `"__LAST_UPLOAD__"`，前端收到后从全局状态取最近一次上传的 Base64 数据渲染缩略图。
- 系统提示词需明确指示 AI 在"整理文件"意图时必须输出此标签（见第五节系统提示词，需追加对应指令）。

**`fileResultParser.ts` 解析器**（与 `memoryParser` 同构）：
```ts
export function extractFileResult(text: string): FileResultTag | null {
  const match = text.match(/<file-result>([\s\S]*?)<\/file-result>/)
  if (!match) return null
  try { return JSON.parse(match[1]) } catch { return null }
}
```

**系统提示词补充指令**（追加到第五节 prompt 末尾）：
```
当用户表达"整理"、"找"、"返回文件"等检索意图时，在回复末尾追加：
<file-result>
{ "fileName": "错题_001.jpg", "tags": ["数学","高数","错题"], "uploadedAt": "今日日期", "base64Ref": "__LAST_UPLOAD__" }
</file-result>
```

---

## 十五、OpenRouter API 接口规范

### 基础信息

| 项目 | 值 |
|------|----|
| Endpoint | `https://openrouter.ai/api/v1/chat/completions` |
| 文本模型 | `qwen/qwen3-30b-a3b`（$0.08/$0.28 per M tokens） |
| 视觉模型 | `qwen/qwen2.5-vl-72b-instruct`（$0.25/$0.75 per M tokens，32K context） |

### 服务端请求（`/api/chat/route.ts`）

```ts
const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "http://localhost:3000",
    "X-Title": "DeliClaw Demo"
  },
  body: JSON.stringify({
    model: hasImage ? "qwen/qwen2.5-vl-72b-instruct" : "qwen/qwen3-30b-a3b",
    messages,
    stream: true
  })
})
return new Response(res.body, {
  headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" }
})
```

### 多模态消息格式（含图片时）

```ts
// messages 中用户消息的 content 字段
content: [
  { type: "text", text: "我叫田凯能，这是我的数学错题" },
  {
    type: "image_url",
    image_url: {
      url: `data:image/jpeg;base64,${base64String}`
      // OpenRouter/Qwen-VL 支持 data URI 格式的 base64 图片
    }
  }
]
```

### 客户端 SSE 流式消费（`ChatPanel.tsx`）

**必须用 `fetch` + `ReadableStream`，不能用 `EventSource`（不支持 POST）。**

```ts
const response = await fetch("/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ messages, hasImage })
})

const reader = response.body!.getReader()
const decoder = new TextDecoder()
let buffer = ""

while (true) {
  const { done, value } = await reader.read()
  if (done) break
  buffer += decoder.decode(value, { stream: true })

  // 按行解析 SSE
  const lines = buffer.split("\n")
  buffer = lines.pop() ?? ""  // 保留未结束的行

  for (const line of lines) {
    if (!line.startsWith("data: ")) continue
    const data = line.slice(6).trim()
    if (data === "[DONE]") return
    try {
      const json = JSON.parse(data)
      const chunk = json.choices?.[0]?.delta?.content ?? ""
      if (chunk) {
        setStreamingText(prev => prev + chunk)
        // 同时喂给 memoryParser 和 fileResultParser 检测标签
      }
    } catch { /* 跳过非 JSON 行 */ }
  }
}
```
