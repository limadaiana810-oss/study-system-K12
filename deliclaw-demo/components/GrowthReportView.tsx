"use client"

import type { GrowthReport } from "@/lib/reportTypes"
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

const SUBJECT_COLORS = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"]

interface Props {
  report: GrowthReport
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="h-3 w-1 rounded-full bg-emerald-500" />
      <h3 className="text-sm font-bold text-slate-800">{children}</h3>
    </div>
  )
}

function TrajectoryCard({ trajectory }: { trajectory: GrowthReport["trajectory"] }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <SectionTitle>本月学习轨迹</SectionTitle>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-slate-50 p-3 text-center">
          <p className="text-xl font-black text-slate-800">{trajectory.filesUploaded}</p>
          <p className="text-[10px] text-slate-500">上传文件</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 text-center">
          <p className="text-xl font-black text-slate-800">{trajectory.subjectsCovered.length}</p>
          <p className="text-[10px] text-slate-500">覆盖学科</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 text-center">
          <p className="text-xl font-black text-slate-800">{trajectory.activeDays}</p>
          <p className="text-[10px] text-slate-500">活跃天数</p>
        </div>
      </div>
    </section>
  )
}

function ScoreTrendCard({ scores }: { scores: GrowthReport["scores"] }) {
  // Reshape into [{ week: "W1", 数学: 80, 英语: 90, ... }, ...]
  const weeks = ["W1", "W2", "W3", "W4"]
  const data = weeks.map((label, i) => {
    const row: Record<string, string | number> = { week: label }
    for (const s of scores) row[s.subject] = s.weeklySeries[i] ?? 0
    return row
  })

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <SectionTitle>本月分数趋势（百分制）</SectionTitle>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" tick={{ fontSize: 11 }} />
            <YAxis domain={[60, 100]} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {scores.map((s, i) => (
              <Line
                key={s.subject}
                type="monotone"
                dataKey={s.subject}
                stroke={SUBJECT_COLORS[i % SUBJECT_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {scores.map((s) => (
          <div key={s.subject} className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5">
            <p className="text-[10px] text-slate-400">{s.subject}</p>
            <p className="text-xs font-bold text-slate-700">作业均分 {s.homeworkAvg}</p>
            {s.examLatest && (
              <p className="text-[10px] text-slate-500">
                最近考试 {s.examLatest.value}/{s.examLatest.max}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

function EmotionTrendCard({ emotionTrend }: { emotionTrend: GrowthReport["emotionTrend"] }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <SectionTitle>情绪轨迹</SectionTitle>
      <div className="space-y-2">
        {emotionTrend.map((w) => (
          <div key={w.week} className="flex items-start gap-2 rounded-xl border border-slate-100 p-3">
            <span className="shrink-0 rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-600">
              第 {w.week} 周
            </span>
            <div className="flex-1">
              <p className="text-xs font-bold text-slate-700">主导情绪：{w.dominant}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{w.summary}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function HighlightsCard({ highlights }: { highlights: string[] }) {
  return (
    <section className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 shadow-sm">
      <SectionTitle>亮点与进步</SectionTitle>
      {highlights.length === 0 ? (
        <p className="text-xs text-slate-400">暂未识别出明显亮点</p>
      ) : (
        <ul className="space-y-1.5">
          {highlights.map((h, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
              <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              <span className="leading-relaxed">{h}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function ParentAdviceCard({ advice }: { advice: GrowthReport["parentAdvice"] }) {
  const cols: { title: string; items: string[]; color: string }[] = [
    { title: "需要加强", items: advice.strengthen, color: "bg-red-50 text-red-700 border-red-100" },
    { title: "需要提醒", items: advice.remind, color: "bg-amber-50 text-amber-700 border-amber-100" },
    { title: "需要鼓励", items: advice.encourage, color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  ]
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <SectionTitle>给家长的建议</SectionTitle>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cols.map((c) => (
          <div key={c.title} className={`rounded-xl border p-3 ${c.color}`}>
            <p className="text-xs font-bold mb-2">{c.title}</p>
            {c.items.length === 0 ? (
              <p className="text-[11px] opacity-70">暂无</p>
            ) : (
              <ul className="space-y-1">
                {c.items.map((item, i) => (
                  <li key={i} className="text-[11px] leading-relaxed">· {item}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

export default function GrowthReportView({ report }: Props) {
  return (
    <div className="space-y-3">
      <TrajectoryCard trajectory={report.trajectory} />
      <ScoreTrendCard scores={report.scores} />
      <EmotionTrendCard emotionTrend={report.emotionTrend} />
      <HighlightsCard highlights={report.highlights} />
      <ParentAdviceCard advice={report.parentAdvice} />
    </div>
  )
}
