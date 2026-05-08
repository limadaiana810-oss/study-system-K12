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
      closingLine: "下次再遇到顶点式——第一步先把 h、k 的符号锁死。这一步对了，后面 18 分跑不掉。",
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
      closingLine: "下次遇到带单位的物理题——先把所有量统一换到 SI 制再列方程。这一步省下来，整张卷子的物理选填都不丢分。",
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
      closingLine: "下次遇到电路图——第一步先把表跨在哪标出来，再判串并联。这一步对了，实验题 12 分整块就拿下。",
      fileRefs: ["物理-错题-2026-04-19.png", "物理-错题-2026-04-28.png"],
      errorCount: 3,
      examWeightLabel: "实验题 12 分",
    },
  ]

  return {
    generatedAt: new Date().toISOString(),
    windowDays: 30,
    progressSignal: "这周只错 1 道，月内最高一周 5 道——连续 7 天打卡，二次函数顶点式啃下来，3 道老错题一起翻过去",
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
