"use client"

import { useEffect, useState } from "react"
import type { WrongQuestionReport, FocusPick, TodayPick } from "@/lib/reportTypes"
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
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

const SUBJECT_HEX: Record<string, string> = {
  数学: "#6366F1",
  物理: "#10B981",
  英语: "#F59E0B",
  化学: "#EF4444",
  语文: "#A855F7",
}

function HeroSignalsBar({
  progressSignal,
  gapSignal,
}: {
  progressSignal: string
  gapSignal: string
}) {
  if (!progressSignal && !gapSignal) return null
  return (
    <section className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-white p-4 shadow-sm">
      {progressSignal && (
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-emerald-600 font-bold">✓</span>
          <p className="text-sm font-bold leading-relaxed text-emerald-800">{progressSignal}</p>
        </div>
      )}
      {gapSignal && (
        <div className={`flex items-center gap-2 ${progressSignal ? "mt-2" : ""}`}>
          <span className="shrink-0 text-amber-600 font-bold">⚠</span>
          <p className="text-sm font-semibold leading-relaxed text-amber-800">{gapSignal}</p>
        </div>
      )}
    </section>
  )
}

function scrollToTask(taskId: string) {
  if (typeof document !== "undefined") {
    const el = document.getElementById(`task-${taskId}`)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" })
      el.classList.add("ring-2", "ring-indigo-400")
      setTimeout(() => el.classList.remove("ring-2", "ring-indigo-400"), 1500)
    }
  }
}

