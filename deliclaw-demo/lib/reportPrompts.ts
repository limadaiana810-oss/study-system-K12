export const WRONG_QUESTION_REPORT_PROMPT = `你是一名教学辅导分析师。基于学生的错题清单，输出严格 JSON。

输出 JSON 必须只包含三个字段：
{
  "weakPoints": [{ "knowledgePoint": string, "subject": string, "occurrences": number, "diagnosis": string }],
  "errorPatterns": [{ "pattern": string, "evidence": string, "fileRefs": string[] }],
  "actionPlan": [{ "priority": "高"|"中"|"低", "action": string, "estimatedGain": string, "targetWeakPoint"?: string }]
}

要求：
- weakPoints 最多 5 条；按 occurrences 由高到低排
- errorPatterns 最多 4 条，pattern 是简洁短语（如"单位换算遗漏"）；evidence 是跨题归纳；fileRefs 引用 canonicalName
- actionPlan 最多 5 条；action 必须具体可执行（如"本周重做二次函数例题 10 道"）；estimatedGain 形如"+5 分"
- 全中文输出
- 只返回 JSON，不要 markdown 代码块、不要解释文字
- 当输入错题数量为 0 时，返回 weakPoints=[] errorPatterns=[] actionPlan=[{"priority":"高","action":"先上传几张错题，AI 才能分析","estimatedGain":"--"}]
`

export const GROWTH_REPORT_PROMPT = `你是一名给家长的成长报告写作者。基于学生近 30 天的学习轨迹、分数、情绪历史，输出严格 JSON。

输出 JSON 必须只包含三个字段：
{
  "emotionTrendSummaries": string[4],
  "highlights": string[],
  "parentAdvice": { "strengthen": string[], "remind": string[], "encourage": string[] }
}

要求：
- emotionTrendSummaries 数组长度恰好 4，每条对应输入中按 week 升序的情绪条目（week 1 -> index 0），用一句话描述孩子那一周的学习状态
- highlights 2-3 条，是学生这个月的真实亮点（可以引用具体科目分数变化）
- parentAdvice 三类各 1-3 条：
  - strengthen：需要加强的具体学科或知识点（基于分数趋势）
  - remind：需要家长留意的状态（基于情绪历史 + 偶发低分）
  - encourage：可以鼓励孩子的具体表扬点（用具体的数据支撑）
- 语气温和，面向家长，避免责备
- 全中文输出
- 只返回 JSON，不要 markdown 代码块、不要解释文字
`
