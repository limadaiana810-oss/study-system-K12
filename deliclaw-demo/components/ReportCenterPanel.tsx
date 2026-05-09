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
import PrintPreviewModal from "./PrintPreviewModal"

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
      typeof r.topPattern === "string" &&
      !!r.hero &&
      typeof r.hero === "object" &&
      Array.isArray(r.backups) &&
      !!r.weeklyTrend &&
      Array.isArray(r.weeklyTrend.series) &&
      Array.isArray(r.weeklyTrend.seriesBySubject) &&
      typeof r.weeklyTrend.summary === "string" &&
      Array.isArray(r.weakPoints)
    )
  }
  const r = report as GrowthReport
  return (
    typeof r.topInsight === "string" &&
    typeof r.thisWeekAction === "string" &&
    typeof r.focusSubject === "string" &&
    !!r.trajectory &&
    Array.isArray(r.scores) &&
    r.scores.every(
      (s) =>
        Array.isArray(s.weeklyHomeworkAvg) &&
        s.weeklyHomeworkAvg.length === 4 &&
        Array.isArray(s.weeklyExamAvg) &&
        s.weeklyExamAvg.length === 4 &&
        Array.isArray(s.weeklyErrorCount) &&
        s.weeklyErrorCount.length === 4,
    ) &&
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
  const [printOpen, setPrintOpen] = useState(false)

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
    <div
      className="paper-tooth"
      style={{
        display: "flex",
        minHeight: 0,
        flex: 1,
        flexDirection: "column",
        background: "var(--wash-paper)",
        fontFamily: "var(--font-body)",
        color: "var(--ink-1)",
      }}
    >
      {/* Tabs */}
      <div
        style={{
          flexShrink: 0,
          borderBottom: "1px solid var(--rule)",
          background: "var(--paper)",
          padding: "12px 24px",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            padding: 3,
            border: "1px solid var(--rule)",
            background: "var(--card)",
            borderRadius: 999,
          }}
        >
          {(["wrong-questions", "growth"] as ReportType[]).map((t) => {
            const label = t === "wrong-questions" ? "错题报告" : "成长报告"
            const isActive = active === t
            return (
              <button
                key={t}
                type="button"
                onClick={() => setActive(t)}
                style={{
                  padding: "5px 16px",
                  borderRadius: 999,
                  border: 0,
                  background: isActive ? "var(--ink-1)" : "transparent",
                  color: isActive ? "#fff" : "var(--ink-3)",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all .15s",
                  fontFamily: "var(--font-body)",
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Body */}
      <div
        style={{
          minHeight: 0,
          flex: 1,
          overflowY: "auto",
          padding: "20px 24px 48px",
        }}
      >
        {status === "idle" && (
          <EmptyState onGenerate={generate} reportType={active} />
        )}
        {status === "loading" && <LoadingState />}
        {status === "error" && <ErrorState message={errMsg} onRetry={generate} />}
        {status === "ready" && report && isValidReport(report, active) && (
          <div style={{ margin: "0 auto", maxWidth: 768, display: "grid", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p
                className="num"
                style={{
                  margin: 0,
                  fontSize: 10,
                  color: "var(--ink-4)",
                  letterSpacing: "0.04em",
                }}
              >
                生成于 {new Date(report.generatedAt).toLocaleString("zh-CN")}
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setPrintOpen(true)}
                  style={{
                    padding: "4px 12px",
                    borderRadius: "var(--r-sm)",
                    border: "1px solid var(--rule)",
                    background: "transparent",
                    color: "var(--ink-3)",
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  打印
                </button>
                <button
                  onClick={regenerate}
                  style={{
                    padding: "4px 12px",
                    borderRadius: "var(--r-sm)",
                    border: "1px solid var(--rule)",
                    background: "transparent",
                    color: "var(--ink-3)",
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  重新生成
                </button>
              </div>
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

      {printOpen && status === "ready" && report && isValidReport(report, active) && (
        <PrintPreviewModal
          reportType={active}
          report={report}
          onClose={() => setPrintOpen(false)}
        />
      )}
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
    <div
      style={{
        margin: "48px auto 0",
        maxWidth: 480,
        padding: "32px 28px",
        textAlign: "center",
        border: "1px dashed var(--rule)",
        background: "var(--card)",
        borderRadius: "var(--r-xl)",
      }}
    >
      <div
        style={{
          margin: "0 auto 14px",
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "var(--brand-paper)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="1.6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-6h13M9 5v6m0-6L4 11l5 6" />
        </svg>
      </div>
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-display)",
          fontSize: 18,
          fontWeight: 500,
          color: "var(--ink-1)",
          letterSpacing: "-0.005em",
        }}
      >
        {title}
      </p>
      <p
        style={{
          margin: "8px auto 0",
          maxWidth: 360,
          fontSize: 12,
          lineHeight: 1.6,
          color: "var(--ink-3)",
        }}
      >
        {desc}
      </p>
      <button
        onClick={onGenerate}
        style={{
          marginTop: 20,
          padding: "8px 18px",
          borderRadius: "var(--r-md)",
          background: "var(--ink-1)",
          color: "#fff",
          border: 0,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.04em",
          cursor: "pointer",
          fontFamily: "var(--font-body)",
        }}
      >
        生成报告
      </button>
    </div>
  )
}

function LoadingState() {
  return (
    <div style={{ margin: "0 auto", maxWidth: 768, display: "grid", gap: 12 }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="animate-pulse"
          style={{
            height: 128,
            borderRadius: "var(--r-xl)",
            background: "var(--card)",
            border: "1px solid var(--rule-soft)",
          }}
        />
      ))}
      <p style={{ textAlign: "center", fontSize: 12, color: "var(--ink-4)", margin: 0 }}>
        AI 正在分析…
      </p>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      style={{
        margin: "48px auto 0",
        maxWidth: 480,
        padding: "24px 24px",
        textAlign: "center",
        background: "var(--card)",
        border: "1px solid var(--rose)",
        borderRadius: "var(--r-xl)",
      }}
    >
      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--rose)" }}>生成失败</p>
      <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--ink-3)" }}>{message}</p>
      <button
        onClick={onRetry}
        style={{
          marginTop: 16,
          padding: "8px 18px",
          borderRadius: "var(--r-md)",
          background: "var(--rose)",
          color: "#fff",
          border: 0,
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "var(--font-body)",
        }}
      >
        重试
      </button>
    </div>
  )
}
