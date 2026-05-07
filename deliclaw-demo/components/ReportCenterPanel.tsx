"use client"

import { useEffect, useState } from "react"
import type { MemoryEntry } from "@/types"
import type {
  GrowthReport,
  ReportType,
  WrongQuestionReport,
} from "@/lib/reportTypes"
import {
  clearCachedReport,
  readCachedReport,
  writeCachedReport,
} from "@/lib/reportCache"
import { clearTaskState } from "@/lib/reportTaskState"
import WrongQuestionReportView from "./WrongQuestionReportView"
import GrowthReportView from "./GrowthReportView"

type AnyReport = WrongQuestionReport | GrowthReport

interface Props {
  memory: MemoryEntry
}

type Status = "idle" | "loading" | "ready" | "error"

function isValidReport(report: AnyReport | null, type: ReportType): boolean {
  if (!report) return false
  if (type === "wrong-questions") {
    const r = report as WrongQuestionReport
    return (
      !!r.overview &&
      Array.isArray(r.overview.bySubject) &&
      Array.isArray(r.focusPicks) &&
      !!r.weeklyTrend &&
      Array.isArray(r.weeklyTrend.series) &&
      typeof r.weeklyTrend.summary === "string" &&
      Array.isArray(r.weakPoints)
    )
  }
  const r = report as GrowthReport
  return (
    !!r.trajectory &&
    Array.isArray(r.scores) &&
    Array.isArray(r.emotionTrend) &&
    Array.isArray(r.highlights) &&
    !!r.parentAdvice
  )
}

export default function ReportCenterPanel({ memory }: Props) {
  const [active, setActive] = useState<ReportType>("wrong-questions")
  const [report, setReport] = useState<AnyReport | null>(null)
  const [status, setStatus] = useState<Status>("idle")
  const [errMsg, setErrMsg] = useState<string>("")

  // When tab changes, load cached report (or reset to idle)
  useEffect(() => {
    const cached = readCachedReport(active)
    if (cached && isValidReport(cached, active)) {
      setReport(cached)
      setStatus("ready")
    } else {
      // Cached but malformed (e.g. partial write from earlier code path) — discard.
      if (cached) clearCachedReport(active)
      setReport(null)
      setStatus("idle")
    }
    setErrMsg("")
  }, [active])

  async function generate() {
    setStatus("loading")
    setErrMsg("")
    try {
      const res = await fetch(`/api/reports/${active}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memorySnapshot: memory }),
      })
      const json = await res.json()
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `HTTP ${res.status}`)
      }
      const r = json.report as AnyReport
      writeCachedReport(active, r)
      setReport(r)
      setStatus("ready")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "未知错误"
      setErrMsg(msg)
      setStatus("error")
    }
  }

  function regenerate() {
    clearCachedReport(active)
    if (active === "wrong-questions") clearTaskState()
    setReport(null)
    generate()
  }

  return (
    <div className="flex h-full flex-col bg-slate-50">
      {/* Tabs */}
      <div className="border-b border-slate-100 bg-white px-6 py-3">
        <div className="inline-flex rounded-xl border border-slate-100 bg-slate-50 p-1">
          {(["wrong-questions", "growth"] as ReportType[]).map((t) => {
            const label = t === "wrong-questions" ? "错题报告" : "成长报告"
            return (
              <button
                key={t}
                type="button"
                onClick={() => setActive(t)}
                className={`rounded-lg px-4 py-1.5 text-xs font-bold transition ${
                  active === t ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-indigo-600"
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {status === "idle" && (
          <EmptyState onGenerate={generate} reportType={active} />
        )}
        {status === "loading" && <LoadingState />}
        {status === "error" && <ErrorState message={errMsg} onRetry={generate} />}
        {status === "ready" && report && isValidReport(report, active) && (
          <div className="mx-auto max-w-3xl space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-slate-400">
                生成于 {new Date(report.generatedAt).toLocaleString("zh-CN")}
              </p>
              <button
                onClick={regenerate}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-500 hover:bg-slate-50"
              >
                重新生成
              </button>
            </div>
            {active === "wrong-questions" ? (
              <WrongQuestionReportView report={report as WrongQuestionReport} />
            ) : (
              <GrowthReportView report={report as GrowthReport} />
            )}
          </div>
        )}
        {status === "ready" && report && !isValidReport(report, active) && (
          <ErrorState
            message="缓存的报告格式异常，请重新生成。"
            onRetry={regenerate}
          />
        )}
      </div>
    </div>
  )
}

function EmptyState({ onGenerate, reportType }: { onGenerate: () => void; reportType: ReportType }) {
  const title = reportType === "wrong-questions" ? "错题分析报告" : "本月成长报告"
  const desc =
    reportType === "wrong-questions"
      ? "分析最近上传的错题，识别薄弱知识点，给出具体提分行动。"
      : "汇总本月学习轨迹、分数趋势与情绪表现，给家长一份直观的成长报告。"
  return (
    <div className="mx-auto mt-12 max-w-md rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50">
        <svg className="h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-6h13M9 5v6m0-6L4 11l5 6" />
        </svg>
      </div>
      <p className="text-base font-black text-slate-800">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-slate-500">{desc}</p>
      <button
        onClick={onGenerate}
        className="mt-5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
      >
        生成报告
      </button>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="mx-auto max-w-3xl space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-32 animate-pulse rounded-2xl bg-white" />
      ))}
      <p className="text-center text-xs text-slate-400">AI 正在分析…</p>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mx-auto mt-12 max-w-md rounded-2xl border border-red-100 bg-red-50/40 p-6 text-center">
      <p className="text-sm font-bold text-red-600">生成失败</p>
      <p className="mt-2 text-xs text-slate-600">{message}</p>
      <button
        onClick={onRetry}
        className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700"
      >
        重试
      </button>
    </div>
  )
}
