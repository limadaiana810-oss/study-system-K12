"use client"

import { useEffect, useState } from "react"
import type { WrongQuestionReport, FocusPick } from "@/lib/reportTypes"
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

function ThumbnailImage({
  src,
  alt,
  onClick,
}: {
  src: string
  alt: string
  onClick: () => void
}) {
  const [errored, setErrored] = useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-slate-200 transition hover:border-indigo-400 hover:ring-2 hover:ring-indigo-100"
      aria-label={`查看原题 ${alt}`}
    >
      {errored ? (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-1 text-center text-[8px] leading-tight text-slate-500">
          {alt}
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          onError={() => setErrored(true)}
        />
      )}
    </button>
  )
}

function LightboxModal({
  preview,
  onClose,
}: {
  preview: { src: string; alt: string } | null
  onClose: () => void
}) {
  useEffect(() => {
    if (!preview) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [preview, onClose])

  if (!preview) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        aria-label="关闭"
      >
        ✕
      </button>
      <img
        src={preview.src}
        alt={preview.alt}
        className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/70">{preview.alt}</p>
    </div>
  )
}

function FocusCard({
  pick,
  index,
  taskState,
  onToggle,
  onPreview,
  isHero,
}: {
  pick: FocusPick
  index: number
  taskState: Record<string, true>
  onToggle: (taskId: string) => void
  onPreview: (src: string, alt: string) => void
  isHero: boolean
}) {
  function jumpToFirstTask() {
    const first = pick.tasks[0]
    if (!first) return
    scrollToTask(first.id)
  }

  const numberLabel = ["❶", "❷", "❸"][index] ?? `#${index + 1}`

  const sectionClass = isHero
    ? "overflow-hidden rounded-2xl border-2 border-indigo-300 bg-gradient-to-br from-indigo-50 to-white shadow-md"
    : "overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/40 shadow-sm"

  return (
    <section className={sectionClass}>
      {isHero && (
        <div className="flex items-center gap-2 bg-indigo-600 px-5 py-2">
          <span className="text-sm">⚡</span>
          <span className="text-xs font-bold tracking-wide text-white">先做这件</span>
        </div>
      )}
      <div className="p-5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold tabular-nums text-amber-700">
          错 {pick.errorCount} 次 · {pick.examWeightLabel}
        </span>
        <span className="shrink-0 text-[10px] text-slate-400">
          <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${SUBJECT_DOT[pick.subject] ?? "bg-slate-400"}`} />
          {pick.subject}
        </span>
      </div>

      <div className="mb-3 flex items-baseline gap-2">
        <span className="text-lg font-black text-indigo-600">{numberLabel}</span>
        <h3 className="flex-1 text-sm font-bold leading-relaxed text-slate-800">{pick.goal}</h3>
      </div>

      <div className="mb-3 rounded-xl border border-slate-100 bg-white/70 p-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">错因回顾</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-700">{pick.stepDiagnosis}</p>
      </div>

      {pick.fileRefs.length > 0 && (
        <div className="mb-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">原题</p>
          <div className="flex flex-wrap gap-2">
            {pick.fileRefs.map((f) => {
              const src = `/api/uploads/${encodeURIComponent(f)}`
              return (
                <ThumbnailImage
                  key={f}
                  src={src}
                  alt={f}
                  onClick={() => onPreview(src, f)}
                />
              )
            })}
          </div>
        </div>
      )}

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
      </div>
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
    <section className="rounded-2xl border border-amber-200 bg-amber-50/30 p-4 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 text-left"
      >
        <div className="h-3 w-1 rounded-full bg-amber-400" />
        <h3 className="flex-1 text-sm font-bold text-amber-700">
          次要错题（{others.length}）
        </h3>
        <span className="text-xs text-amber-600">{open ? "▴" : "▾"}</span>
      </button>
      {!open && (
        <p className="mt-1 ml-3 text-[11px] leading-relaxed text-amber-700/70">
          次要不等于不重要，挨个收尾，不能跳过
        </p>
      )}
      {open && (
        <div className="mt-3 space-y-2">
          {others.map((wp) => (
            <div key={wp.knowledgePoint} className="rounded-xl border border-amber-100 bg-white p-3">
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
  const [preview, setPreview] = useState<{ src: string; alt: string } | null>(null)
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
            onPreview={(src, alt) => setPreview({ src, alt })}
            isHero={i === 0}
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

      <LightboxModal preview={preview} onClose={() => setPreview(null)} />
    </div>
  )
}
