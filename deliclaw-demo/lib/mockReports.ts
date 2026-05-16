import { MOCK_QUESTION_BANK } from "./mockQuestionBank.ts"
import { selectFocusPicks } from "./focusPickSelector.ts"
import type { GrowthReport, WrongQuestionReport } from "./reportTypes.ts"

// ─────────────────────────────────────────────────────────
// 学生侧（V19 · 1 页 A4 · 重体验/学习）
// 结构 = 错题翻一遍 → 下一阶段目标 → 我的观察
// ─────────────────────────────────────────────────────────

export function buildMockWrongQuestionReport(): WrongQuestionReport {
  const { hero } = selectFocusPicks(MOCK_QUESTION_BANK)
  if (!hero) throw new Error("Mock 题库必须至少有一道错题作 keyError")

  return {
    generatedAt: new Date().toISOString(),
    windowDays: 30,

    errorAnalysis: {
      todayWins: [
        "数学顶点公式那一类整张卷你全对，5 道一个没错",
        "英语 affect / effect 这次终于不混了",
        "物理那道电路题，前两步思路是对的",
      ],
      keyError: hero,
    },

    learningGuidance: {
      unawareGap:
        "考完你可能在想「我是不是真的不懂顶点公式了」。我看了你最近 4 次的步骤——你不是不懂，是带回原式时常漏一个负号。这次月考扣的 14 分也是同一个负号。",
      studyMethods: [
        {
          name: "主动回忆",
          researcher: "Roediger & Karpicke 2006 · 华盛顿大学",
          finding: "合上书自己写一遍，2 周后能记住的内容比单纯重读多 50%。",
          action:
            "现在合上这页，自己写出顶点公式 h = -b/2a。写错的那部分，单独再写一遍。3 分钟够了。",
        },
        {
          name: "自我解释",
          researcher: "Chi 1989 · 卡内基梅隆",
          finding: "解题时每一步在旁边写一句「为什么这样做」，理解深度比单纯刷题高 1 倍。",
          action:
            "做这一道：y = (x+3)² - 5 求顶点。每写一步，旁边写一句「因为…」。会发现卡点不在公式，在替换。",
        },
        {
          name: "间隔练习",
          researcher: "Cepeda et al. 2006 · 加州大学",
          finding: "今天 1 题、明天 1 题、后天 2 题，长期记得比一次做 4 题久 2 倍。",
          action:
            "今天就这 1 道。明天小迪推一道变式给你；后天再推 2 道。你不用规划，跟我推就行。",
        },
      ],
    },

    studentObservation: {
      moments: [
        {
          timestamp: "周二晚 23:47",
          observation:
            "你把数学练习册合上时，最后一道圆心题写到一半。不是放弃，是已经困了——所以我没在那时打扰你。",
        },
        {
          timestamp: "周四上午 08:23",
          observation:
            "你拍上来那张物理电路题，是月考前一天。你写了「电压表？电流表？」两个问号——你是知道自己卡在哪的。",
        },
      ],
      closingLine:
        "你今晚不用解释这次的分数。我已经在家长那边说清楚了——他们不会先问数学，会先聊物理你做对的那一步。",
    },
  }
}

// ─────────────────────────────────────────────────────────
// 家长侧（V19 · 1 页 A4 · 重效率/成果，数据驱动）
// 结构 = 小迪这周做了什么 → 小凯的进步 → 我的建议
// 原则：结论必须有数据支撑，数据不足就不写
// ─────────────────────────────────────────────────────────

