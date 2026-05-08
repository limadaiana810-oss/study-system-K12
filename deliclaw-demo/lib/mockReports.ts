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
  const focusPicks: WrongQuestionReport["focusPicks"] = [
    {
      knowledgePoint: "二次函数顶点式",
      subject: "数学",
      goal: "你知道 y = a(x-h)² + k 这个式子里，h 和 k 各管什么吗？",
      stepDiagnosis: "4/12 那道，你顶点写对了，但 h = -2 写成了 2。这一翻，整道题就走偏了。",
      tasks: [
        {
          id: "focus-0-task-0",
          text: "重新做 4/12 那道二次函数题：把顶点 (-2, 3) 代进去重推一遍，看符号在哪里变。",
          durationMinutes: 8,
          isReDo: true,
        },
        {
          id: "focus-0-task-1",
          text: "翻 4/25 那道老错题，先圈出 h、k 的符号再开始解。",
          durationMinutes: 6,
          isReDo: true,
        },
      ],
      closingLine: "下次再遇到顶点式——第一步先把 h、k 的符号锁死。",
      fileRefs: ["数学-错题-2026-04-12.png", "数学-错题-2026-04-25.png"],
      errorCount: 4,
      examWeightLabel: "期中压轴 18 分",
    },
    {
      knowledgePoint: "物理单位换算",
      subject: "物理",
      goal: "cm 换 m、g 换 kg 的时候，幂次怎么处理你心里有数吗？",
      stepDiagnosis: "上次那道浮力题，你把密度从 g/cm³ 换到 kg/m³ 时漏乘了 1000，最后算出来的结果差了一个数量级。",
      tasks: [
        {
          id: "focus-1-task-0",
          text: "重做 4/15 和 4/22 那两道老错题，每一步把单位写在数字旁边。",
          durationMinutes: 10,
          isReDo: true,
        },
        {
          id: "focus-1-task-1",
          text: "记一遍单位换算口诀（cm³→m³ 是除以 10⁶，不是 10²）。",
          durationMinutes: 5,
          isReDo: false,
        },
      ],
      closingLine: "下次遇到带单位的物理题——先把所有量统一换到 SI 制再列方程。",
      fileRefs: ["物理-错题-2026-04-15.png", "物理-错题-2026-04-22.png"],
      errorCount: 3,
      examWeightLabel: "选填常考 6 分",
    },
    {
      knowledgePoint: "电路图分析（串并联识别）",
      subject: "物理",
      goal: "电路图先看什么？是先找电源，还是先看电压表/电流表的位置？",
      stepDiagnosis: "4/19 那道，你把并联看成了串联——少看了电压表跨在哪两个点上。整张图一开局就读错了。",
      tasks: [
        {
          id: "focus-2-task-0",
          text: "重做 4/19 那道电路图题：第一步把电压表/电流表所在位置标出来再判断串并联。",
          durationMinutes: 10,
          isReDo: true,
        },
        {
          id: "focus-2-task-1",
          text: "翻 4/28 那道实验题，画一遍等效电路图再算阻值。",
          durationMinutes: 8,
          isReDo: true,
        },
      ],
      closingLine: "下次遇到电路图——第一步先把表跨在哪标出来，再判串并联。",
      fileRefs: ["物理-错题-2026-04-19.png", "物理-错题-2026-04-28.png"],
      errorCount: 3,
      examWeightLabel: "实验题 12 分",
    },
  ]

  return {
    generatedAt: new Date().toISOString(),
    windowDays: 30,
    progressSignal: "这周只错 1 道，月内最高 5 道。靠连续 7 天打卡 + 二次函数顶点式攻下来",
    gapSignal: "物理单位换算又冒头，第 3 次了",
    focusPicks,
    weeklyTrend: {
      series: [
        { week: 1, count: 4 },
        { week: 2, count: 5 },
        { week: 3, count: 3 },
        { week: 4, count: 1 },
      ],
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
        knowledgePoint: "电路图分析（串并联识别）",
        subject: "物理",
        occurrences: 3,
        diagnosis: "串并联组合容易看错，电压表/电流表位置一忽略整张图就分析错了。",
      },
      {
        knowledgePoint: "物理单位换算",
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
