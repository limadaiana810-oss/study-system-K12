"use client"

import type { ReactNode } from "react"
import type { WrongQuestionReport, FocusPick } from "@/lib/reportTypes"

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

function formatMonthLabel(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return `${d.getFullYear()} · ${d.getMonth() + 1}月`
}

// ─────────────────────────────────────────────────────────
// Block heading（共用）
// ─────────────────────────────────────────────────────────
function BlockHeading({
  index,
  cn,
  en,
}: {
  index: string
  cn: string
  en: string
}) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 22, marginBottom: 10 }}>
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 28,
          fontWeight: 300,
          color: "var(--clay)",
          letterSpacing: "-0.04em",
          lineHeight: 1,
        }}
      >
        {index}
      </span>
      <h2
        style={{
          margin: 0,
          fontFamily: "var(--font-display)",
          fontSize: 18,
          fontWeight: 500,
          color: "var(--ink-1)",
          letterSpacing: "-0.01em",
        }}
      >
        {cn}
      </h2>
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          fontSize: 12,
          color: "var(--ink-4)",
          fontWeight: 400,
        }}
      >
        {en}
      </span>
      <span style={{ flex: 1, height: 1, background: "var(--rule)", marginLeft: 8 }} />
    </div>
  )
}

function SubCard({
  label,
  enLabel,
  children,
  accent,
}: {
  label: string
  enLabel?: string
  children: ReactNode
  accent?: string
}) {
  return (
    <section
      className="print-card"
      style={{
        marginTop: 10,
        background: "var(--card)",
        border: "1px solid var(--rule)",
        borderLeft: accent ? `3px solid ${accent}` : "1px solid var(--rule)",
        borderRadius: "var(--r-md)",
        padding: "12px 16px 14px",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
        <span
          style={{
            fontSize: 10.5,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--ink-3)",
            fontWeight: 700,
          }}
        >
          {label}
        </span>
        {enLabel && (
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: 11.5,
              color: "var(--ink-4)",
              fontWeight: 400,
            }}
          >
            {enLabel}
          </span>
        )}
      </div>
      {children}
    </section>
  )
}

// ─────────────────────────────────────────────────────────
// Block 1 · 错题翻一遍
// ─────────────────────────────────────────────────────────

function TodayWinsCard({ wins }: { wins: string[] }) {
  return (
    <SubCard label="你今天做对的事" enLabel="today's wins" accent="var(--sage)">
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 5 }}>
        {wins.map((w, i) => (
          <li
            key={i}
            style={{
              display: "flex",
              gap: 8,
              alignItems: "baseline",
              fontSize: 12.5,
              lineHeight: 1.55,
              color: "var(--ink-1)",
            }}
          >
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: "var(--sage)",
                color: "#fff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 9,
                fontWeight: 800,
                flexShrink: 0,
                marginTop: 1,
              }}
            >
              ✓
            </span>
            <span>{w}</span>
          </li>
        ))}
      </ul>
    </SubCard>
  )
}

function KeyErrorCard({ keyError }: { keyError: FocusPick }) {
  return (
    <SubCard label="这次最该回看的一道" enLabel="re-do this one" accent="var(--clay)">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          fontSize: 11.5,
          color: "var(--ink-2)",
          marginBottom: 6,
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontWeight: 700 }}>
          <SubjectDot subject={keyError.subject} size={8} />
          {keyError.subject}
        </span>
        <span style={{ color: "var(--rule)" }}>/</span>
        <span className="num" style={{ fontWeight: 600, color: "var(--clay)" }}>
          错 {keyError.errorCount} 次
        </span>
        <span style={{ color: "var(--rule)" }}>/</span>
        <span style={{ background: "var(--paper)", padding: "1px 7px", borderRadius: 999, color: "var(--amber)", fontWeight: 600, fontSize: 11 }}>
          {keyError.examWeightLabel}
        </span>
      </div>

      <p
        style={{
          margin: "0 0 6px",
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          fontSize: 13,
          color: "var(--ink-3)",
          lineHeight: 1.5,
        }}
      >
        {keyError.goal}
      </p>

      <p
        style={{
          margin: "0 0 6px",
          padding: "8px 12px",
          background: "var(--paper)",
          borderRadius: "var(--r-sm)",
          fontFamily: "var(--mono)",
          fontSize: 12.5,
          fontWeight: 500,
          lineHeight: 1.5,
          color: "var(--ink-1)",
        }}
      >
        {keyError.excerpt}
      </p>

      <div
        style={{
          padding: "10px 12px",
          background: "var(--card-warm)",
          borderRadius: "var(--r-sm)",
          fontSize: 12.5,
          lineHeight: 1.55,
          color: "var(--ink-1)",
          marginBottom: 6,
        }}
      >
        <strong style={{ color: "var(--clay)", marginRight: 6, fontSize: 11 }}>错因</strong>
        {keyError.stepDiagnosis}
      </div>
      <div
        style={{
          padding: "10px 12px",
          background: "var(--sage-soft)",
          border: "1px solid #D6E2C8",
          borderRadius: "var(--r-sm)",
          fontSize: 12.5,
          lineHeight: 1.55,
          color: "var(--ink-1)",
        }}
      >
        <strong style={{ color: "var(--sage)", marginRight: 6, fontSize: 11 }}>下次</strong>
        {keyError.closingLine}
      </div>
    </SubCard>
  )
}

