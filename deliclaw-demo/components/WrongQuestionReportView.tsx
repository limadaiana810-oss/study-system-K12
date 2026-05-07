"use client"

import { useEffect, useState } from "react"
import type { WrongQuestionReport, FocusPick, TodayPick } from "@/lib/reportTypes"
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
          <h2 className="text-sm font-bold text-indigo-800">今天这件做完了</h2>
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
        <h2 className="text-sm font-bold text-indigo-900">现在做这一件</h2>
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
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">上次卡在哪里</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-700">{pick.stepDiagnosis}</p>
      </div>

      <div className="mb-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">这周怎么补</p>
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
        <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">下次再遇到</p>
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
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <div className="h-3 w-1 rounded-full bg-indigo-500" />
        <h3 className="text-sm font-bold text-slate-800">本月错题，一周一根</h3>
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
          还可以再练这些 ({others.length})
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

      <p className="text-center text-xs text-neutral-500 my-4">↓ 想看完整本周计划，往下翻</p>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-3 w-1 rounded-full bg-indigo-500" />
          <h2 className="text-sm font-bold text-slate-800">这周先拿下这道</h2>
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

      <WeeklyTrendCard trend={report.weeklyTrend} />
      <MoreToPracticeCard weakPoints={report.weakPoints} focusKnowledgePoints={focusKPs} />
    </div>
  )
}
