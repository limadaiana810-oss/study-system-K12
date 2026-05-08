"use client"

import { useState } from "react"
import type { GrowthReport } from "@/lib/reportTypes"
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { EMOTION_COLOR, EMOTION_VALENCE } from "@/lib/memoryParser"

function valenceFor(name: string): number {
  return EMOTION_VALENCE[name] ?? 0
}

function colorFor(name: string): string {
  return EMOTION_COLOR[name] ?? "#94A3B8"
}

interface Props {
  report: GrowthReport
}

function IconDoc({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 3 H12 L15 6 V17 H5 Z" />
      <polyline points="12 3 12 6 15 6" />
      <line x1="7" y1="10" x2="13" y2="10" />
      <line x1="7" y1="13" x2="13" y2="13" />
    </svg>
  )
}

function IconBook({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4 H8 a2 2 0 0 1 2 2 V17 a2 2 0 0 0 -2 -2 H3 Z" />
      <path d="M17 4 H12 a2 2 0 0 0 -2 2 V17 a2 2 0 0 1 2 -2 H17 Z" />
    </svg>
  )
}

function IconCalendar({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="14" height="12" rx="1.5" />
      <line x1="3" y1="9" x2="17" y2="9" />
      <line x1="7" y1="3" x2="7" y2="6" />
      <line x1="13" y1="3" x2="13" y2="6" />
    </svg>
  )
}

function IconCheck({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 11 8 15 16 6" />
    </svg>
  )
}

function IconEye({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 10 C5 5 8 4 10 4 C12 4 15 5 18 10 C15 15 12 16 10 16 C8 16 5 15 2 10 Z" />
      <circle cx="10" cy="10" r="2.4" />
    </svg>
  )
}

function IconArrowRight({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="10" x2="15" y2="10" />
      <polyline points="11 6 15 10 11 14" />
    </svg>
  )
}

function TrajectoryCard({ trajectory }: { trajectory: GrowthReport["trajectory"] }) {
  const stats: { value: number; label: string; icon: React.ReactNode; color: string }[] = [
    {
      value: trajectory.filesUploaded,
      label: "整理错题",
      icon: <IconDoc className="h-4 w-4" />,
      color: "text-indigo-500",
    },
    {
      value: trajectory.subjectsCovered.length,
      label: "覆盖学科",
      icon: <IconBook className="h-4 w-4" />,
      color: "text-emerald-500",
    },
    {
      value: trajectory.activeDays,
      label: "活跃天数",
      icon: <IconCalendar className="h-4 w-4" />,
      color: "text-amber-500",
    },
  ]
  // V11: chrome 由 <BackupSection> 提供；这里只返回内容 body。
  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl bg-slate-50 p-3 text-center">
          <div className={`mb-1 flex items-center justify-center ${s.color}`}>{s.icon}</div>
          <p className="text-xl font-black text-slate-800">{s.value}</p>
          <p className="text-[10px] text-slate-500">{s.label}</p>
        </div>
      ))}
    </div>
  )
}

function ExamDot(props: { cx?: number; cy?: number; payload?: { 考试均分?: number | null } }) {
  const { cx, cy, payload } = props
  if (cx == null || cy == null) return <g />
  if (payload?.考试均分 == null) return <g />
  return <circle cx={cx} cy={cy} r={4} fill="#10B981" stroke="#fff" strokeWidth={1.5} />
}