// ─────────────────────────────────────────────────────────
// Block 2 · 下一阶段目标
// ─────────────────────────────────────────────────────────

function UnawareGapCard({ gap }: { gap: string }) {
  return (
    <SubCard label="其实你卡在哪" enLabel="where you actually stuck">
      <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: "var(--ink-1)" }}>{gap}</p>
    </SubCard>
  )
}

function StudyMethodsCard({
  methods,
}: {
  methods: WrongQuestionReport["learningGuidance"]["studyMethods"]
}) {
  return (
    <SubCard label="学习方法" enLabel="evidence-based methods" accent="var(--brand)">
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
        {methods.map((m, i) => (
          <li
            key={i}
            style={{
              padding: "10px 12px",
              background: "var(--card-warm)",
              border: "1px solid var(--rule-soft)",
              borderRadius: "var(--r-sm)",
            }}
          >
            {/* method name + researcher */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
              <span
                className="num"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 16,
                  fontWeight: 300,
                  color: "var(--brand)",
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                {String.fromCharCode(0x2460 + i) /* ① ② ③ … */}
              </span>
              <strong style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-1)" }}>
                {m.name}
              </strong>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontStyle: "italic",
                  fontSize: 10.5,
                  color: "var(--ink-4)",
                  fontWeight: 400,
                }}
              >
                {m.researcher}
              </span>
            </div>
            {/* finding (research-backed evidence line) */}
            <p
              style={{
                margin: "0 0 4px",
                paddingLeft: 24,
                fontSize: 11.5,
                lineHeight: 1.55,
                color: "var(--ink-3)",
                fontStyle: "italic",
              }}
            >
              研究：{m.finding}
            </p>
            {/* action (5-min concrete move) */}
            <p
              style={{
                margin: 0,
                paddingLeft: 24,
                fontSize: 12.5,
                lineHeight: 1.55,
                color: "var(--ink-1)",
                fontWeight: 500,
              }}
            >
              <span style={{ color: "var(--brand)", fontWeight: 700, marginRight: 4 }}>▸</span>
              {m.action}
            </p>
          </li>
        ))}
      </ul>
    </SubCard>
  )
}

// ─────────────────────────────────────────────────────────
// Block 3 · 我的观察
// ─────────────────────────────────────────────────────────

function ObservationMomentsCard({
  moments,
  closingLine,
}: {
  moments: WrongQuestionReport["studentObservation"]["moments"]
  closingLine: string
}) {
  return (
    <SubCard label="小迪记下的几个时刻" enLabel="moments i noticed" accent="var(--brand)">
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
        {moments.map((m, i) => (
          <li
            key={i}
            style={{
              paddingBottom: i < moments.length - 1 ? 8 : 0,
              borderBottom: i < moments.length - 1 ? "1px dashed var(--rule)" : 0,
            }}
          >
            <p
              className="num"
              style={{
                margin: "0 0 4px",
                fontFamily: "var(--font-display)",
                fontSize: 11,
                letterSpacing: "0.04em",
                color: "var(--ink-3)",
                fontStyle: "italic",
                fontWeight: 400,
              }}
            >
              {m.timestamp}
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 12.5,
                lineHeight: 1.6,
                color: "var(--ink-1)",
              }}
            >
              {m.observation}
            </p>
          </li>
        ))}
      </ul>
      <p
        style={{
          margin: "12px 0 0",
          padding: "10px 12px",
          background: "var(--card-warm)",
          borderLeft: "3px solid var(--clay)",
          borderRadius: "var(--r-sm)",
          fontSize: 12,
          lineHeight: 1.6,
          color: "var(--ink-2)",
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          fontWeight: 400,
        }}
      >
        {closingLine}
      </p>
    </SubCard>
  )
}

// ─────────────────────────────────────────────────────────
// Default export
// ─────────────────────────────────────────────────────────
export default function WrongQuestionReportView({ report, printMode }: Props) {
  return (
    <div
      className="paper-tooth"
      style={{
        background: "var(--wash-paper)",
        padding: "24px 32px 32px",
        minHeight: "100%",
        fontFamily: "var(--font-body)",
        color: "var(--ink-1)",
      }}
    >
      {/* Eyebrow */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 10.5,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--ink-3)",
          fontWeight: 700,
        }}
      >
        <span>错题学习报告</span>
        <span style={{ width: 12, height: 1, background: "var(--ink-4)" }} />
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
          For 小凯
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

      {/* Block 1 · 错题翻一遍 */}
      <BlockHeading index="01" cn="错题翻一遍" en="what went wrong" />
      <TodayWinsCard wins={report.errorAnalysis.todayWins} />
      <KeyErrorCard keyError={report.errorAnalysis.keyError} />

      {/* Block 2 · 下一阶段目标 */}
      <BlockHeading index="02" cn="下一阶段目标" en="what's next" />
      <UnawareGapCard gap={report.learningGuidance.unawareGap} />
      <StudyMethodsCard methods={report.learningGuidance.studyMethods} />

      {/* Block 3 · 我的观察 */}
      <BlockHeading index="03" cn="我的观察" en="what i'm seeing" />
      <ObservationMomentsCard
        moments={report.studentObservation.moments}
        closingLine={report.studentObservation.closingLine}
      />
    </div>
  )
}
