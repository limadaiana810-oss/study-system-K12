/**
 * 客户端实时解析用户输入，生成“本轮捕捉信息”。
 * 在用户消息一发出时立即执行，不等待 AI 响应。
 */

export type CaptureType = "task_progress" | "emotion" | "fact" | "file_intent"

export interface CaptureItem {
  type: CaptureType
  label: string
  value: string
  evidence: string
}

const EMOTION_PATTERNS: Array<{ pattern: RegExp; label: string; value: string }> = [
  { pattern: /开心|高兴|愉快|爽|棒|快乐|兴奋/, label: "情绪感知", value: "愉悦" },
  { pattern: /累|疲惫|困|睡|没精神|倦/, label: "情绪感知", value: "疲惫" },
  { pattern: /焦虑|紧张|担心|害怕|慌/, label: "情绪感知", value: "焦虑" },
  { pattern: /难过|伤心|沮丧|失望|郁闷/, label: "情绪感知", value: "沮丧" },
  { pattern: /好奇|想知道|疑问|为什么|怎么/, label: "情绪感知", value: "好奇" },
  { pattern: /平静|还好|一般|没事/, label: "情绪感知", value: "平静" },
  { pattern: /满足|满意|够了|可以/, label: "情绪感知", value: "满足" },
]

const TASK_PATTERNS: Array<{ pattern: RegExp; label: string; value: string }> = [
  { pattern: /整理|分类|归档|收纳|归类/, label: "任务意图", value: "文件整理" },
  { pattern: /找|搜索|查找|给我|调出|查看/, label: "任务意图", value: "文件检索" },
  { pattern: /上传|传.*图|发.*图|拍|照片/, label: "任务意图", value: "上传文件" },
  { pattern: /删除|移除|清空|清理/, label: "任务意图", value: "清理文件" },
  { pattern: /总结|概括|提炼|归纳/, label: "任务意图", value: "内容总结" },
]

function cleanCapture(s: string | undefined): string | null {
  if (!s) return null
  return s.replace(/[，。,\.!！?？:：;；\s]+$/, "").trim() || null
}

const FACT_PATTERNS: Array<{
  pattern: RegExp
  label: string
  extract: (m: RegExpMatchArray) => string | null
}> = [
  {
    pattern: /我叫([一-龥\w]{1,6})|我是([一-龥\w]{1,6})|我的名字[是叫]([一-龥\w]{1,6})/,
    label: "姓名",
    extract: (m) => cleanCapture(m[1] || m[2] || m[3]),
  },
  {
    pattern: /([初高][一二三四五六七八九十]|大[一二三四]|研[一二三四]|[一二三四五六七八九十]+年级)/,
    label: "年级",
    extract: (m) => m[1] || null,
  },
  {
    pattern: /(?:喜欢|爱好)([^，。,；;！!、]+?)(?:，|。|,|;|！|!|$)/,
    label: "偏好（喜欢）",
    extract: (m) => cleanCapture(m[1]),
  },
  {
    pattern: /(?:不喜欢|讨厌)([^，。,；;！!、]+?)(?:，|。|,|;|！|!|$)/,
    label: "偏好（不喜欢）",
    extract: (m) => cleanCapture(m[1]),
  },
  {
    pattern: /在(.+?(?:大学|学院|学校|院校))/,
    label: "学校",
    extract: (m) => cleanCapture(m[1]),
  },
  {
    pattern: /(\d{1,3})岁|年龄[是为](\d{1,3})/,
    label: "年龄",
    extract: (m) => m[1] || m[2] || null,
  },
  {
    pattern: /职位[是为](.+?)[，。]|我是(.+?)(?:老师|工程师|经理|学生|医生)/,
    label: "职位",
    extract: (m) => cleanCapture(m[1] || m[2]),
  },
]

export function parseUserInputCapture(text: string): CaptureItem[] {
  const items: CaptureItem[] = []
  const t = text.trim()
  if (!t) return items

  // 1. 任务意图（允许多个）
  for (const tp of TASK_PATTERNS) {
    if (tp.pattern.test(t)) {
      items.push({ type: "task_progress", label: tp.label, value: tp.value, evidence: t })
    }
  }

  // 2. 情绪感知（只取第一个命中的）
  for (const ep of EMOTION_PATTERNS) {
    if (ep.pattern.test(t)) {
      items.push({ type: "emotion", label: ep.label, value: ep.value, evidence: t })
      break
    }
  }

  // 3. 事实提取
  for (const fp of FACT_PATTERNS) {
    const m = t.match(fp.pattern)
    if (m) {
      const value = fp.extract(m)
      if (value && value.trim()) {
        items.push({ type: "fact", label: fp.label, value: value.trim(), evidence: t })
      }
    }
  }

  // 4. 文件意图兜底（如果任务意图没命中上传相关，但文本里有图片/文件关键词）
  const hasFileIntent = items.some((i) => i.type === "task_progress" && i.value === "上传文件")
  if (!hasFileIntent && /图片|照片|截图|文件|文档|pdf|jpg|png|jpeg/.test(t)) {
    items.push({ type: "file_intent", label: "文件意图", value: "提及文件", evidence: t })
  }

  return items
}