function TodayPickCard({
  todayPick,
  taskState,
}: {
  todayPick: TodayPick
  taskState: Record<string, true>
}) {
  const isDone = !!taskState[todayPick.taskId]

  if (isDone) {
    return (
      <section className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/40 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-indigo-600 font-bold">✓</span>
          <h2 className="text-sm font-bold text-indigo-800">本日已完成</h2>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed mb-1">{todayPick.fileRef}</p>
        <p className="text-xs text-slate-500 leading-relaxed">下面还有计划，想继续就往下翻</p>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-indigo-600 font-bold">▶</span>
        <h2 className="text-sm font-bold text-indigo-900">本日重点</h2>
      </div>
      <p className="text-sm font-semibold text-slate-800 leading-relaxed mb-1">
        {todayPick.taskText}
      </p>
      <p className="text-xs text-slate-600 leading-relaxed mb-4">{todayPick.whyLine}</p>
      <button
        type="button"
        onClick={() => scrollToTask(todayPick.taskId)}
        className="w-full rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-700"
        style={{ minHeight: "48px" }}
      >
        开始
      </button>
    </section>
  )
}

function FocusCard({
  pick,
  index,
  taskState,
  onToggle,
}: {
  pick: FocusPick
  index: number
  taskState: Record<string, true>
  onToggle: (taskId: string) => void
}) {
  function jumpToFirstTask() {
    const first = pick.tasks[0]
    if (!first) return
    scrollToTask(first.id)
  }

  const numberLabel = ["❶", "❷"][index] ?? `#${index + 1}`

  return (
    <section className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/40 p-5 shadow-sm">
      <div className="mb-3 flex items-baseline gap-2">
        <span className="text-lg font-black text-indigo-600">{numberLabel}</span>
        <h3 className="flex-1 text-sm font-bold leading-relaxed text-slate-800">{pick.goal}</h3>
        <span className="shrink-0 text-[10px] text-slate-400">
          <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${SUBJECT_DOT[pick.subject] ?? "bg-slate-400"}`} />
          {pick.subject}
        </span>
      </div>

      <div className="mb-3 rounded-xl border border-slate-100 bg-white/70 p-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">错因回顾</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-700">{pick.stepDiagnosis}</p>
      </div>

      <div className="mb-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">本周练习</p>
        <ul className="space-y-2">
          {pick.tasks.map((t) => {
            const isDone = !!taskState[t.id]
            return (
              <li key={t.id} id={`task-${t.id}`}>
                <button
                  type="button"
                  onClick={() => onToggle(t.id)}
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
                  <span className={`shrink-0 text-[10px] tabular-nums ${isDone ? "text-slate-300" : "text-slate-500"}`}>
                    ⏱ {t.durationMinutes} 分钟
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="mb-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">解题要点</p>
        <p className="mt-1 text-xs leading-relaxed text-emerald-800">{pick.closingLine}</p>
      </div>

      <button
        type="button"
        onClick={jumpToFirstTask}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
      >
        ▶ 现在就做
      </button>

      {pick.fileRefs.length > 0 && (
        <div className="mt-3">
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
    <section className="flex-[1.4] min-w-0 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <div className="h-3 w-1 rounded-full bg-indigo-500" />
        <h3 className="text-sm font-bold text-slate-800">本月错题趋势</h3>
      </div>
      <div className="h-40 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="week" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#6366F1"
              strokeWidth={2}
              dot={{ r: 4, fill: "#6366F1", stroke: "#fff", strokeWidth: 1 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-slate-600">{trend.summary}</p>
    </section>
  )
}

function SubjectShareCard({ weakPoints }: { weakPoints: WrongQuestionReport["weakPoints"] }) {
  const totals = new Map<string, number>()
  for (const wp of weakPoints) {
    totals.set(wp.subject, (totals.get(wp.subject) ?? 0) + wp.occurrences)
  }
  const data = Array.from(totals.entries())
    .map(([subject, count]) => ({ subject, count }))
    .sort((a, b) => b.count - a.count)

  if (data.length === 0) return null

  const total = data.reduce((sum, d) => sum + d.count, 0)

  return (
    <section className="flex-1 min-w-0 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <div className="h-3 w-1 rounded-full bg-indigo-500" />
        <h3 className="text-sm font-bold text-slate-800">学科占比</h3>
      </div>
      <div className="h-32 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="subject"
              cx="50%"
              cy="50%"
              innerRadius={28}
              outerRadius={52}
              paddingAngle={2}
              stroke="#fff"
              strokeWidth={2}
            >
              {data.map((d) => (
                <Cell key={d.subject} fill={SUBJECT_HEX[d.subject] ?? "#94A3B8"} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, _name, item) => {
                const n = typeof value === "number" ? value : Number(value) || 0
                const subject = (item as { payload?: { subject?: string } } | undefined)?.payload?.subject ?? ""
                return [`${n} 道（${Math.round((n / total) * 100)}%）`, subject]
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-2 space-y-1">
        {data.map((d) => (
          <li key={d.subject} className="flex items-center gap-1.5 text-[11px] text-slate-600">
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: SUBJECT_HEX[d.subject] ?? "#94A3B8" }}
            />
            <span className="flex-1">{d.subject}</span>
            <span className="tabular-nums text-slate-500">
              {d.count} · {Math.round((d.count / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function MoreToPracticeCard({
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
          其他薄弱点（{others.length}）
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

export default function WrongQuestionReportView({ report }: Props) {
  const focusKPs = new Set(report.focusPicks.map((fp) => fp.knowledgePoint))
  const [taskState, setTaskState] = useState<Record<string, true>>({})
  const totalErrorCount = report.weakPoints.reduce((sum, wp) => sum + wp.occurrences, 0)
  const subjectsCount = new Set(report.weakPoints.map((wp) => wp.subject)).size

  useEffect(() => {
    setTaskState(readTaskState(report.generatedAt))
  }, [report.generatedAt])

  function toggleTask(taskId: string) {
    const next = !taskState[taskId]
    setTaskDone(report.generatedAt, taskId, next)
    setTaskState((prev) => {
      const copy = { ...prev }
      if (next) copy[taskId] = true
      else delete copy[taskId]
      return copy
    })
  }

  return (
    <div className="space-y-3">
      <HeroSignalsBar
        progressSignal={report.progressSignal}
        gapSignal={report.gapSignal}
      />

      <TodayPickCard todayPick={report.todayPick} taskState={taskState} />

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-3 w-1 rounded-full bg-indigo-500" />
          <h2 className="text-sm font-bold text-slate-800">本周聚焦</h2>
        </div>
        {report.focusPicks.map((pick, i) => (
          <FocusCard
            key={i}
            pick={pick}
            index={i}
            taskState={taskState}
            onToggle={toggleTask}
          />
        ))}
      </div>

      <div className="flex flex-row gap-3">
        <WeeklyTrendCard trend={report.weeklyTrend} />
        <SubjectShareCard weakPoints={report.weakPoints} />
      </div>
      <MoreToPracticeCard weakPoints={report.weakPoints} focusKnowledgePoints={focusKPs} />

      <footer className="pt-2 pb-4 text-center text-[11px] text-slate-400 leading-relaxed">
        <p>本月一共 {totalErrorCount} 道错题，覆盖 {subjectsCount} 个学科</p>
        <p>下次错题进来，会自动加进这份报告</p>
      </footer>
    </div>
  )
}
