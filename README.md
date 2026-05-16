# DeliClaw Demo

本地优先（local-first）的 AI 文件管理助手 Web Demo。基于 Next.js 构建，演示一个能够实时"理解"用户意图、管理学习文件、并生成错题/成长报告的 AI 智能体。

> 面向开发者的完整工程说明见仓库根目录 [`CLAUDE.md`](./CLAUDE.md)（部分细节以代码为准）。

## 核心特性

- **实时记忆可视化** — 事实 / 推测候选 / 文件索引三层结构，右侧面板实时呈现
- **实时理解面板** — 用户发送即刻完成客户端意图解析（任务 / 情绪 / 事实 / 文件意图），无需等待 AI 往返
- **服务端上传入库** — 原文件落盘 + 本地 JSON 索引 + SQLite 行，独立于聊天链路
- **情绪追踪** — 跨轮次滚动 10 条快照，推导心理状态
- **流式对话** — 通过 OpenRouter（Qwen 文本 / 视觉模型）SSE 流式输出
- **文件管理中心** — 按 题型 → 学科 浏览、预览、删除、清空、重复检测
- **报告中心** — 错题报告（学生向）与成长报告（家长向），含分数折线图与情绪趋势

## 技术栈

- **Next.js 16 App Router** + TypeScript（Next 16.2.4 / React 19.2.4）
- 开发服务器使用 **webpack**（非 Turbopack，详见 `CLAUDE.md` 的 gotcha 说明）
- **TailwindCSS v4**（`@tailwindcss/postcss`）
- **OpenRouter API** → Qwen 模型（文本 + 视觉）
- **SQLite** 文件检索元数据（优先系统 `sqlite3` CLI，可选 `better-sqlite3` 兜底）
- 本地文件存储于 `deliclaw-demo/data/uploads/`，`data/file-index.json` 提供结构化快查
- 浏览器侧仅用 localStorage 存元数据（不存 base64，规避配额问题）

## 快速开始

### 方式一：一键启动（macOS）

双击仓库根目录的 **`开始演示.command`** — 自动启动开发服务器、拉起 Cloudflare Tunnel 并打开公网访问地址。关闭该终端窗口即停止开发服务器与隧道。

### 方式二：手动启动

所有命令在 `deliclaw-demo/` 目录下执行：

```bash
npm install
npm run dev      # 开发服务器 http://localhost:3000（webpack 模式）
npm run build    # 生产构建
npm start        # 启动生产构建
```

### 环境变量

在 `deliclaw-demo/.env.local` 中配置：

```
OPENROUTER_API_KEY=sk-or-...        # 必填
DEMO_ACCESS_TOKEN=wuyanzu           # 公网分享访问 token

# 可选模型覆盖（建议保持默认）
OPENROUTER_CHAT_MODEL_TEXT=qwen/qwen3.6-plus
OPENROUTER_CHAT_MODEL_VISION=qwen/qwen3-vl-8b-instruct
OPENROUTER_TAGGER_MODEL=qwen/qwen3.6-plus
OPENROUTER_EMBED_MODEL=qwen/qwen3-embedding-0.6b
```

## 测试

仓库未配置 lint/test 脚本，按需直接运行目标测试（在 `deliclaw-demo/` 下）：

```bash
node --experimental-strip-types --test \
  lib/userInputParser.test.mts \
  lib/prompts.test.mts \
  lib/fileUploadFeedback.test.mts \
  lib/server/sqliteOptional.test.mts \
  lib/nextConfig.test.mts \
  lib/launcherScript.test.mts \
  lib/mockReports.test.mts \
  lib/reportCache.test.mts \
  lib/reportTaskState.test.mts \
  components/WrongQuestionReportView.test.mts
```

## 架构概览

- **顶层状态** 位于 `app/page.tsx`：结构化记忆、demo 阶段机、上传文件元数据、推测候选队列、当轮理解
- **上传入库流** 由 `/api/files/upload` 独占文件持久化，与聊天补全链路解耦
- **隐藏标签协议** — AI 在每次回复中嵌入对用户不可见的 `<memory>` 与 `<file-result>` 标签，分别由 `lib/memoryParser.ts` 与 `lib/fileResultParser.ts` 解析
- **三条确定性检索路径** — SQLite 语义检索 / 本地模糊匹配 / LLM `<file-result>` 标签
- **报告中心** — `ReportCenterPanel` 承载错题报告与成长报告；数值在服务端聚合，LLM 仅负责定性文本

更详细的工程说明、关键文件清单与各处 gotcha，参见 [`CLAUDE.md`](./CLAUDE.md)。

## 目录结构

```
.
├── CLAUDE.md            # 工程说明（开发者必读）
├── 开始演示.command       # macOS 一键启动器
├── 测试用图/              # 测试用图片
└── deliclaw-demo/        # Next.js 应用
    ├── app/              # App Router 页面与 API 路由
    ├── components/       # 聊天 / 数据库面板 / 报告视图
    ├── lib/              # 解析器、报告逻辑、服务端存储/SQLite
    ├── data/             # 上传文件、JSON 索引、SQLite（运行时生成）
    └── docs/             # 计划与规格文档
```
