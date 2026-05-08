"use client"

import { useEffect, useState } from "react"
import type { WrongQuestionReport, FocusPick } from "@/lib/reportTypes"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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

function IconCheck({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 11 8 15 16 6" />
    </svg>
  )
}

function IconAlert({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2.5 L18 16 H2 Z" />
      <line x1="10" y1="8" x2="10" y2="12" />
      <circle cx="10" cy="14.5" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

function IconBolt({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path d="M11 2 L4 12 H9 L8 18 L16 7 H11 Z" />
    </svg>
  )
}

function IconClock({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="7.2" />
      <polyline points="10 6 10 10 13 11.5" />
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

function IconChevron({ open, className = "" }: { open: boolean; className?: string }) {
  return (
    <svg
      className={`${className} transition-transform ${open ? "rotate-180" : ""}`}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="5 8 10 13 15 8" />
    </svg>
  )
}

function TopPattern({ topPattern }: { topPattern: string }) {
  if (!topPattern) return null
  return (
    <p className="text-sm leading-relaxed text-slate-700">{topPattern}</p>
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
  subject,
  onClick,
}: {
  src: string
  alt: string
  subject: string
  onClick: () => void
}) {
  const [errored, setErrored] = useState(false)
  const accentColor = SUBJECT_HEX[subject] ?? "#94A3B8"
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-white transition hover:border-indigo-400 hover:ring-2 hover:ring-indigo-100"
      style={errored ? { borderLeftWidth: "3px", borderLeftColor: accentColor } : undefined}
      aria-label={`查看原题 ${alt}`}
    >
      {errored ? (
        <div className="flex h-full w-full flex-col items-center justify-center bg-white px-1 text-center leading-tight">
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke={accentColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <span className="mt-0.5 text-[8px] text-slate-500" style={{ wordBreak: "break-all" }}>
            {alt.replace(/\.\w+$/, "")}
          </span>
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

function formatMonthDay(iso: string): string {
  const [, m, d] = iso.split("-")
  return `${parseInt(m, 10)}/${parseInt(d, 10)}`
}

function QuestionBlock({
  excerpt,
  questionDate,
  fileRefs,
  onPreview,
}: {
  excerpt: string
  questionDate: string
  fileRefs: string[]
  onPreview: (src: string, alt: string) => void
}) {
  const [imgErrored, setImgErrored] = useState(false)
  const primary = fileRefs[0]
  const primarySrc = primary ? `/api/uploads/${encodeURIComponent(primary)}` : null
  return (
    <div className="mb-3 rounded-xl border border-slate-200 bg-white p-3">
      <div className="mb-1.5 flex items-baseline gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">题目</span>
        <span className="text-[10px] tabular-nums text-slate-400">{formatMonthDay(questionDate)}</span>
      </div>
      <p className="text-[15px] font-semibold leading-snug text-slate-800" style={{ fontFamily: "'JetBrains Mono', 'Menlo', 'Cambria Math', serif" }}>
        {excerpt}
      </p>
      {primarySrc && !imgErrored && (
        <button
          type="button"
          onClick={() => onPreview(primarySrc, primary!)}
          className="mt-3 block w-full overflow-hidden rounded-lg border border-slate-100 bg-slate-50 hover:border-indigo-300"
          aria-label={`查看原题 ${primary}`}
        >
          <img
            src={primarySrc}
            alt={primary!}
            className="h-auto max-h-40 w-full object-contain"
            onError={() => setImgErrored(true)}
          />
        </button>
      )}
    </div>
  )
}

function Diagnosis({
  stepDiagnosis,
  closingLine,
}: {
  stepDiagnosis: string
  closingLine: string
}) {
  return (
    <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
          <IconAlert className="h-2.5 w-2.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">错因回顾</p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-700">{stepDiagnosis}</p>
        </div>
      </div>
      <div className="mt-2.5 flex items-start gap-2 border-t border-slate-200 pt-2.5">
        <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
          <IconCheck className="h-2.5 w-2.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">解题要点</p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-700">{closingLine}</p>
        </div>
      </div>
    </div>
  )
}

function FocusCardBody({
  pick,
  taskState,
  onToggle,
  onPreview,
}: {
  pick: FocusPick
  taskState: Record<string, true>
  onToggle: (taskId: string) => void
  onPreview: (src: string, alt: string) => void
}) {
  // V11: 数字标号 / 信息 tooltip / 选取理由 已从渲染中删除。字段保留以兼容数据形状。
  return (
    <div className="p-5">
      <div className="mb-1 flex items-center gap-x-1.5 gap-y-0.5 flex-wrap text-[11px] text-slate-500">
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${SUBJECT_DOT[pick.subject] ?? "bg-slate-400"}`} />
        <span className="font-bold text-slate-700">{pick.subject}</span>
        <span className="text-slate-300">·</span>
        <span className="font-bold tabular-nums text-amber-700">错 {pick.errorCount} 次</span>
        <span className="text-slate-300">·</span>
        <span>涵盖 {pick.knowledgePoints.length} 个知识点</span>
        <span className="text-slate-300">·</span>
        <span>{pick.examWeightLabel}</span>
      </div>

      <p className="mb-3 text-[11px] italic leading-relaxed text-slate-500">{pick.goal}</p>

      <QuestionBlock
        excerpt={pick.excerpt}
        questionDate={pick.questionDate}
        fileRefs={pick.fileRefs}
        onPreview={onPreview}
      />

      <Diagnosis stepDiagnosis={pick.stepDiagnosis} closingLine={pick.closingLine} />

      <ul className="space-y-2">
        {pick.tasks.map((t) => {
          const isDone = !!taskState[t.id]
          return (
            <li key={t.id} id={`task-${t.id}`}>
              <button
                type="button"
                onClick={() => onToggle(t.id)}
                className="flex w-full items-start gap-2 rounded-lg border border-slate-200 bg-white p-2 text-left hover:border-indigo-300"
              >
                <span
                  className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                    isDone ? "border-indigo-500 bg-indigo-500 text-white" : "border-slate-300 bg-white"
                  }`}
                >
                  {isDone && <IconCheck className="h-2.5 w-2.5" />}
                </span>
                <span className={`flex-1 text-xs leading-relaxed ${isDone ? "text-slate-400 line-through" : "text-slate-700"}`}>
                  {t.text}
                </span>
                <span className={`inline-flex shrink-0 items-center gap-1 text-[10px] tabular-nums ${isDone ? "text-slate-300" : "text-slate-500"}`}>
                  <IconClock className="h-3 w-3" />
                  {t.durationMinutes} 分钟
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function FocusCard({
  pick,
  taskState,
  onToggle,
  onPreview,
}: {
  pick: FocusPick
  taskState: Record<string, true>
  onToggle: (taskId: string) => void
  onPreview: (src: string, alt: string) => void
}) {
  // V11: hero is the only kind of FocusCard now (backups use BackupCard wrapping FocusCardBody).
  return (
    <section className="overflow-hidden rounded-2xl border-2 border-indigo-300 bg-white shadow-md">
      <div className="flex items-center gap-1.5 bg-indigo-600 px-5 py-2">
        <IconBolt className="h-3.5 w-3.5 text-amber-300" />
        <span className="text-xs font-bold tracking-wide text-white">先做这件</span>
      </div>
      <FocusCardBody pick={pick} taskState={taskState} onToggle={onToggle} onPreview={onPreview} />
    </section>
  )
}

function BackupCard({
  pick,
  taskState,
  onToggle,
  onPreview,
}: {
  pick: FocusPick
  taskState: Record<string, true>
  onToggle: (taskId: string) => void
  onPreview: (src: string, alt: string) => void
}) {
  const truncated = pick.excerpt.length > 28 ? pick.excerpt.slice(0, 28) + "…" : pick.excerpt
  return (
    <details className="group overflow-hidden rounded-xl border border-slate-200 bg-slate-50 open:bg-white">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
        <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${SUBJECT_DOT[pick.subject] ?? "bg-slate-400"}`} />
        <span className="text-xs font-bold text-slate-700">{pick.subject}</span>
        <span className="text-[10px] tabular-nums text-amber-700">错 {pick.errorCount} 次</span>
        <span className="flex-1 truncate text-xs text-slate-600">{truncated}</span>
        <IconChevron open={false} className="h-3.5 w-3.5 shrink-0 text-slate-400 group-open:rotate-180" />
      </summary>
      <div className="border-t border-slate-200 bg-white">
        <FocusCardBody pick={pick} taskState={taskState} onToggle={onToggle} onPreview={onPreview} />
      </div>
    </details>
  )
}

function MonthlyErrorBreakdownCard({
  trend,
  weakPoints,
  focusKnowledgePoints,
  totalErrorCount,
  subjectsCount,
}: {
  trend: WrongQuestionReport["weeklyTrend"]
  weakPoints: WrongQuestionReport["weakPoints"]
  focusKnowledgePoints: Set<string>
  totalErrorCount: number
  subjectsCount: number
}) {
  const [open, setOpen] = useState(false)
  const others = weakPoints.filter((wp) => !focusKnowledgePoints.has(wp.knowledgePoint))

  // Build chart data: [{ week: "W1", 数学: 3, 物理: 1, ... }, ...]
  const subjects = trend.seriesBySubject.map((e) => e.subject)
  const data = trend.series.map((p, i) => {
    const row: Record<string, string | number> = { week: `W${p.week}` }
    for (const entry of trend.seriesBySubject) {
      row[entry.subject] = entry.counts[i] ?? 0
    }
    return row
  })

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <div className="h-3 w-1 rounded-full bg-indigo-500" />
        <h3 className="text-sm font-bold text-slate-800">
          本月错题分布{" "}
          <span className="font-normal text-slate-400">
            · 共 {totalErrorCount} 道 · {subjectsCount} 学科
          </span>
        </h3>
      </div>
      <div className="h-44 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="week" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {subjects.map((subject) => (
              <Bar
                key={subject}
                dataKey={subject}
                stackId="errors"
                fill={SUBJECT_HEX[subject] ?? "#94A3B8"}
                radius={[3, 3, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-slate-600">{trend.summary}</p>

      {others.length > 0 && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex w-full items-center gap-2 text-left"
          >
            <h4 className="flex-1 text-xs font-bold text-slate-600">
              次要错题（{others.length}）
            </h4>
            <IconChevron open={open} className="h-4 w-4 text-slate-400" />
          </button>
          {!open && (
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              次要不等于不重要，挨个收尾，不能跳过
            </p>
          )}
          {open && (
            <ul className="mt-2 space-y-1.5">
              {others.map((wp) => (
                <li
                  key={wp.knowledgePoint}
                  className="flex items-baseline gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5"
                >
                  <span
                    className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${SUBJECT_DOT[wp.subject] ?? "bg-slate-400"}`}
                  />
                  <span className="text-xs font-bold text-slate-700">{wp.knowledgePoint}</span>
                  <span className="text-[10px] tabular-nums text-slate-500">
                    {wp.subject} · 错 {wp.occurrences} 次
                  </span>
                  <span className="flex-1 truncate text-[11px] text-slate-500">{wp.diagnosis}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}

export default function WrongQuestionReportView({ report }: Props) {
  const focusKPs = new Set(
    [report.hero, ...report.backups].flatMap((fp) => fp.knowledgePoints),
  )
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
    <div className="space-y-4">
      <TopPattern topPattern={report.topPattern} />

      <FocusCard
        pick={report.hero}
        taskState={taskState}
        onToggle={toggleTask}
        onPreview={(src, alt) => setPreview({ src, alt })}
      />

      {report.backups.length > 0 && (
        <div className="space-y-2">
          {report.backups.map((pick, i) => (
            <BackupCard
              key={i}
              pick={pick}
              taskState={taskState}
              onToggle={toggleTask}
              onPreview={(src, alt) => setPreview({ src, alt })}
            />
          ))}
          <p className="pl-1 text-[11px] leading-relaxed text-slate-400">
            做完上面那道再翻这两张
          </p>
        </div>
      )}

      <MonthlyErrorBreakdownCard
        trend={report.weeklyTrend}
        weakPoints={report.weakPoints}
        focusKnowledgePoints={focusKPs}
        totalErrorCount={totalErrorCount}
        subjectsCount={subjectsCount}
      />

      <LightboxModal preview={preview} onClose={() => setPreview(null)} />
    </div>
  )
}