export function buildMockGrowthReport(): GrowthReport {
  return {
    generatedAt: new Date().toISOString(),
    windowDays: 30,

    weekWork: {
      filesIngested: 13,
      knowledgePointsResolved: [
        {
          subject: "英语",
          knowledgePoint: "affect / effect 词汇辨析",
          resolvedHow:
            "4/14 上传后整理了 3 道对照练习，小凯做完主动测了 1 次。这次月考英语 91，词汇辨析没扣分。",
          errorCountBefore: 3,
          errorCountAfter: 0,
        },
        {
          subject: "物理",
          knowledgePoint: "单位换算 km/h ↔ m/s",
          resolvedHow:
            "4/20 错题后让小凯口算「÷3.6」练 5 次，5/2 起再没错过同类题。",
          errorCountBefore: 2,
          errorCountAfter: 0,
        },
        {
          subject: "数学",
          knowledgePoint: "二次函数顶点公式",
          resolvedHow:
            "进展中：你 4/22 陪重做 3 道后近 14 天没再错同类题。这次月考扣的 14 分都在「带回原式漏负号」最后一步。",
          errorCountBefore: 4,
          errorCountAfter: 0,
        },
      ],
    },

    progressAssessment: {
      bySubject: [
        {
          subject: "数学",
          trend: "regressing",
          dataObservation: "本周作业错题集中在「二次函数顶点公式」，4 道里错 3 道",
          errorPattern: "3 次错的都是 h = -b/2a 的负号——把 -2 写成 2",
          rootCause: "公式记忆缺位，不是理解问题",
          scoreContext: "这次月考 92 → 78，扣的 14 分都集中在带回原式漏负号那一步",
        },
        {
          subject: "物理",
          trend: "improving",
          dataObservation: "本月「电压表/电流表混用」错误次数 4 → 1",
          errorPattern: "4/20 之后没再错过同类题",
          rootCause: "",
          scoreContext: "这一项是真在涨。",
        },
        {
          subject: "英语",
          trend: "insufficient-data",
          insufficientNote: "本月只 2 次取样，数据不足以判断走向，跳过。",
        },
      ],
    },

    recommendation: {
      studyAdvice: {
        action: "这周让小凯把数学顶点公式写 5 题，限时 8 分钟",
        whyThisAction:
          "Block 2 数学 4 次错 3 次都是 h = -b/2a 的负号——根因是公式记忆缺位，不是理解问题。补这一关比补全科更准。",
        whyNotBroader:
          "物理在涨，英语数据不足。这次月考的退步集中在 1 个 KP，不是全面退步——现在开始全科补习是过度反应。",
      },

      communicationApproach: {
        // ① 小孩的情绪
        childEmotion: {
          summary:
            "考完那晚小凯自评焦虑 4/5，比月初的 2/5 翻倍。他知道自己卡在哪——不是分数本身，是怕「我其实没真懂」。",
          evidence: [
            "本月 emotion 采样 7 次，4 次焦虑+疲惫，集中在月考前两天",
            "周二晚 23:47 数学练习册被翻开 12 分钟，没动笔——是困了，不是放弃",
            "物理电路题第三步反复擦掉 3 次后才继续往下写",
            "他没主动跟你提分数——这是在自己消化，不是在回避",
          ],
        },

        // ② Alpha 世代沟通方式 / 原因
        alphaGenContext: {
          bornRange: "2010 年后出生 · Alpha 世代",
          traits: [
            "屏幕原住民：习惯用搜索/AI 验证一切，不接受「因为我说了算」",
            "情绪议题前置：自我觉察比上一代早，敏感词被识别得更快",
            "真诚雷达极敏：表演性夸奖、空洞鼓励一秒识破",
            "层级扁平：更接受合作者关系，对压制式权威反弹强",
          ],
          whyDifferent:
            "对 80/90 后那套「我是为你好」「再不努力就晚了」式权威+督促，Alpha 一代会直接关上门——不是不听，是判断你没看证据。他们要的是被当成合作者：你看到了什么、为什么这么说、可以由我决定。",
        },

        // ③ 不同年龄段心理学沟通策略
        developmentalStrategy: {
          ageBrackets: [
            {
              range: "6-8 岁",
              stageName: "学龄初期 · 勤奋 vs 自卑",
              theorist: "Erikson 心理社会发展 (1959)",
              strategy:
                "夸具体动作（「你今天主动收书包」），别评价天赋（「真聪明」）。用看得见的成果——贴纸、记录本——让「勤奋感」被看见。",
              isCurrent: false,
            },
            {
              range: "9-11 岁",
              stageName: "规则期 · 具体运算",
              theorist: "Piaget 认知发展 (1952)",
              strategy:
                "讲清规则和为什么。他们能接受「先做完作业再玩」，前提是规则一致、不随你情绪变。说一句「今天我累了」会失效。",
              isCurrent: false,
            },
            {
              range: "12-14 岁",
              stageName: "青春期早期 · 同一性萌芽",
              theorist: "Carol Dweck 成长型思维 (Stanford 2006) · Erikson 第 5 阶段",
              strategy:
                "对事不对人，精确到「那一步」。Dweck 经典实验：被夸「你聪明」的学生遇到挫败更容易放弃；被夸「那一步思路对」的学生反而更敢再试。这个年龄正在搭「我是谁」的初稿——每句评价都被听进身份感。",
              isCurrent: true,
            },
            {
              range: "15-17 岁",
              stageName: "青春期中后期 · 自主权敏感",
              theorist: "Marcia 同一性状态 (1966)",
              strategy:
                "给信息、给选项，把选择权交给他。强行决定会被视为剥夺自主权。沟通从「你应该」切到「我看到的数据是…你怎么看」。",
              isCurrent: false,
            },
          ],
          tonightLines: [
            "先聊物理那道电路题——「第三步思路是对的」。先肯定他做对的那一步，把安全感建起来。",
            "再把邻居补习的事挑明：「我们家先看你卡在哪，不跟着别家走」。把房间里的大象清掉——不主动说，他会等着你说，整轮都不安。",
            "最后引出数学：「你是从哪一步开始觉得卡的？」把判断权还给小凯——这一步问出来后，下面「学习建议」那 5 题才有人接。",
          ],
          keyword: "对事不对人——精确到一个动作",
        },
      },
    },
  }
}
