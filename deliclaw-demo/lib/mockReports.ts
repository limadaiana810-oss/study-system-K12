import {
  aggregateScores,
  buildEmotionTrendSkeleton,
} from "./reportAggregation.ts"
import { getScoresForWindow, MOCK_EMOTION_HISTORY } from "./mockScores.ts"
import type { GrowthReport, WrongQuestionReport } from "./reportTypes.ts"

function todayIso(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function buildMockWrongQuestionReport(): WrongQuestionReport {
  return {
    generatedAt: new Date().toISOString(),
    windowDays: 30,
    overview: {
      total: 12,
      bySubject: [
        { subject: "数学", count: 5 },
        { subject: "物理", count: 3 },
        { subject: "英语", count: 2 },
        { subject: "化学", count: 1 },
        { subject: "语文", count: 1 },
      ],
      byQuestionType: [
        { type: "选择题", count: 5 },
        { type: "解答题", count: 4 },
        { type: "填空题", count: 2 },
        { type: "阅读", count: 1 },
      ],
    },
    weakPoints: [
      {
        knowledgePoint: "二次函数图像与开口方向",
        subject: "数学",
        occurrences: 4,
        diagnosis: "对 a 系数符号与开口方向的关系不熟，常错在判断顶点位置和单调区间。",
      },
      {
        knowledgePoint: "电路图分析（串并联识别）",
        subject: "物理",
        occurrences: 3,
        diagnosis: "串并联组合识别不准，常忽略电压表与电流表位置导致整图分析错误。",
      },
      {
        knowledgePoint: "单位换算",
        subject: "物理",
        occurrences: 3,
        diagnosis: "cm→m / g→kg 转换时漏除幂次，导致计算结果偏差一个数量级。",
      },
      {
        knowledgePoint: "阅读题主旨判断",
        subject: "英语",
        occurrences: 2,
        diagnosis: "过度关注细节句而忽略段落首尾的总结句，主旨题选项常与细节混淆。",
      },
      {
        knowledgePoint: "化学方程式配平",
        subject: "化学",
        occurrences: 1,
        diagnosis: "忽略原子守恒，常出现氧原子数不平的错误。",
      },
    ],
    errorPatterns: [
      {
        pattern: "单位换算遗漏",
        evidence: "多道物理题忽略 cm→m 与 g→kg，结果偏差一到两个数量级。",
        fileRefs: ["物理-错题-2026-04-15.png", "物理-错题-2026-04-22.png"],
      },
      {
        pattern: "二次函数符号判断错位",
        evidence: "a>0 时口朝上，多次混淆开口方向，连带影响顶点坐标判断。",
        fileRefs: ["数学-错题-2026-04-12.png", "数学-错题-2026-04-25.png"],
      },
      {
        pattern: "主旨题被细节句干扰",
        evidence: "英语阅读连续 2 题都选了细节对应项，未提取段落主旨。",
        fileRefs: ["英语-阅读-2026-04-18.png"],
      },
      {
        pattern: "代数化简跳步漏负号",
        evidence: "解答题中间步骤合并过快，多次出现负号丢失。",
        fileRefs: ["数学-错题-2026-04-20.png"],
      },
    ],
    actionPlan: [
      {
        priority: "高",
        action: "本周完成二次函数专项练习 15 道，重点对照 a 系数与开口方向的对应关系",
        estimatedGain: "+5 分",
        targetWeakPoint: "二次函数图像与开口方向",
      },
      {
        priority: "高",
        action: "物理 cm→m 单位换算 30 题集中训练，每题写出换算式再运算",
        estimatedGain: "+4 分",
        targetWeakPoint: "单位换算",
      },
      {
        priority: "中",
        action: "做 5 篇英语阅读，先看首尾段总结句再做主旨题",
        estimatedGain: "+3 分",
        targetWeakPoint: "阅读题主旨判断",
      },
      {
        priority: "中",
        action: "画 5 道电路图，先标出电压表/电流表位置再做串并联分析",
        estimatedGain: "+2 分",
        targetWeakPoint: "电路图分析（串并联识别）",
      },
      {
        priority: "低",
        action: "复习化学方程式配平的奇偶法、最小公倍数法各 5 题",
        estimatedGain: "+1 分",
        targetWeakPoint: "化学方程式配平",
      },
    ],
  }
}

const EMOTION_SUMMARIES: Record<1 | 2 | 3 | 4, string> = {
  1: "开学初状态积极，主动探索新知识，多次主动上传错题分析。",
  2: "数学连续两次作业出现下滑，孩子情绪有波动，私下表示压力较大。",
  3: "通过专项练习与陪伴交流，孩子情绪逐渐稳定，开始按计划推进复习。",
  4: "数学回升至 90 分以上，孩子自我反馈开心，状态明显回升。",
}

export function buildMockGrowthReport(): GrowthReport {
  const today = todayIso()
  const scoresWindow = getScoresForWindow(30)
  const scores = aggregateScores(scoresWindow, today)
  const skeleton = buildEmotionTrendSkeleton(MOCK_EMOTION_HISTORY)
  const emotionTrend = skeleton.map((e) => ({
    ...e,
    summary: EMOTION_SUMMARIES[e.week],
  }))

  return {
    generatedAt: new Date().toISOString(),
    windowDays: 30,
    trajectory: {
      filesUploaded: 12,
      subjectsCovered: ["数学", "英语", "物理", "化学", "语文"],
      activeDays: 22,
    },
    scores,
    emotionTrend,
    highlights: [
      "数学从月中 70 分回升到 90+，孩子主动总结二次函数错题，体现出较强的自我调节能力。",
      "英语全月稳定在 88-94 分区间，体现扎实基本功。",
      "语文呈持续上升趋势（87→94），阅读理解和作文都在进步。",
    ],
    parentAdvice: {
      strengthen: [
        "物理电路图分析需要专项突破，可以安排周末专题课。",
        "数学解答题最后一道大题完成度可以再提一档。",
      ],
      remind: [
        "第二周孩子情绪有过明显焦虑，建议持续关注心理状态。",
        "物理几次低分集中在电路图上，错过及时辅导可能影响后续电学整体。",
      ],
      encourage: [
        "数学从下滑到回升，恢复速度很快，多肯定孩子的努力过程。",
        "英语稳定优秀，可以继续给予正向反馈。",
        "语文写作持续进步，是值得家长在饭桌上具体表扬的细节。",
      ],
    },
  }
}
