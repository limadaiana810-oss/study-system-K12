"use client"

import { useEffect, useState } from "react"
import type { WrongQuestionReport, FocusPick } from "@/lib/reportTypes"
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { readTaskState, setTaskDone } from "@/lib/reportTaskState"

interface Props {
  report: WrongQuestionReport
}

const SUBJECT_DOT: Record<string, string> = {
  数学: "bg-indigo-500",
  物理: "bg-emerald-500",
  英语: "bg-amber-500",
  化学: "bg-red-500",
  语文: "bg-purple-500",
}

function priorityChipClass(p: "高" | "中") {
  if (p === "高") return "bg-red-50 text-red-600 border-red-100"
  return "bg-amber-50 text-amber-600 border-amber-100"
}

function FocusCard({
  pick,
  index,
  generatedAt,
}: {
  pick: FocusPick
  index: number
  generatedAt: string
}) {
  const [done, setDone] = useState<Record<string, true>>({})

  useEffect(() => {
    setDone(readTaskState(generatedAt))
  }, [generatedAt])

  function toggle(taskId: string) {
    const next = !done[taskId]
    setTaskDone(generatedAt, taskId, next)
    setDone((prev) => {
      const copy = { ...prev }
      if (next) copy[taskId] = true
      else delete copy[taskId]
      return copy
    })
  }

  const numberLabel = ["❶", "❷", "❸"][index] ?? `#${index + 1}`

  return (
    <section className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/40 p-5 shadow-sm">
      <div className="mb-3 flex items-baseline gap-2">
        <span className="text-lg font-black text-indigo-600">{numberLabel}</span>
        <h3 className="flex-1 text-sm font-bold text-slate-800">{pick.knowledgePoint}</h3>
        <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold ${priorityChipClass(pick.priority)}`}>
          {pick.priority}
        </span>
      </div>

      <div className="mb-3 flex items-center gap-2 text-[10px] text-slate-500">
        <span className={`inline-block h-2 w-2 rounded-full ${SUBJECT_DOT[pick.subject] ?? "bg-slate-400"}`} />
        <span>{pick.subject}</span>
        <span>·</span>
        <span>错 {pick.occurrences} 题</span>
      </div>

      <div className="mb-3 rounded-xl border border-slate-100 bg-white/60 p-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">症结</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-700">{pick.diagnosis}</p>
      </div>

      <div className="mb-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">本周任务</p>
        <ul className="space-y-2">
          {pick.tasks.map((t) => {
            const isDone = !!done[t.id]
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => toggle(t.id)}
                  className="flex w-full items-start gap-2 rounded-lg border border-slate-100 bg-white p-2 text-left hover:border-indigo-200"
                >
                  <span
                    className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      isDone ? "border-indigo-500 bg-indigo-500 text-white" : "border-slate-300 bg-white"
                    }`}
                  >
                    {isDone ? "✓" : ""}
                  </span>
                  <span className={`flex-1 text-xs leading-relaxed ${isDone ? "text-slate-400 line-through" : "text-slate-700"}`}>
                    {t.text}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="mb-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">完成后预期</p>
        <p className="mt-1 text-xs leading-relaxed text-emerald-800">{pick.expectedOutcome}</p>
      </div>

      {pick.fileRefs.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">相关错题</p>
          <div className="flex flex-wrap gap-1.5">
            {pick.fileRefs.map((f) => (
              <span key={f} className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                {f}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function WeeklyTrendCard({ trend }: { trend: WrongQuestionReport["weeklyTrend"] }) {
  const data = trend.series.map((p) => ({ week: `W${p.week}`, count: p.count }))
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <div className="h-3 w-1 rounded-full bg-indigo-500" />
        <h3 className="text-sm font-bold text-slate-800">错题节奏</h3>
      </div>
      <div className="h-40 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="week" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#6366F1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-slate-600">{trend.summary}</p>
    </section>
  )
}

function OtherWeakPointsCard({
  weakPoints,
  focusKnowledgePoints,
}: {
  weakPoints: WrongQuestionReport["weakPoints"]
  focusKnowledgePoints: Set<string>
}) {
  const [open, setOpen] = useState(false)
  const others = weakPoints.filter((wp) => !focusKnowledgePoints.has(wp.knowledgePoint))
  if (others.length === 0) return null

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 text-left"
      >
        <div className="h-3 w-1 rounded-full bg-slate-400" />
        <h3 className="flex-1 text-sm font-bold text-slate-800">
          其他薄弱点 ({others.length})
        </h3>
        <span className="text-xs text-slate-400">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          {others.map((wp) => (
            <div key={wp.knowledgePoint} className="rounded-xl border border-slate-100 p-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-bold text-slate-800">{wp.knowledgePoint}</span>
                <span className="text-[10px] text-slate-500">
                  <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${SUBJECT_DOT[wp.subject] ?? "bg-slate-400"}`} />
                  {wp.subject} · 错 {wp.occurrences} 次
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{wp.diagnosis}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function OverviewStripCard({ overview }: { overview: WrongQuestionReport["overview"] }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
        <span className="font-bold text-slate-800">共 {overview.total} 道</span>
        {overview.bySubject.map((s) => (
          <span key={s.subject} className="flex items-center gap-1">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${SUBJECT_DOT[s.subject] ?? "bg-slate-400"}`} />
            {s.subject} {s.count}
          </span>
        ))}
      </div>
    </section>
  )
}

export default function WrongQuestionReportView({ report }: Props) {
  const focusKPs = new Set(report.focusPicks.map((fp) => fp.knowledgePoint))
  return (
    <div className="space-y-3">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-3 w-1 rounded-full bg-indigo-500" />
          <h2 className="text-sm font-bold text-slate-800">本周聚焦</h2>
        </div>
        {report.focusPicks.map((pick, i) => (
          <FocusCard key={i} pick={pick} index={i} generatedAt={report.generatedAt} />
        ))}
      </div>
      <WeeklyTrendCard trend={report.weeklyTrend} />
      <OtherWeakPointsCard weakPoints={report.weakPoints} focusKnowledgePoints={focusKPs} />
      <OverviewStripCard overview={report.overview} />
    </div>
  )
}
