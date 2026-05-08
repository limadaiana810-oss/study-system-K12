import {
  aggregateScores,
  buildEmotionTrendSkeleton,
} from "./reportAggregation.ts"
import { getScoresForWindow, MOCK_EMOTION_HISTORY } from "./mockScores.ts"
import { MOCK_QUESTION_BANK } from "./mockQuestionBank.ts"
import { selectFocusPicks } from "./focusPickSelector.ts"
import type { GrowthReport, WrongQuestionReport } from "./reportTypes.ts"

// 学生侧周界（"今天" = 2026-05-08）：
//   W1: 04-13 — 04-19   W2: 04-20 — 04-26   W3: 04-27 — 05-03   W4: 05-04 — 05-08
const WEEK_RANGES: { week: 1 | 2 | 3 | 4; from: string; to: string }[] = [
  { week: 1, from: "2026-04-13", to: "2026-04-19" },
  { week: 2, from: "2026-04-20", to: "2026-04-26" },
  { week: 3, from: "2026-04-27", to: "2026-05-03" },
  { week: 4, from: "2026-05-04", to: "2026-05-08" },
]

function bucketByWeek(date: string): 1 | 2 | 3 | 4 | null {
  for (const r of WEEK_RANGES) {
    if (date >= r.from && date <= r.to) return r.week
  }
  return null
}

function todayIso(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function buildMockWrongQuestionReport(): WrongQuestionReport {
  // 1) 用 selector 从题库挑 3 道高密度错题
  const { picks: focusPicks } = selectFocusPicks(MOCK_QUESTION_BANK)

  // 2) 用题库的实际日期推趋势（按周分桶）
  const erroredQuestions = MOCK_QUESTION_BANK.filter((q) => q.errored)
  const series = WEEK_RANGES.map((r) => ({
    week: r.week,
    count: erroredQuestions.filter((q) => bucketByWeek(q.date) === r.week).length,
  }))

  return {
    generatedAt: new Date().toISOString(),
    windowDays: 30,
    progressSignal: "这周只错 1 道，月内最高 5 道。靠连续 7 天打卡 + 二次函数顶点式攻下来",
    gapSignal: "物理单位换算又冒头，第 3 次了",
    focusPicks,
    weeklyTrend: {
      series,
      summary: "从 W2 最高的 5 道，到这周只错 1 道。W2 那周数学连错三天，后面两周追回来了。",
    },
    weakPoints: [
      {
        knowledgePoint: "二次函数顶点式",
        subject: "数学",
        occurrences: 4,
        diagnosis: "顶点式的 h、k 符号常被写反，连带顶点坐标判断也会跟着错。",
      },
      {
        knowledgePoint: "串并联识别",
        subject: "物理",
        occurrences: 3,
        diagnosis: "串并联组合容易看错，电压表/电流表位置一忽略整张图就分析错了。",
      },
      {
        knowledgePoint: "单位换算",
        subject: "物理",
        occurrences: 3,
        diagnosis: "cm→m、g→kg 转换时漏除幂次，结果偏差一个数量级。",
      },
      {
        knowledgePoint: "阅读题主旨判断",
        subject: "英语",
        occurrences: 2,
        diagnosis: "总盯着细节句，忽略了段落首尾的总结句，主旨题选项常被细节带跑。",
      },
      {
        knowledgePoint: "化学方程式配平",
        subject: "化学",
        occurrences: 1,
        diagnosis: "原子守恒漏看，氧原子数最容易不平。",
      },
    ],
  }
}

const EMOTION_SUMMARIES: Record<1 | 2 | 3 | 4, string> = {
  1: "开学第一周，孩子主动上传了几张错题图，对新知识点比较起劲。",
  2: "W2 数学连着两次作业掉分，孩子私下跟家长说压力大。",
  3: "W3 数学开始往回追，孩子做了几次电路图和顶点式的专项题，情绪比上周好。",
  4: "W4 数学回到 90 分以上，孩子自己跟家长说开心。",
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
      "数学从月中的 70 分追回到 90+。中间那次低分后，孩子自己把二次函数错题整理了一遍。",
      "英语全月在 88—94 分之间。波动不大，作业和小测的差距也不大。",
      "语文从 87 分涨到 94 分，阅读理解和作文都比上个月写得好。",
    ],
    parentAdvice: {
      strengthen: [
        "物理电路图错过 3 次。可以周末挑两道串并联的题，让孩子专门做一遍。",
        "数学解答题的最后一道大题，孩子常常做到一半就停了。下次能不能写到底，家长可以留意。",
      ],
      remind: [
        "W2 那周孩子明显焦虑过，主动跟家长讲了。家长可以多问一句，但不必反复追问。",
        "物理低分都在电路图上。这块不及时补，后面学电磁感应会更难。",
      ],
      encourage: [
        "数学从 70 分追回到 90+，速度很快。这一段努力可以当面跟孩子说一声。",
        "英语这个月没掉过 88，作业和小测都跟得上。可以告诉孩子家长看到了。",
        "语文作文这个月写得比上个月好。饭桌上可以挑一篇，具体说说哪里好。",
      ],
    },
  }
}
