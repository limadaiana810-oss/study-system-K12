// ─────────────────────────────────────────────────────────
// Shared sub-types
// ─────────────────────────────────────────────────────────

export type FocusTask = {
  id: string
  text: string
  durationMinutes: number
  isReDo: boolean
}

export type FocusPick = {
  subject: string
  goal: string
  stepDiagnosis: string
  tasks: FocusTask[]
  closingLine: string
  fileRefs: string[]
  knowledgePoints: string[]
  whyPicked: string
  errorCount: number
  examWeightLabel: string
  excerpt: string
  questionDate: string
}

// ─────────────────────────────────────────────────────────
// Wrong Question Report (学生侧)
//
// V19：重体验/学习，1 页 A4。
// 结构 = 错题翻一遍 → 下一阶段目标 → 我的观察
// ─────────────────────────────────────────────────────────

export type ErrorAnalysisBlock = {
  todayWins: string[]
  keyError: FocusPick
}

export type StudyMethod = {
  name: string         // 例：「主动回忆」
  researcher: string   // 例：「Roediger & Karpicke 2006」
  finding: string      // 一句话研究结论（带数据/年份）
  action: string       // 5 分钟内可执行的具体动作
}

export type LearningGuidanceBlock = {
  unawareGap: string
  studyMethods: StudyMethod[]
}

export type ObservationMoment = {
  timestamp: string
  observation: string
}

export type StudentObservationBlock = {
  moments: ObservationMoment[]
  closingLine: string
}

export type WrongQuestionReport = {
  generatedAt: string
  windowDays: 30
  errorAnalysis: ErrorAnalysisBlock
  learningGuidance: LearningGuidanceBlock
  studentObservation: StudentObservationBlock
}

// ─────────────────────────────────────────────────────────
// Growth Report (家长侧)
//
// V19：重效率/成果，数据驱动，1 页 A4。
// 结构 = 小迪这周做了什么 → 小凯的进步 → 我的建议
// ─────────────────────────────────────────────────────────

export type KnowledgePointResolution = {
  subject: string
  knowledgePoint: string
  resolvedHow: string
  errorCountBefore: number
  errorCountAfter: number
}

export type WeekWorkBlock = {
  filesIngested: number
  knowledgePointsResolved: KnowledgePointResolution[]
}

export type SubjectTrend = "improving" | "regressing" | "insufficient-data"

export type SubjectProgress = {
  subject: string
  trend: SubjectTrend
  // 数据驱动四件（trend 不是 insufficient-data 时填）
  dataObservation?: string
  errorPattern?: string
  rootCause?: string
  scoreContext?: string
  // 数据不足时填
  insufficientNote?: string
}

export type ProgressAssessmentBlock = {
  bySubject: SubjectProgress[]
}

export type StudyAdvice = {
  action: string
  whyThisAction: string
  whyNotBroader: string
}

// ─────── V21 沟通方式 = 3 sub-blocks ───────

export type ChildEmotion = {
  summary: string         // 一句话：小凯当下的情绪
  evidence: string[]      // 数据证据（采样次数、行为时刻、群消息）
}

export type AlphaGenContext = {
  bornRange: string       // "2010 年后出生 · Alpha 世代"
  traits: string[]        // 3-4 条 Alpha 世代关键特征
  whyDifferent: string    // 一段：为什么对这一代要用不同沟通方式
}

export type AgeBracket = {
  range: string           // "12-14 岁"
  stageName: string       // "青春期早期 · 同一性萌芽"
  theorist: string        // "Carol Dweck (Stanford 2006) · Erikson 第 5 阶段"
  strategy: string        // 这个年龄段的沟通策略
  isCurrent: boolean      // 小凯当前所处年龄段
}

export type DevelopmentalStrategy = {
  ageBrackets: AgeBracket[]
  tonightLines: string[]  // 应用 isCurrent bracket 的具体台词
  keyword: string         // "对事不对人——精确到一个动作"
}

export type CommunicationApproach = {
  childEmotion: ChildEmotion
  alphaGenContext: AlphaGenContext
  developmentalStrategy: DevelopmentalStrategy
}

export type RecommendationBlock = {
  studyAdvice: StudyAdvice
  communicationApproach: CommunicationApproach
}

export type GrowthReport = {
  generatedAt: string
  windowDays: 30
  weekWork: WeekWorkBlock
  progressAssessment: ProgressAssessmentBlock
  recommendation: RecommendationBlock
}

// ─────────────────────────────────────────────────────────
// Report envelope
// ─────────────────────────────────────────────────────────

export type ReportType = "wrong-questions" | "growth"

export type ReportEnvelope =
  | { ok: true; report: WrongQuestionReport }
  | { ok: true; report: GrowthReport }
  | { ok: false; error: string }
