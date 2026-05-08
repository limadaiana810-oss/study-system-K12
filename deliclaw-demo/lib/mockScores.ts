export type ScoreType = "homework" | "quiz" | "exam"
export type Subject = "语文" | "数学" | "英语" | "物理" | "化学"

export type ScoreEntry = {
  id: string
  subject: Subject
  type: ScoreType
  value: number
  max: number
  date: string // ISO yyyy-mm-dd
  comment?: string
}

export type WeeklyEmotion = {
  week: 1 | 2 | 3 | 4
  dominant: string
}

// 4 weeks ago up to today, 30-day window. Demo numbers crafted so:
// - 数学 dips week 2, recovers week 4
// - 英语 stable
// - 物理 occasional low (week 3)
// - 语文 slight upward trend
// - 化学 very stable mid-range
function isoNDaysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  // Build the local-date string directly so we don't drift to the UTC day
  // when run in early-morning local time (e.g. CST UTC+8 at 02:00).
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export const MOCK_SCORES: ScoreEntry[] = [
  // ---- Week 1 (28-22 days ago) ----
  { id: "s_001", subject: "语文", type: "homework", value: 88, max: 100, date: isoNDaysAgo(28) },
  { id: "s_002", subject: "数学", type: "homework", value: 92, max: 100, date: isoNDaysAgo(28), comment: "几何题答得不错" },
  { id: "s_003", subject: "英语", type: "homework", value: 90, max: 100, date: isoNDaysAgo(27) },
  { id: "s_004", subject: "物理", type: "homework", value: 85, max: 100, date: isoNDaysAgo(27) },
  { id: "s_005", subject: "化学", type: "homework", value: 82, max: 100, date: isoNDaysAgo(26) },
  { id: "s_006", subject: "语文", type: "quiz", value: 84, max: 100, date: isoNDaysAgo(25) },
  { id: "s_007", subject: "数学", type: "homework", value: 90, max: 100, date: isoNDaysAgo(25) },
  { id: "s_008", subject: "英语", type: "quiz", value: 88, max: 100, date: isoNDaysAgo(24) },
  { id: "s_009", subject: "物理", type: "homework", value: 86, max: 100, date: isoNDaysAgo(24) },
  { id: "s_010", subject: "化学", type: "homework", value: 80, max: 100, date: isoNDaysAgo(23) },
  { id: "s_011", subject: "数学", type: "exam", value: 102, max: 120, date: isoNDaysAgo(22), comment: "月考一" },
  { id: "s_012", subject: "语文", type: "homework", value: 87, max: 100, date: isoNDaysAgo(22) },

  // ---- Week 2 (21-15 days ago) — 数学 dip, 物理 stable ----
  { id: "s_013", subject: "数学", type: "homework", value: 76, max: 100, date: isoNDaysAgo(21), comment: "压轴题没做完" },
  { id: "s_014", subject: "英语", type: "homework", value: 89, max: 100, date: isoNDaysAgo(21) },
  { id: "s_015", subject: "物理", type: "homework", value: 84, max: 100, date: isoNDaysAgo(20) },
  { id: "s_016", subject: "语文", type: "homework", value: 89, max: 100, date: isoNDaysAgo(20) },
  { id: "s_017", subject: "化学", type: "homework", value: 81, max: 100, date: isoNDaysAgo(19) },
  { id: "s_018", subject: "数学", type: "homework", value: 72, max: 100, date: isoNDaysAgo(19), comment: "二次函数还没掌握" },
  { id: "s_019", subject: "英语", type: "quiz", value: 91, max: 100, date: isoNDaysAgo(18) },
  { id: "s_020", subject: "物理", type: "quiz", value: 80, max: 100, date: isoNDaysAgo(17) },
  { id: "s_021", subject: "数学", type: "quiz", value: 70, max: 100, date: isoNDaysAgo(16) },
  { id: "s_022", subject: "化学", type: "homework", value: 83, max: 100, date: isoNDaysAgo(16) },
  { id: "s_023", subject: "语文", type: "homework", value: 90, max: 100, date: isoNDaysAgo(15) },

  // ---- Week 3 (14-8 days ago) — 物理 low, 数学 still recovering ----
  { id: "s_024", subject: "数学", type: "homework", value: 78, max: 100, date: isoNDaysAgo(14) },
  { id: "s_025", subject: "英语", type: "homework", value: 90, max: 100, date: isoNDaysAgo(14) },
  { id: "s_026", subject: "物理", type: "homework", value: 68, max: 100, date: isoNDaysAgo(13), comment: "电路图老错" },
  { id: "s_027", subject: "化学", type: "homework", value: 82, max: 100, date: isoNDaysAgo(13) },
  { id: "s_028", subject: "语文", type: "homework", value: 91, max: 100, date: isoNDaysAgo(12) },
  { id: "s_029", subject: "数学", type: "homework", value: 82, max: 100, date: isoNDaysAgo(12) },
  { id: "s_030", subject: "物理", type: "exam", value: 90, max: 120, date: isoNDaysAgo(11), comment: "月考二" },
  { id: "s_031", subject: "英语", type: "exam", value: 132, max: 150, date: isoNDaysAgo(11), comment: "月考二" },
  { id: "s_032", subject: "化学", type: "quiz", value: 84, max: 100, date: isoNDaysAgo(10) },
  { id: "s_033", subject: "语文", type: "homework", value: 92, max: 100, date: isoNDaysAgo(9) },
  { id: "s_034", subject: "数学", type: "homework", value: 80, max: 100, date: isoNDaysAgo(9) },
  { id: "s_035", subject: "英语", type: "homework", value: 91, max: 100, date: isoNDaysAgo(8) },

  // ---- Week 4 (7-0 days ago) — 数学 recovers, 物理 still need attention ----
  { id: "s_036", subject: "数学", type: "homework", value: 88, max: 100, date: isoNDaysAgo(7), comment: "重做后大有改善" },
  { id: "s_037", subject: "物理", type: "homework", value: 78, max: 100, date: isoNDaysAgo(7) },
  { id: "s_038", subject: "化学", type: "homework", value: 85, max: 100, date: isoNDaysAgo(6) },
  { id: "s_039", subject: "语文", type: "homework", value: 93, max: 100, date: isoNDaysAgo(6) },
  { id: "s_040", subject: "英语", type: "homework", value: 92, max: 100, date: isoNDaysAgo(5) },
  { id: "s_041", subject: "数学", type: "quiz", value: 90, max: 100, date: isoNDaysAgo(5) },
  { id: "s_042", subject: "物理", type: "quiz", value: 76, max: 100, date: isoNDaysAgo(4) },
  { id: "s_043", subject: "化学", type: "homework", value: 86, max: 100, date: isoNDaysAgo(4) },
  { id: "s_044", subject: "语文", type: "quiz", value: 91, max: 100, date: isoNDaysAgo(3) },
  { id: "s_045", subject: "英语", type: "quiz", value: 93, max: 100, date: isoNDaysAgo(3) },
  { id: "s_046", subject: "数学", type: "homework", value: 92, max: 100, date: isoNDaysAgo(2), comment: "二次函数已掌握" },
  { id: "s_047", subject: "物理", type: "homework", value: 80, max: 100, date: isoNDaysAgo(2) },
  { id: "s_048", subject: "化学", type: "homework", value: 87, max: 100, date: isoNDaysAgo(1) },
  { id: "s_049", subject: "语文", type: "homework", value: 94, max: 100, date: isoNDaysAgo(1) },
  { id: "s_050", subject: "英语", type: "homework", value: 94, max: 100, date: isoNDaysAgo(0) },
  { id: "s_051", subject: "数学", type: "homework", value: 91, max: 100, date: isoNDaysAgo(0) },
]

export const MOCK_EMOTION_HISTORY: WeeklyEmotion[] = [
  { week: 1, dominant: "好奇" },
  { week: 2, dominant: "沮丧" },
  { week: 3, dominant: "平静" },
  { week: 4, dominant: "开心" },
]

export function getScoresForWindow(days: number): ScoreEntry[] {
  // Returns the last `days` calendar days, exclusive of the day `days+1` ago.
  // E.g. getScoresForWindow(7) yields entries from the 6 previous days plus today (7 distinct days).
  const cutoff = isoNDaysAgo(days)
  return MOCK_SCORES.filter((s) => s.date > cutoff).sort((a, b) =>
    a.date.localeCompare(b.date)
  )
}
