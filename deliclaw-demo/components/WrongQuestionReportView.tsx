"use client"

import { useEffect, useState } from "react"
import type { CSSProperties } from "react"
import type { WrongQuestionReport, FocusPick } from "@/lib/reportTypes"
import { readTaskState, setTaskDone } from "@/lib/reportTaskState"

interface Props {
  report: WrongQuestionReport
  printMode?: boolean
}

const SUBJECT_HEX: Record<string, string> = {
  数学: "var(--s-math)",
  物理: "var(--s-physics)",
  英语: "var(--s-english)",
  化学: "var(--s-chemistry)",
  语文: "var(--s-chinese)",
}

function SubjectDot({ subject, size = 8 }: { subject: string; size?: number }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: SUBJECT_HEX[subject] ?? "var(--ink-4)",
        flexShrink: 0,
      }}
    />
  )
}

function IconChevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        width: 10,
        height: 10,
        transform: open ? "rotate(180deg)" : "none",
        transition: "transform .2s",
      }}
    >
      <polyline points="5 8 10 13 15 8" />
    </svg>
  )
}

function formatMonthDay(iso: string): string {
  const [, m, d] = iso.split("-")
  return `${parseInt(m, 10)}/${parseInt(d, 10)}`
}

function formatMonthLabel(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return `${d.getFullYear()} · ${d.getMonth() + 1}月`
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
  const accent = SUBJECT_HEX[subject] ?? "var(--ink-4)"
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`查看原题 ${alt}`}
      style={{
        position: "relative",
        height: 64,
        width: 64,
        flexShrink: 0,
        overflow: "hidden",
        borderRadius: "var(--r-md)",
        border: errored ? `1px solid var(--rule)` : "1px solid var(--rule)",
        borderLeft: errored ? `3px solid ${accent}` : "1px solid var(--rule)",
        background: "var(--card)",
        cursor: "pointer",
        padding: 0,
      }}
    >
      {errored ? (
        <div
          style={{
            display: "flex",
            height: "100%",
            width: "100%",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 4px",
            textAlign: "center",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.6">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <span style={{ marginTop: 2, fontSize: 8, color: "var(--ink-3)", wordBreak: "break-all" }}>
            {alt.replace(/\.\w+$/, "")}
          </span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          style={{ height: "100%", width: "100%", objectFit: "cover" }}
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
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(26,26,31,.86)",
        padding: 16,
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="关闭"
        style={{
          position: "absolute",
          right: 16,
          top: 16,
          width: 36,
          height: 36,
          borderRadius: "50%",
          border: 0,
          background: "rgba(255,255,255,.1)",
          color: "#fff",
          fontSize: 16,
          cursor: "pointer",
        }}
      >
        ✕
      </button>
      <img
        src={preview.src}
        alt={preview.alt}
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: "90vh", maxWidth: "90vw", objectFit: "contain", borderRadius: "var(--r-md)" }}
      />
      <p
        style={{
          position: "absolute",
          bottom: 16,
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: 11,
          color: "rgba(255,255,255,.7)",
          fontFamily: "var(--font-num)",
        }}
      >
        {preview.alt}
      </p>
    </div>
  )
}

function TopPattern({ topPattern }: { topPattern: string }) {
  if (!topPattern) return null
  return (
    <p
      style={{
        fontFamily: "var(--font-display)",
        fontSize: 26,
        lineHeight: 1.45,
        fontWeight: 400,
        color: "var(--ink-1)",
        margin: "20px 0 0",
        letterSpacing: "-0.01em",
        maxWidth: 620,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 48,
          lineHeight: 0.5,
          color: "var(--clay)",
          verticalAlign: "-0.05em",
          marginRight: 4,
        }}
      >
        “
      </span>
      {topPattern}
    </p>
  )
}

