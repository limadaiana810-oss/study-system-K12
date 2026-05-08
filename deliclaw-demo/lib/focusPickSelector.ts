/**
 * FocusPick 选取算法：贪心 max-coverage。
 *
 * 每一轮：从未选过的错题里挑「能新增最多 KP 频次和」的那一道。
 * 直觉：先选覆盖最多高频痛点的题，下一轮把已覆盖的 KP 排除（避免重复），再选下一个高密度题。
 *
 * 这样产出的 3 个 FocusPick：互相 KP 重叠最少 + 总体覆盖了最多高频 KP。
 */

import type { MockQuestion } from "./mockQuestionBank.ts"
import type { FocusPick, FocusTask } from "./reportTypes.ts"

export function buildKpFrequency(erroredQuestions: MockQuestion[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const q of erroredQuestions) {
    for (const kp of q.knowledgePoints) {
      map.set(kp, (map.get(kp) ?? 0) + 1)
    }
  }
  return map
}

function noveltyScore(
  question: MockQuestion,
  kpFrequency: Map<string, number>,
  covered: Set<string>,
): number {
  return question.knowledgePoints
    .filter((kp) => !covered.has(kp))
    .reduce((sum, kp) => sum + (kpFrequency.get(kp) ?? 0), 0)
}

function totalDensity(question: MockQuestion, kpFrequency: Map<string, number>): number {
  return question.knowledgePoints.reduce(
    (sum, kp) => sum + (kpFrequency.get(kp) ?? 0),
    0,
  )
}

function primaryKpFrequency(question: MockQuestion, kpFrequency: Map<string, number>): number {
  let max = 0
  for (const kp of question.knowledgePoints) {
    const f = kpFrequency.get(kp) ?? 0
    if (f > max) max = f
  }
  return max
}

function formatDate(iso: string): string {
  const [, m, d] = iso.split("-")
  return `${parseInt(m)}/${parseInt(d)}`
}

function buildFocusPick(
  question: MockQuestion,
  kpFrequency: Map<string, number>,
  allErrored: MockQuestion[],
  index: number,
): FocusPick {
  const sortedKps = [...question.knowledgePoints].sort(
    (a, b) => (kpFrequency.get(b) ?? 0) - (kpFrequency.get(a) ?? 0),
  )
  const primaryKp = sortedKps[0]
  const errorCount = kpFrequency.get(primaryKp) ?? 1

  // 找一道同学科 + 同 primaryKp 的兄弟错题（用作 spaced retrieval 的 task #2）
  const sibling = allErrored.find(
    (q) =>
      q.id !== question.id &&
      q.subject === question.subject &&
      q.knowledgePoints.includes(primaryKp),
  )

  const tasks: FocusTask[] = [
    {
      id: `focus-${index}-task-0`,
      text: `重做 ${formatDate(question.date)} 那道：${question.excerpt}`,
      durationMinutes: 8,
      isReDo: true,
    },
  ]
  if (sibling) {
    tasks.push({
      id: `focus-${index}-task-1`,
      text: `翻 ${formatDate(sibling.date)} 那道，先想清楚 ${primaryKp} 再开始解`,
      durationMinutes: 6,
      isReDo: true,
    })
  }

  const kpCount = question.knowledgePoints.length
  const whyPicked =
    kpCount >= 3
      ? `这道题同时考了 ${kpCount} 个知识点：${question.knowledgePoints.join("、")}。攻下这一道，等于把 ${kpCount} 处都过一遍。`
      : `这道题考了 ${question.knowledgePoints.join(" 和 ")}。「${primaryKp}」月内错过 ${errorCount} 次，先把它锁死。`

  const fileRefs = sibling ? [question.fileName, sibling.fileName] : [question.fileName]

  return {
    subject: question.subject,
    goal: question.goal ?? `${formatDate(question.date)} 那道：${question.excerpt}`,
    stepDiagnosis: question.stepDiagnosis ?? `${formatDate(question.date)} 那道，关键卡在 ${primaryKp}。`,
    tasks,
    closingLine: question.closingLine ?? `下次再遇到——第一步先把 ${primaryKp} 想清楚。`,
    fileRefs,
    knowledgePoints: question.knowledgePoints,
    whyPicked,
    errorCount,
    examWeightLabel: question.examWeightLabel ?? "选填常考",
    excerpt: question.excerpt,
    questionDate: question.date,
  }
}

export type FocusPickSelection = {
  hero: FocusPick | null
  backups: FocusPick[]
  kpFrequency: Map<string, number>
}

export function selectFocusPicks(questions: MockQuestion[]): FocusPickSelection {
  const errored = questions.filter((q) => q.errored)
  const kpFrequency = buildKpFrequency(errored)

  const covered = new Set<string>()
  const picks: FocusPick[] = []
  const pickedIds = new Set<string>()

  while (picks.length < 3) {
    const candidates = errored.filter((q) => !pickedIds.has(q.id))
    if (candidates.length === 0) break

    const scored = candidates
      .map((q) => ({
        q,
        novelty: noveltyScore(q, kpFrequency, covered),
        density: totalDensity(q, kpFrequency),
        coverage: q.knowledgePoints.length,
        primaryFreq: primaryKpFrequency(q, kpFrequency),
      }))
      .sort((a, b) => {
        if (b.novelty !== a.novelty) return b.novelty - a.novelty
        if (b.density !== a.density) return b.density - a.density
        if (b.coverage !== a.coverage) return b.coverage - a.coverage
        if (b.primaryFreq !== a.primaryFreq) return b.primaryFreq - a.primaryFreq
        return a.q.date.localeCompare(b.q.date) // 早的题优先（更老的卡点先补）
      })

    const winner = scored[0]
    if (!winner || winner.novelty <= 0) break

    picks.push(buildFocusPick(winner.q, kpFrequency, errored, picks.length))
    pickedIds.add(winner.q.id)
    for (const kp of winner.q.knowledgePoints) covered.add(kp)
  }

  // 分层：第 0 道为 hero（density 最高的那道），剩下 0-2 道为 backups。
  // 判断写在数据形状里，而不是延迟到视图层。
  const hero = picks[0] ?? null
  const backups = picks.slice(1)
  return { hero, backups, kpFrequency }
}
