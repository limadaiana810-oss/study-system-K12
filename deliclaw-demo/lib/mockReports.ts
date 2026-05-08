import {
  aggregateScores,
  aggregateWeeklyErrorsBySubject,
  buildEmotionTrendSkeleton,
  pickFocusSubject,
  type WeekRange,
} from "./reportAggregation.ts"
import { getScoresForWindow, MOCK_EMOTION_HISTORY } from "./mockScores.ts"
import { MOCK_QUESTION_BANK } from "./mockQuestionBank.ts"
import { selectFocusPicks } from "./focusPickSelector.ts"
import type { GrowthReport, WrongQuestionReport } from "./reportTypes.ts"

// 学生侧周界（"今天" = 2026-05-08）：
//   W1: 04-13 — 04-19   W2: 04-20 — 04-26   W3: 04-27 — 05-03   W4: 05-04 — 05-08
export const MOCK_WEEK_RANGES: WeekRange[] = [
  { week: 1, from: "2026-04-13", to: "2026-04-19" },
  { week: 2, from: "2026-04-20", to: "2026-04-26" },
  { week: 3, from: "2026-04-27", to: "2026-05-03" },
  { week: 4, from: "2026-05-04", to: "2026-05-08" },
]

function todayIso(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function buildMockWrongQuestionReport(): WrongQuestionReport {
  // 1) selector 直接吐分层结构，hero / backups 在数据上区分
  const { hero, backups } = selectFocusPicks(MOCK_QUESTION_BANK)
  if (!hero) throw new Error("Mock 题库必须至少有一道错题作 hero")

  // 2) 用题库的实际日期推趋势（共享 aggregateWeeklyErrorsBySubject — 与成长报告同源）
  const { perWeek, perSubject } = aggregateWeeklyErrorsBySubject(MOCK_QUESTION_BANK, MOCK_WEEK_RANGES)
  const series = MOCK_WEEK_RANGES.map((r, i) => ({ week: r.week, count: perWeek[i] }))
  const seriesBySubject = Object.entries(perSubject)
    .map(([subject, counts]) => ({ subject, counts }))
    .sort((a, b) => {
      const totalA = a.counts.reduce((s, n) => s + n, 0)
      const totalB = b.counts.reduce((s, n) => s + n, 0)
      return totalB - totalA
    })

  return {
    generatedAt: new Date().toISOString(),
    windowDays: 30,
    topPattern: "嗨，我是小迪。你这周只错 1 道，整月最低。物理单位换算又翻车了——第 3 次。我替你数着。",
    hero,
    backups,
    weeklyTrend: {
      series,
      seriesBySubject,
      summary: "你 W2 最多 5 道，这周只剩 1 道。W2 那周数学连错三天，后两周你追回来了。",
    },
    weakPoints: [
      {
        knowledgePoint: "二次函数顶点式",
        subject: "数学",
        occurrences: 4,
        diagnosis: "你顶点式的 h、k 符号容易写反，连带顶点坐标也跟着错。这一点我替你盯着。",
      },
      {
        knowledgePoint: "串并联识别",
        subject: "物理",
        occurrences: 3,
        diagnosis: "你串并联组合容易看错——电压表/电流表位置一忽略，整张图就读偏。",
      },
      {
        knowledgePoint: "单位换算",
        subject: "物理",
        occurrences: 3,
        diagnosis: "cm→m、g→kg 你常漏除幂次，结果偏差一个数量级。下次先把单位写两遍——换前一遍，换后一遍。",
      },
      {
        knowledgePoint: "阅读题主旨判断",
        subject: "英语",
        occurrences: 2,
        diagnosis: "你总盯细节句，忽略段落首尾的总结句，主旨题选项常被细节带跑。",
      },
      {
        knowledgePoint: "化学方程式配平",
        subject: "化学",
        occurrences: 1,
        diagnosis: "你原子守恒容易漏看，氧原子数最容易不平。",
      },
    ],
  }
}

// 情绪 → 原因 一一对应：每一周的小结都说清楚「为什么是这种情绪」。
// 家长侧口径：用「小凯」指代凯伦；不出现「孩子」「他」；指家长时省略主语。
//   好奇：小凯主动上传错题、跟着学下去
//   沮丧：考试或作业成绩往下走
//   平静：聊天里没什么起伏，按部就班
//   开心：聊天情绪高 + 成绩/排名往上
const EMOTION_SUMMARIES: Record<1 | 2 | 3 | 4, string> = {
  1: "好奇：小凯连着上传了几张错题图，自己挑题做，对新知识点愿意花时间。",
  2: "沮丧：W2 数学作业、小测都掉分，小凯私下讲过丢了名次，情绪低。",
  3: "平静：小凯聊天里没什么起伏，按部就班把电路图和顶点式刷过去。",
  4: "开心：数学回 90+，月考也排上来了，小凯主动讲过。",
}

export function buildMockGrowthReport(): GrowthReport {
  const today = todayIso()
  const scoresWindow = getScoresForWindow(30)
  const baseScores = aggregateScores(scoresWindow, today)
  const { perSubject } = aggregateWeeklyErrorsBySubject(MOCK_QUESTION_BANK, MOCK_WEEK_RANGES)
  const scores = baseScores.map((s) => ({
    ...s,
    weeklyErrorCount: perSubject[s.subject] ?? [0, 0, 0, 0],
  }))
  const focusSubject = pickFocusSubject(scores)
  const skeleton = buildEmotionTrendSkeleton(MOCK_EMOTION_HISTORY)
  const emotionTrend = skeleton.map((e) => ({
    ...e,
    summary: EMOTION_SUMMARIES[e.week],
  }))

  return {
    generatedAt: new Date().toISOString(),
    windowDays: 30,
    // V11: hero 两字段
    topInsight: "小凯这个月数学回到 90+ 了。",
    thisWeekAction: "这周陪小凯把数学最后一题写完，到一半会停。",
    focusSubject,
    trajectory: {
      filesUploaded: 12,
      subjectsCovered: ["数学", "英语", "物理", "化学", "语文"],
      activeDays: 22,
    },
    scores,
    emotionTrend,
    highlights: [
      "数学从月中的 70 分追回到 90+。中间那次低分后，小凯自己把二次函数错题整理了一遍。",
      "英语全月在 88—94 分之间。波动不大，作业和小测的差距也不大。",
      "语文从 87 分涨到 94 分，阅读理解和作文都比上个月写得好。",
    ],
    parentAdvice: {
      // V11 dedup：「数学最后一题」那条已经抽到 thisWeekAction，这里去掉避免重复
      strengthen: [
        "物理电路图错过 3 次。可以周末挑两道串并联的题，让小凯专门做一遍。",
      ],
      remind: [
        "W2 那周小凯明显焦虑过，主动讲过一句。可以多问一句，不必反复追问。",
        "物理低分都在电路图上。这块不及时补，后面学电磁感应会更难。",
      ],
      encourage: [
        "数学从 70 分追回到 90+，速度很快。这一段努力可以当面跟小凯说一声。",
        "英语这个月没掉过 88，作业和小测都跟得上。这点可以让小凯知道。",
        "语文作文这个月写得比上个月好。饭桌上可以挑一篇，具体说说哪里好。",
      ],
    },
  }
}