function HomeworkExamErrorChart({
  scores,
  focusSubject,
}: {
  scores: GrowthReport["scores"]
  focusSubject: string
}) {
  const [selected, setSelected] = useState<string>(focusSubject)
  const focus = scores.find((s) => s.subject === selected) ?? scores[0]
  const others = scores.filter((s) => s.subject !== focus?.subject)
  if (!focus) return null

  const weeks = ["W1", "W2", "W3", "W4"]
  const data = weeks.map((label, i) => ({
    week: label,
    作业均分: focus.weeklyHomeworkAvg[i] ?? null,
    考试均分: focus.weeklyExamAvg[i],
    错题数: focus.weeklyErrorCount[i] ?? 0,
  }))
  const maxErrors = Math.max(1, ...scores.flatMap((s) => s.weeklyErrorCount))

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <div className="h-3 w-1 rounded-full bg-emerald-500" />
        <h3 className="text-sm font-bold text-slate-800">
          本月分数对比 <span className="font-normal text-slate-400">· {focus.subject}</span>
        </h3>
      </div>

      {/* 一键切换学科 */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {scores.map((s) => {
          const active = s.subject === focus.subject
          return (
            <button
              key={s.subject}
              type="button"
              onClick={() => setSelected(s.subject)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                active
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {s.subject}
            </button>
          )
        })}
      </div>

      <div className="h-56 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="week" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="score" domain={[60, 100]} tick={{ fontSize: 11 }} />
            <YAxis
              yAxisId="errors"
              orientation="right"
              domain={[0, Math.max(maxErrors, 5)]}
              tick={{ fontSize: 11 }}
              allowDecimals={false}
            />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar
              yAxisId="errors"
              dataKey="错题数"
              fill="#F59E0B"
              fillOpacity={0.45}
              radius={[3, 3, 0, 0]}
              barSize={14}
            />
            <Line
              yAxisId="score"
              type="monotone"
              dataKey="作业均分"
              stroke="#6366F1"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#6366F1", stroke: "#fff", strokeWidth: 1 }}
              activeDot={{ r: 5 }}
              connectNulls
            />
            <Line
              yAxisId="score"
              type="monotone"
              dataKey="考试均分"
              stroke="#10B981"
              strokeWidth={2.5}
              strokeDasharray="5 4"
              dot={<ExamDot />}
              activeDot={{ r: 5 }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/40 px-3 py-2">
        <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700">作业 ↑</span>
        <IconArrowRight className="h-3.5 w-3.5 text-slate-400" />
        <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">错题 ↓</span>
        <IconArrowRight className="h-3.5 w-3.5 text-slate-400" />
        <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">考试 ↑</span>
      </div>
      <p className="mt-1.5 text-center text-[10px] leading-relaxed text-slate-400">
        三者通常一起动；偶有一两周断联，看大趋势就好
      </p>

      {others.length > 0 && (
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-100">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-2 py-1.5 font-bold">学科</th>
                <th className="px-2 py-1.5 font-bold tabular-nums">作业均分</th>
                <th className="px-2 py-1.5 font-bold tabular-nums">最近考试</th>
                <th className="px-2 py-1.5 font-bold tabular-nums">月内错题</th>
              </tr>
            </thead>
            <tbody>
              {others.map((s) => {
                const errorTotal = s.weeklyErrorCount.reduce((a, b) => a + b, 0)
                return (
                  <tr
                    key={s.subject}
                    onClick={() => setSelected(s.subject)}
                    className="cursor-pointer border-t border-slate-100 hover:bg-emerald-50/40"
                  >
                    <td className="px-2 py-1.5 font-bold text-slate-700">{s.subject}</td>
                    <td className="px-2 py-1.5 tabular-nums text-slate-600">{s.homeworkAvg}</td>
                    <td className="px-2 py-1.5 tabular-nums text-slate-600">
                      {s.examLatest ? `${s.examLatest.value}/${s.examLatest.max}` : "—"}
                    </td>
                    <td className="px-2 py-1.5 tabular-nums text-slate-600">{errorTotal}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="border-t border-slate-100 bg-slate-50/60 px-2 py-1 text-center text-[10px] text-slate-400">
            点击学科可切换查看
          </p>
        </div>
      )}
    </section>
  )
}

function EmotionDot(props: { cx?: number; cy?: number; payload?: { color?: string } }) {
  const { cx, cy, payload } = props
  if (cx == null || cy == null) return <g />
  const color = payload?.color ?? "#94A3B8"
  return <circle cx={cx} cy={cy} r={5} fill={color} stroke="#fff" strokeWidth={1.5} />
}

function EmotionTooltip({ active, payload }: {
  active?: boolean
  payload?: Array<{ payload?: { emotion?: string; valence?: number; summary?: string; color?: string } }>
}) {
  if (!active || !payload || payload.length === 0) return null
  const p = payload[0]?.payload
  if (!p) return null
  const valence = p.valence ?? 0
  return (
    <div className="max-w-[220px] rounded-md border border-slate-200 bg-white px-2.5 py-2 shadow-sm">
      <div className="flex items-center gap-1.5">
        <span
          className="inline-block h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: p.color ?? "#94A3B8" }}
        />
        <span className="text-xs font-bold text-slate-800">{p.emotion}</span>
        <span className="text-[10px] tabular-nums text-slate-400">
          {valence > 0 ? "+" : ""}
          {valence.toFixed(1)}
        </span>
      </div>
      {p.summary && <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{p.summary}</p>}
    </div>
  )
}

function EmotionTrendCard({ emotionTrend }: { emotionTrend: GrowthReport["emotionTrend"] }) {
  const data = emotionTrend.map((w) => ({
    week: `W${w.week}`,
    valence: valenceFor(w.dominant),
    emotion: w.dominant,
    color: colorFor(w.dominant),
    summary: w.summary,
  }))
  // V11: chrome 由 <BackupSection> 提供。
  return (
    <div>
      <div className="h-44 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="week" tick={{ fontSize: 11 }} />
            <YAxis
              domain={[-1, 1]}
              ticks={[-1, 0, 1]}
              tickFormatter={(v) => (v === 1 ? "积极" : v === -1 ? "低落" : "平")}
              tick={{ fontSize: 10 }}
              width={40}
            />
            <Tooltip content={<EmotionTooltip />} />
            <Line
              type="monotone"
              dataKey="valence"
              stroke="#A855F7"
              strokeWidth={2}
              dot={<EmotionDot />}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-3 space-y-1.5">
        {emotionTrend.map((w) => {
          const color = colorFor(w.dominant)
          return (
            <li key={w.week} className="flex items-start gap-2 text-xs leading-relaxed text-slate-600">
              <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
                W{w.week} · {w.dominant}
              </span>
              <span className="flex-1">{w.summary}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function HighlightsCard({ highlights }: { highlights: string[] }) {
  // V11: chrome 由 <BackupSection> 提供。
  if (highlights.length === 0) {
    return <p className="text-xs text-slate-400">这个月没看到明显进步</p>
  }
  return (
    <ul className="space-y-2">
      {highlights.map((h, i) => (
        <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
          <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
            <IconCheck className="h-2.5 w-2.5" />
          </span>
          <span className="leading-relaxed">{h}</span>
        </li>
      ))}
    </ul>
  )
}

function ParentAdviceCard({ advice }: { advice: GrowthReport["parentAdvice"] }) {
  // V11: 第二列重命名为「沟通重点」，配色从 amber 警示色 → sky 信息色。
  // 第一列首条已被 thisWeekAction 抽走，剩余 strengthen 在这里继续展示。
  const cols: {
    title: string
    items: string[]
    color: string
    icon: React.ReactNode
  }[] = [
    {
      title: "下一步学习计划",
      items: advice.strengthen,
      color: "bg-indigo-50 text-indigo-700 border-indigo-100",
      icon: <IconCalendar className="h-3.5 w-3.5" />,
    },
    {
      title: "沟通重点",
      items: advice.remind,
      color: "bg-sky-50 text-sky-700 border-sky-100",
      icon: <IconEye className="h-3.5 w-3.5" />,
    },
    {
      title: "家长行动计划",
      items: advice.encourage,
      color: "bg-emerald-50 text-emerald-700 border-emerald-100",
      icon: <IconCheck className="h-3.5 w-3.5" />,
    },
  ]
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {cols.map((c) => (
        <div key={c.title} className={`rounded-xl border p-3 ${c.color}`}>
          <p className="mb-2 flex items-center gap-1 text-xs font-bold">
            {c.icon}
            <span>{c.title}</span>
          </p>
          {c.items.length === 0 ? (
            <p className="text-[11px] opacity-70">暂无</p>
          ) : (
            <ul className="space-y-1.5">
              {c.items.map((item, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[11px] leading-relaxed">
                  <span className="mt-1 inline-block h-1 w-1 shrink-0 rounded-full bg-current opacity-60" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
}

function TopInsight({ insight }: { insight: string }) {
  if (!insight) return null
  return <p className="text-sm leading-relaxed text-slate-700">{insight}</p>
}

function ThisWeekAction({ action }: { action: string }) {
  if (!action) return null
  return (
    <div className="border-t border-slate-100 bg-indigo-50/40 px-4 py-3">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white">
          <IconArrowRight className="h-3 w-3" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">
            这周一件事
          </p>
          <p className="mt-0.5 text-xs font-semibold leading-relaxed text-slate-800">{action}</p>
        </div>
      </div>
    </div>
  )
}

function HeroCard({
  scores,
  focusSubject,
  thisWeekAction,
}: {
  scores: GrowthReport["scores"]
  focusSubject: string
  thisWeekAction: string
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <HomeworkExamErrorChart scores={scores} focusSubject={focusSubject} />
      <ThisWeekAction action={thisWeekAction} />
    </section>
  )
}

function BackupSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 [&::-webkit-details-marker]:hidden">
        <span className="flex-1 text-xs font-bold text-slate-700">{title}</span>
        <svg
          className="h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform group-open:rotate-180"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="5 8 10 13 15 8" />
        </svg>
      </summary>
      <div className="border-t border-slate-100 p-4">{children}</div>
    </details>
  )
}

export default function GrowthReportView({ report }: Props) {
  return (
    <div className="space-y-3">
      <TopInsight insight={report.topInsight} />

      <HeroCard
        scores={report.scores}
        focusSubject={report.focusSubject}
        thisWeekAction={report.thisWeekAction}
      />

      <BackupSection title="看小凯这个月情绪怎么走的">
        <EmotionTrendCard emotionTrend={report.emotionTrend} />
      </BackupSection>

      <BackupSection title="小凯这个月做了多少">
        <TrajectoryCard trajectory={report.trajectory} />
      </BackupSection>

      <BackupSection title="做得好的几件事">
        <HighlightsCard highlights={report.highlights} />
      </BackupSection>

      <BackupSection title="其余可以陪小凯这么聊">
        <ParentAdviceCard advice={report.parentAdvice} />
      </BackupSection>
    </div>
  )
}
