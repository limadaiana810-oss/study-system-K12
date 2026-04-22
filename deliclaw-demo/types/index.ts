export interface FactualMemory {
  name?: string        // 姓名
  age?: string         // 年龄
  grade?: string       // 年级
  school?: string      // 学校
  position?: string    // 职位
  [key: string]: string | undefined  // 可扩展
}

export interface InferredMemory {
  sleepPattern?: string    // 作息习惯
  mood?: string            // 情绪状态
  preferences?: string[]   // 偏好
  [key: string]: string | string[] | undefined  // 可扩展
}

export type InferredOp = "set" | "add"

export interface InferredCandidate {
  id: string
  field: string
  op: InferredOp
  value: string | string[]
  evidence: string
  confidence?: number
  createdAt: string
  source?: "llm"
  status?: "pending" | "accepted" | "edited_then_accepted" | "ignored"
  editedValue?: string | string[]
  autoConfirmAt?: number
}

export interface EmotionSnapshot {
  emotion: string      // 平静|好奇|愉悦|满足|焦虑|疲惫|沮丧
  weight: number       // 0-1 intensity
  evidence?: string    // brief user quote
  timestamp: string    // ISO string
}

export interface PsychologicalState {
  snapshots: EmotionSnapshot[]  // rolling last 10 turns
  dominant: string              // most weighted recent emotion
  compositeScore: number        // 0-1 (0=very negative, 1=very positive)
}

export interface MemoryEntry {
  factual?: FactualMemory      // 事实记忆
  inferred?: InferredMemory    // 推测记忆
  fileTags?: string[]          // 文件标签（保留）
  actions?: string[]           // 操作记录（保留）
  fileDescription?: string     // 文件描述（保留）
  fileIndex?: FileIndexEntry[] // 文件索引：用于”找文件”时稳定召回
  psychState?: PsychologicalState  // 情绪心理状态（滚动10轮）
}

export interface MemoryExtractionResult {
  delta: MemoryEntry
  inferredCandidates: InferredCandidate[]
  emotionSnapshot?: EmotionSnapshot
}

export interface FileIndexEntry {
  fileName: string
  tags: string[]
  uploadedAt?: string
  description?: string
}

export interface FileResultTag {
  fileName?: string
  canonicalName?: string
  tags?: string[]
  uploadedAt?: string
}

export type MessageRole = "user" | "assistant"

export interface FileCard {
  name: string
  base64: string
  url?: string
  mimeType: string
  tags: string[]
  uploadedAt: Date
}

export interface Message {
  id: string
  role: MessageRole
  content: string
  /** 原始内容（包含 <memory> / <file-result> 等隐藏标签），用于回传给模型保持“可检索记忆” */
  rawContent?: string
  imageBase64?: string
  imageMime?: string
  /** 仅供模型使用的附件元信息（UI 不展示） */
  attachmentName?: string
  attachmentUploadedAt?: string
  fileCards?: FileCard[]  // 改为数组，支持多个文件
  timestamp: Date
  isStreaming?: boolean
}

export interface UploadedFile {
  id: string
  name: string
  base64: string
  mimeType: string
  uploadedAt: Date
}

export type TurnInsightFileStatus = "indexing" | "ready" | "partial" | "failed"

export interface TurnInsight {
  turnId: string
  userText: string
  /** 客户端基于用户输入实时解析的捕捉信息 */
  capturedItems?: Array<{
    type: "task_progress" | "emotion" | "fact" | "file_intent"
    label: string
    value: string
    evidence: string
  }>
  factualAdded: Array<{ label: string; value: string }>
  inferredPending: Array<{
    id: string
    field: string
    label: string
    value: string
    evidence: string
    status?: "pending" | "accepted" | "edited_then_accepted" | "ignored"
    editedValue?: string
    autoConfirmAt?: number
  }>
  emotion?: { emotion: string; evidence?: string; weight?: number }
  fileUnderstanding?: {
    originalName: string
    description: string
    tags: string[]
    canonicalName?: string
    status?: TurnInsightFileStatus
  }
  updatedAt: string
}

export type DemoStage = "intro" | "uploaded" | "done"

export interface ManagedFile {
  id: string
  fileName: string
  title: string | null
  mimeType: string
  url: string
  uploadedAt: string
  description: string
  subject: string
  questionType: string
  knowledgePoints: string[]
}
