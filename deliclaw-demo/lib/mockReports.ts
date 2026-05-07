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
    focusPicks: [
      {
        knowledgePoint: "二次函数图像与开口方向",
        subject: "数学",
        occurrences: 4,
        priority: "高",
        diagnosis: "a>0 时口朝上，你混淆了 4 次——不是不会，是符号反应慢。",
        tasks: [
          {
            id: "focus-0-task-0",
            text: "专项练 15 道，每题先圈出 a 的符号再画图",
          },
          {
            id: "focus-0-task-1",
            text: "看一遍开口方向口诀（5 分钟）",
          },
        ],
        expectedOutcome: "本知识点正确率 33% → 80%",
        fileRefs: ["数学-错题-2026-04-12.png", "数学-错题-2026-04-25.png"],
      },
      {
        knowledgePoint: "单位换算",
        subject: "物理",
        occurrences: 3,
        priority: "高",
        diagnosis: "cm→m / g→kg 转换漏除幂次，结果偏差一个数量级。",
        tasks: [
          {
            id: "focus-1-task-0",
            text: "cm→m 单位换算 30 题集中训练，每题写出换算式再运算",
          },
          {
            id: "focus-1-task-1",
            text: "做完后用红笔回看：哪一步没乘 100？",
          },
        ],
        expectedOutcome: "本知识点正确率 50% → 90%",
        fileRefs: ["物理-错题-2026-04-15.png", "物理-错题-2026-04-22.png"],
      },
    ],
    weeklyTrend: {
      series: [
        { week: 1, count: 4 },
        { week: 2, count: 5 },
        { week: 3, count: 2 },
        { week: 4, count: 1 },
      ],
      summary: "本月在好转：从周 5 题降到周 1 题，继续保持。",
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