function QuestionBlock({
  excerpt,
  questionDate,
  fileRefs,
  subject,
  onPreview,
}: {
  excerpt: string
  questionDate: string
  fileRefs: string[]
  subject: string
  onPreview: (src: string, alt: string) => void
}) {
  const [imgErrored, setImgErrored] = useState(false)
  const primary = fileRefs[0]
  const primarySrc = primary ? `/api/uploads/${encodeURIComponent(primary)}` : null
  return (
    <div
      style={{
        marginTop: 22,
        border: "1px solid var(--rule)",
        borderLeft: "3px solid var(--clay)",
        background: "var(--card-warm)",
        padding: "18px 20px 18px 22px",
        borderRadius: "var(--r-md)",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
        <span
          style={{
            fontSize: 10,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            fontWeight: 800,
            color: "var(--ink-3)",
          }}
        >
          题目
        </span>
        <span className="num" style={{ fontSize: 11, color: "var(--ink-4)" }}>
          {formatMonthDay(questionDate)}
        </span>
      </div>
      <p
        style={{
          margin: 0,
          fontFamily: "var(--mono)",
          fontSize: 15,
          fontWeight: 500,
          lineHeight: 1.55,
          color: "var(--ink-1)",
        }}
      >
        {excerpt}
      </p>
      {primarySrc && !imgErrored && (
        <button
          type="button"
          onClick={() => onPreview(primarySrc, primary!)}
          aria-label={`查看原题 ${primary}`}
          style={{
            marginTop: 12,
            display: "block",
            width: "100%",
            border: "1px solid var(--rule)",
            background: "var(--card)",
            borderRadius: "var(--r-md)",
            overflow: "hidden",
            padding: 0,
            cursor: "pointer",
          }}
        >
          <img
            src={primarySrc}
            alt={primary!}
            style={{ display: "block", maxHeight: 160, width: "100%", objectFit: "contain" }}
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
  const labelStyle: CSSProperties = {
    fontSize: 10,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    fontWeight: 800,
    color: "var(--ink-3)",
  }
  const dot = (bg: string, ch: string): CSSProperties => ({
    width: 14,
    height: 14,
    borderRadius: "50%",
    background: bg,
    color: "#fff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 9,
    fontWeight: 800,
  })
  return (
    <div
      style={{
        marginTop: 18,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 0,
        border: "1px solid var(--rule)",
        borderRadius: "var(--r-md)",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "14px 18px", background: "var(--card)", borderRight: "1px solid var(--rule)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <span style={dot("var(--rose)", "!")}>!</span>
          <span style={labelStyle}>错因回顾</span>
        </div>
        <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: "var(--ink-2)" }}>{stepDiagnosis}</p>
      </div>
      <div style={{ padding: "14px 18px", background: "var(--card)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <span style={dot("var(--sage)", "✓")}>✓</span>
          <span style={labelStyle}>解题要点</span>
        </div>
        <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: "var(--ink-2)" }}>{closingLine}</p>
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
  return (
    <div style={{ padding: "26px 28px 24px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          fontSize: 12,
          color: "var(--ink-2)",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700 }}>
          <SubjectDot subject={pick.subject} size={9} />
          {pick.subject}
        </span>
        <span style={{ color: "var(--rule)" }}>/</span>
        <span className="num" style={{ fontWeight: 600, color: "var(--clay)" }}>
          错 {pick.errorCount} 次
        </span>
        <span style={{ color: "var(--rule)" }}>/</span>
        <span>涵盖 {pick.knowledgePoints.length} 个知识点</span>
        <span style={{ color: "var(--rule)" }}>/</span>
        <span style={{ background: "var(--paper)", padding: "1px 8px", borderRadius: 999, color: "var(--amber)", fontWeight: 600 }}>
          {pick.examWeightLabel}
        </span>
      </div>

      <p
        style={{
          margin: "8px 0 0",
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          fontWeight: 400,
          fontSize: 14,
          color: "var(--ink-3)",
          lineHeight: 1.5,
        }}
      >
        {pick.goal}
      </p>

      <QuestionBlock
        excerpt={pick.excerpt}
        questionDate={pick.questionDate}
        fileRefs={pick.fileRefs}
        subject={pick.subject}
        onPreview={onPreview}
      />

      <Diagnosis stepDiagnosis={pick.stepDiagnosis} closingLine={pick.closingLine} />

      <div style={{ marginTop: 18 }}>
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            fontWeight: 800,
            color: "var(--ink-3)",
            marginBottom: 8,
          }}
        >
          本日重做任务
        </div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
          {pick.tasks.map((t) => {
            const isDone = !!taskState[t.id]
            return (
              <li key={t.id} id={`task-${t.id}`}>
                <button
                  type="button"
                  onClick={() => onToggle(t.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    width: "100%",
                    textAlign: "left",
                    padding: "11px 14px",
                    background: isDone ? "var(--card-warm)" : "var(--card)",
                    border: "1px solid var(--rule)",
                    borderRadius: "var(--r-md)",
                    transition: "all .15s",
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 5,
                      border: isDone ? "0" : "1.5px solid var(--ink-4)",
                      background: isDone ? "var(--brand)" : "transparent",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {isDone && <span style={{ color: "#fff", fontSize: 11, fontWeight: 800 }}>✓</span>}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      fontSize: 13,
                      lineHeight: 1.5,
                      color: isDone ? "var(--ink-4)" : "var(--ink-1)",
                      textDecoration: isDone ? "line-through" : "none",
                    }}
                  >
                    {t.text}
                  </span>
                  <span
                    className="num"
                    style={{ fontSize: 12, color: "var(--ink-3)", flexShrink: 0 }}
                  >
                    {t.durationMinutes} 分钟
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
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
  return (
    <section
      className="ink-splash border-2 print-card"
      style={{
        marginTop: 28,
        background: "var(--card)",
        border: "2px solid var(--rule)",
        borderRadius: "var(--r-xl)",
        overflow: "hidden",
        boxShadow: "var(--shadow-2)",
        position: "relative",
      }}
    >
      <div
        className="ink-splash"
        style={{
          background: "var(--wash-brand)",
          color: "#fff",
          padding: "14px 28px",
          display: "flex",
          alignItems: "center",
          gap: 14,
          position: "relative",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontWeight: 400,
            fontSize: 14,
            letterSpacing: "0.02em",
            color: "#FFD8B5",
          }}
        >
          Today&apos;s one thing
        </div>
        <div style={{ width: 1, height: 14, background: "rgba(255,255,255,.25)" }} />
        <div
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.02em",
          }}
        >
          先做这件
        </div>
        <div
          style={{
            marginLeft: "auto",
            fontFamily: "var(--font-num)",
            fontSize: 12,
            color: "rgba(255,255,255,.6)",
          }}
        >
          预计{" "}
          {pick.tasks.reduce((s, t) => s + t.durationMinutes, 0)} 分钟
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 28, padding: "0 32px" }}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 96,
            lineHeight: 0.85,
            fontWeight: 300,
            color: "var(--clay)",
            letterSpacing: "-0.04em",
            paddingTop: 28,
            alignSelf: "start",
          }}
        >
          01
        </div>
        <FocusCardBody pick={pick} taskState={taskState} onToggle={onToggle} onPreview={onPreview} />
      </div>
    </section>
  )
}

function BackupCard({
  pick,
  taskState,
  onToggle,
  onPreview,
  idx,
  printMode,
}: {
  pick: FocusPick
  taskState: Record<string, true>
  onToggle: (taskId: string) => void
  onPreview: (src: string, alt: string) => void
  idx: number
  printMode?: boolean
}) {
  const truncated = pick.excerpt.length > 22 ? pick.excerpt.slice(0, 22) + "…" : pick.excerpt
  return (
    <details
      className="print-card"
      open={printMode || undefined}
      style={{
        background: "var(--card)",
        border: "1px solid var(--rule)",
        borderRadius: "var(--r-lg)",
        overflow: "hidden",
        height: "100%",
      }}
    >
      <summary
        style={{
          listStyle: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 22,
            fontWeight: 300,
            color: "var(--ink-3)",
            letterSpacing: "-0.02em",
            minWidth: 22,
          }}
        >
          0{idx}
        </span>
        <SubjectDot subject={pick.subject} />
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)" }}>{pick.subject}</span>
        <span className="num" style={{ fontSize: 11, color: "var(--clay)", fontWeight: 600 }}>
          错 {pick.errorCount} 次
        </span>
        <span
          style={{
            flex: 1,
            fontSize: 12,
            color: "var(--ink-3)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {truncated}
        </span>
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            border: "1px solid var(--rule)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--ink-3)",
          }}
        >
          <IconChevron open={false} />
        </span>
      </summary>
      <div style={{ borderTop: "1px solid var(--rule-soft)" }}>
        <FocusCardBody pick={pick} taskState={taskState} onToggle={onToggle} onPreview={onPreview} />
      </div>
    </details>
  )
}

function MonthlyChart({ trend }: { trend: WrongQuestionReport["weeklyTrend"] }) {
  const W = 560,
    H = 200,
    padL = 44,
    padR = 12,
    padT = 10,
    padB = 36
  const totals = trend.series.map((_, i) =>
    trend.seriesBySubject.reduce((s, e) => s + (e.counts[i] ?? 0), 0),
  )
  const max = Math.max(5, ...totals)
  const yTicks = [0, Math.ceil(max / 2), max]
  const innerW = W - padL - padR
  const innerH = H - padT - padB
  const barW = (innerW / Math.max(1, trend.series.length)) * 0.42
  const xFor = (i: number) => padL + (i + 0.5) * (innerW / Math.max(1, trend.series.length))
  const yFor = (v: number) => padT + innerH - (v / max) * innerH

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 200, display: "block" }}>
      {yTicks.map((t) => (
        <g key={t}>
          <line
            x1={padL}
            x2={W - padR}
            y1={yFor(t)}
            y2={yFor(t)}
            stroke="var(--rule)"
            strokeDasharray={t === 0 ? "0" : "2 4"}
          />
          <text
            x={padL - 8}
            y={yFor(t) + 3}
            textAnchor="end"
            fontSize="10"
            fontFamily="var(--font-num)"
            fill="var(--ink-3)"
          >
            {t}
          </text>
        </g>
      ))}
      {trend.series.map((p, i) => {
        let acc = 0
        return (
          <g key={i}>
            {trend.seriesBySubject.map((entry) => {
              const v = entry.counts[i] ?? 0
              if (v === 0) return null
              const y0 = yFor(acc + v)
              const y1 = yFor(acc)
              acc += v
              return (
                <rect
                  key={entry.subject}
                  x={xFor(i) - barW / 2}
                  y={y0}
                  width={barW}
                  height={y1 - y0}
                  fill={SUBJECT_HEX[entry.subject] ?? "var(--ink-4)"}
                  rx="2"
                />
              )
            })}
            <text
              x={xFor(i)}
              y={yFor(totals[i]) - 6}
              textAnchor="middle"
              fontSize="11"
              fontFamily="var(--font-num)"
              fontWeight="600"
              fill="var(--ink-2)"
            >
              {totals[i]}
            </text>
            <text
              x={xFor(i)}
              y={H - padB + 18}
              textAnchor="middle"
              fontSize="11"
              fontFamily="var(--font-display)"
              fill="var(--ink-3)"
            >
              第 {p.week} 周
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function MonthlyErrorBreakdownCard({
  trend,
  weakPoints,
  focusKnowledgePoints,
  totalErrorCount,
  subjectsCount,
  printMode,
}: {
  trend: WrongQuestionReport["weeklyTrend"]
  weakPoints: WrongQuestionReport["weakPoints"]
  focusKnowledgePoints: Set<string>
  totalErrorCount: number
  subjectsCount: number
  printMode?: boolean
}) {
  const [open, setOpen] = useState(printMode ?? false)
  const others = weakPoints.filter((wp) => !focusKnowledgePoints.has(wp.knowledgePoint))

  return (
    <section
      className="print-card"
      style={{
        marginTop: 28,
        background: "var(--card)",
        border: "1px solid var(--rule)",
        borderRadius: "var(--r-xl)",
        padding: "24px 28px 22px",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 4 }}>
        <h3
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontSize: 22,
            fontWeight: 500,
            color: "var(--ink-1)",
            letterSpacing: "-0.01em",
          }}
        >
          本月错题分布
        </h3>
        <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
          共{" "}
          <span className="num" style={{ fontWeight: 600, color: "var(--ink-2)" }}>
            {totalErrorCount}
          </span>{" "}
          道 · {subjectsCount} 学科
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 24,
          alignItems: "start",
        }}
      >
        <MonthlyChart trend={trend} />
        <div style={{ minWidth: 140, paddingTop: 14 }}>
          {trend.seriesBySubject.map((entry) => {
            const count = entry.counts.reduce((a, b) => a + b, 0)
            return (
              <div
                key={entry.subject}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "5px 0",
                  borderBottom: "1px dashed var(--rule)",
                  fontSize: 12,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: SUBJECT_HEX[entry.subject] ?? "var(--ink-4)",
                  }}
                />
                <span style={{ flex: 1, color: "var(--ink-2)" }}>{entry.subject}</span>
                <span className="num" style={{ color: "var(--ink-1)", fontWeight: 600 }}>
                  {count}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <p
        style={{
          margin: "16px 0 0",
          padding: "12px 14px",
          background: "var(--paper)",
          borderRadius: "var(--r-md)",
          fontSize: 12.5,
          lineHeight: 1.6,
          color: "var(--ink-2)",
        }}
      >
        {trend.summary}
      </p>

      {others.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 16px",
              background: "transparent",
              border: "1px solid var(--rule)",
              borderRadius: "var(--r-lg)",
              color: "var(--ink-2)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <span style={{ fontFamily: "var(--font-display)", fontStyle: "italic", color: "var(--ink-3)" }}>
              and the rest
            </span>
            <span style={{ flex: 1, textAlign: "left", color: "var(--ink-3)", fontWeight: 400, fontStyle: "italic" }}>
              次要错题（{others.length}） · 不重要不等于跳过
            </span>
            <IconChevron open={open} />
          </button>
          {open && (
            <ul style={{ listStyle: "none", padding: 0, margin: "10px 0 0", display: "grid", gap: 6 }}>
              {others.map((wp) => (
                <li
                  key={wp.knowledgePoint}
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 10,
                    padding: "10px 14px",
                    background: "var(--card)",
                    border: "1px solid var(--rule-soft)",
                    borderRadius: "var(--r-md)",
                    fontSize: 12.5,
                  }}
                >
                  <SubjectDot subject={wp.subject} size={7} />
                  <strong style={{ color: "var(--ink-1)", fontWeight: 700 }}>{wp.knowledgePoint}</strong>
                  <span className="num" style={{ color: "var(--ink-3)", fontSize: 11 }}>
                    {wp.subject} · 错 {wp.occurrences} 次
                  </span>
                  <span
                    style={{
                      flex: 1,
                      color: "var(--ink-3)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {wp.diagnosis}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}

export default function WrongQuestionReportView({ report, printMode }: Props) {
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
    <div
      className="paper-tooth"
      style={{
        background: "var(--wash-paper)",
        padding: "40px 44px 56px",
        minHeight: "100%",
        fontFamily: "var(--font-body)",
        color: "var(--ink-1)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--ink-3)",
          fontWeight: 700,
        }}
      >
        <span>错题周报</span>
        <span style={{ width: 14, height: 1, background: "var(--ink-4)" }} />
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            letterSpacing: "0.04em",
            textTransform: "none",
            fontWeight: 400,
            color: "var(--ink-3)",
          }}
        >
          Wrong Question Report
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontFamily: "var(--font-num)",
            fontWeight: 400,
            letterSpacing: "0.05em",
            color: "var(--ink-3)",
          }}
        >
          {formatMonthLabel(report.generatedAt)}
        </span>
      </div>

      <TopPattern topPattern={report.topPattern} />

      <FocusCard
        pick={report.hero}
        taskState={taskState}
        onToggle={toggleTask}
        onPreview={(src, alt) => setPreview({ src, alt })}
      />

      {report.backups.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              fontWeight: 800,
              color: "var(--ink-3)",
              paddingLeft: 4,
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 10,
            }}
          >
            <span>做完上面那道再翻这两张</span>
            <span style={{ flex: 1, height: 1, background: "var(--rule)" }} />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: printMode ? "1fr" : "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 10,
            }}
          >
            {report.backups.map((pick, i) => (
              <BackupCard
                key={i}
                pick={pick}
                idx={i + 2}
                taskState={taskState}
                onToggle={toggleTask}
                onPreview={(src, alt) => setPreview({ src, alt })}
                printMode={printMode}
              />
            ))}
          </div>
        </div>
      )}

      {printMode && <div className="print-page-break" aria-hidden="true" />}

      <MonthlyErrorBreakdownCard
        trend={report.weeklyTrend}
        weakPoints={report.weakPoints}
        focusKnowledgePoints={focusKPs}
        totalErrorCount={totalErrorCount}
        subjectsCount={subjectsCount}
        printMode={printMode}
      />

      {printMode && (
        <aside
          className="print-card"
          style={{
            marginTop: 24,
            padding: "20px 24px",
            background: "var(--card)",
            border: "1px solid var(--rule-soft)",
            borderRadius: "var(--r-md)",
            boxShadow: "var(--shadow-1)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 10,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              fontWeight: 700,
              color: "var(--ink-3)",
              marginBottom: 8,
            }}
          >
            DeliClaw · 周报附言
          </p>
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: 14,
              lineHeight: 1.7,
              color: "var(--ink-2)",
            }}
          >
            先把第一道做完，错过的地方我都帮你盯着 — 下周见。
          </p>
        </aside>
      )}

      <LightboxModal preview={preview} onClose={() => setPreview(null)} />
    </div>
  )
}
