"use client"

import { useState, type ReactNode } from "react"
import type { GrowthReport } from "@/lib/reportTypes"
import { EMOTION_COLOR, EMOTION_VALENCE } from "@/lib/memoryParser"

interface Props {
  report: GrowthReport
  printMode?: boolean
}

const SUBJECT_HEX: Record<string, string> = {
  数学: "var(--s-math)",
  物理: "var(--s-physics)",
  英语: "var(--s-english)",
  化学: "var(--s-chemistry)",
  语文: "var(--s-chinese)",
}

function valenceFor(name: string): number {
  return EMOTION_VALENCE[name] ?? 0
}

function colorFor(name: string): string {
  return EMOTION_COLOR[name] ?? "var(--ink-4)"
}

function formatMonthLabel(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return `${d.getFullYear()} · ${d.getMonth() + 1}月`
}

// ── Custom SVG: 双轴图（作业线 + 考试线 + 错题柱）──
function ScoreErrorChart({ subjectData }: { subjectData: GrowthReport["scores"][number] }) {
  const W = 600,
    H = 240,
    padL = 44,
    padR = 44,
    padT = 18,
    padB = 36
  const innerW = W - padL - padR
  const innerH = H - padT - padB

  const scoreMin = 60,
    scoreMax = 100
  const errs = subjectData.weeklyErrorCount ?? []
  const errMax = Math.max(5, ...errs)

  const xFor = (i: number) => padL + (i + 0.5) * (innerW / 4)
  const yScore = (v: number) => padT + innerH - ((v - scoreMin) / (scoreMax - scoreMin)) * innerH
  const yErr = (v: number) => padT + innerH - (v / errMax) * innerH
  const barW = (innerW / 4) * 0.32

  const hwPts = subjectData.weeklyHomeworkAvg
    .map((v, i) => (v != null ? `${xFor(i)},${yScore(v)}` : null))
    .filter(Boolean)
    .join(" ")
  const exPts = subjectData.weeklyExamAvg
    .map((v, i) => (v != null ? `${xFor(i)},${yScore(v)}` : null))
    .filter(Boolean)
    .join(" ")

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 240, display: "block" }}>
      {[60, 70, 80, 90, 100].map((t) => (
        <g key={t}>
          <line
            x1={padL}
            x2={W - padR}
            y1={yScore(t)}
            y2={yScore(t)}
            stroke="var(--rule)"
            strokeDasharray={t === 60 ? "0" : "2 4"}
          />
          <text
            x={padL - 8}
            y={yScore(t) + 3}
            textAnchor="end"
            fontSize="10"
            fontFamily="var(--font-num)"
            fill="var(--ink-3)"
          >
            {t}
          </text>
        </g>
      ))}
      <text
        x={W - padR + 6}
        y={padT + 6}
        fontSize="10"
        fontFamily="var(--font-num)"
        fill="var(--ink-3)"
      >
        {errMax}
      </text>
      <text
        x={W - padR + 6}
        y={padT + innerH + 4}
        fontSize="10"
        fontFamily="var(--font-num)"
        fill="var(--ink-3)"
      >
        0
      </text>

      {errs.map((v, i) => (
        <rect
          key={i}
          x={xFor(i) - barW / 2}
          y={yErr(v)}
          width={barW}
          height={padT + innerH - yErr(v)}
          fill="var(--amber)"
          opacity={0.32}
          rx={2}
        />
      ))}

      <polyline
        points={hwPts}
        fill="none"
        stroke="var(--brand)"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {subjectData.weeklyHomeworkAvg.map(
        (v, i) =>
          v != null && (
            <circle
              key={i}
              cx={xFor(i)}
              cy={yScore(v)}
              r={3.6}
              fill="var(--brand)"
              stroke="#fff"
              strokeWidth={1.5}
            />
          ),
      )}

      <polyline
        points={exPts}
        fill="none"
        stroke="var(--sage)"
        strokeWidth={2.2}
        strokeDasharray="5 4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {subjectData.weeklyExamAvg.map(
        (v, i) =>
          v != null && (
            <circle
              key={i}
              cx={xFor(i)}
              cy={yScore(v)}
              r={4.2}
              fill="var(--sage)"
              stroke="#fff"
              strokeWidth={1.5}
            />
          ),
      )}

      {[1, 2, 3, 4].map((w, i) => (
        <text
          key={w}
          x={xFor(i)}
          y={H - padB + 18}
          textAnchor="middle"
          fontSize="11"
          fontFamily="var(--font-display)"
          fill="var(--ink-3)"
        >
          第 {w} 周
        </text>
      ))}
    </svg>
  )
}

// ── HomeworkExamErrorChart wrapper（保留组件名，内部委托 ScoreErrorChart + 学科切换） ──
function HomeworkExamErrorChart({
  scores,
  focusSubject,
}: {
  scores: GrowthReport["scores"]
  focusSubject: string
}) {
  const [selected, setSelected] = useState(focusSubject)
  const focus = scores.find((s) => s.subject === selected) ?? scores[0]
  if (!focus) return null

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
        <h3
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontSize: 24,
            fontWeight: 500,
            color: "var(--ink-1)",
            letterSpacing: "-0.01em",
          }}
        >
          本月分数对比
        </h3>
        <span style={{ color: "var(--ink-4)", fontFamily: "var(--font-display)", fontStyle: "italic" }}>
          · {focus.subject}
        </span>

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 4,
            padding: 3,
            background: "var(--paper)",
            borderRadius: 999,
          }}
        >
          {scores.map((s) => {
            const active = s.subject === focus.subject
            return (
              <button
                key={s.subject}
                onClick={() => setSelected(s.subject)}
                style={{
                  padding: "5px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  background: active ? "var(--ink-1)" : "transparent",
                  color: active ? "#fff" : "var(--ink-3)",
                  border: 0,
                  borderRadius: 999,
                  transition: "all .15s",
                  cursor: "pointer",
                }}
              >
                {s.subject}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <ScoreErrorChart subjectData={focus} />
      </div>

      <div
        style={{
          display: "flex",
          gap: 24,
          padding: "10px 4px 4px",
          fontSize: 11.5,
          color: "var(--ink-3)",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 16, height: 2, background: "var(--brand)", borderRadius: 1 }} />
          作业均分
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 16,
              height: 0,
              borderTop: "2px dashed var(--sage)",
            }}
          />
          考试均分
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 12, height: 8, background: "var(--amber)", opacity: 0.32, borderRadius: 1 }} />
          错题数（右轴）
        </span>
      </div>

      {/* Causal ribbon */}
      <div
        style={{
          marginTop: 16,
          padding: "10px 14px",
          background: "var(--sage-soft)",
          border: "1px solid #D6E2C8",
          borderRadius: "var(--r-md)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontSize: 12,
          color: "var(--ink-2)",
          fontStyle: "italic",
          fontFamily: "var(--font-display)",
        }}
      >
        <span style={{ color: "var(--brand)", fontWeight: 600, fontStyle: "normal", fontFamily: "var(--font-body)" }}>
          作业 ↑
        </span>
        <span style={{ color: "var(--ink-4)" }}>──→</span>
        <span style={{ color: "var(--amber)", fontWeight: 600, fontStyle: "normal", fontFamily: "var(--font-body)" }}>
          错题 ↓
        </span>
        <span style={{ color: "var(--ink-4)" }}>──→</span>
        <span style={{ color: "var(--sage)", fontWeight: 600, fontStyle: "normal", fontFamily: "var(--font-body)" }}>
          考试 ↑
        </span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: "var(--ink-3)", fontStyle: "normal" }}>
          三者通常一起动，看大趋势就好
        </span>
      </div>
    </div>
  )
}

// ── EmotionTrendCard（custom SVG 折线 + chip 列表）──
function EmotionTrendCard({ emotionTrend }: { emotionTrend: GrowthReport["emotionTrend"] }) {
  const W = 540,
    H = 130,
    padL = 36,
    padR = 12,
    padT = 12,
    padB = 24
  const innerW = W - padL - padR
  const innerH = H - padT - padB

  const data = emotionTrend.map((w) => ({
    ...w,
    valence: valenceFor(w.dominant),
    color: colorFor(w.dominant),
  }))
  const xFor = (i: number) => padL + (i + 0.5) * (innerW / Math.max(1, data.length))
  const yFor = (v: number) => padT + innerH - ((v + 1) / 2) * innerH
  const pts = data.map((d, i) => `${xFor(i)},${yFor(d.valence)}`).join(" ")

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 130, display: "block" }}>
        {[1, 0, -1].map((t) => (
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
              x={padL - 6}
              y={yFor(t) + 3}
              textAnchor="end"
              fontSize="10"
              fill="var(--ink-3)"
            >
              {t === 1 ? "积极" : t === -1 ? "低落" : "平"}
            </text>
          </g>
        ))}
        <polyline
          points={pts}
          fill="none"
          stroke="var(--brand)"
          strokeWidth={1.6}
          strokeLinecap="round"
        />
        {data.map((d, i) => (
          <circle
            key={i}
            cx={xFor(i)}
            cy={yFor(d.valence)}
            r={5}
            fill={d.color}
            stroke="#fff"
            strokeWidth={1.6}
          />
        ))}
        {data.map((d, i) => (
          <text
            key={i}
            x={xFor(i)}
            y={H - padB + 14}
            textAnchor="middle"
            fontSize="10"
            fontFamily="var(--font-display)"
            fill="var(--ink-3)"
          >
            W{d.week}
          </text>
        ))}
      </svg>
      <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0", display: "grid", gap: 8 }}>
        {data.map((w, i) => (
          <li
            key={i}
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 10,
              fontSize: 12.5,
              color: "var(--ink-2)",
              lineHeight: 1.55,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "2px 8px",
                background: "var(--paper)",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 600,
                color: "var(--ink-2)",
                flexShrink: 0,
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: w.color }} />
              W{w.week} · {w.dominant}
            </span>
            <span>{w.summary}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── TrajectoryCard（3 列大数字） ──
function TrajectoryCard({ trajectory }: { trajectory: GrowthReport["trajectory"] }) {
  const stats = [
    { v: trajectory.filesUploaded, l: "整理错题", c: "var(--brand)" },
    { v: trajectory.subjectsCovered.length, l: "覆盖学科", c: "var(--sage)" },
    { v: trajectory.activeDays, l: "活跃天数", c: "var(--clay)" },
  ]
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 0,
        border: "1px solid var(--rule)",
        borderRadius: "var(--r-md)",
        overflow: "hidden",
      }}
    >
      {stats.map((s, i) => (
        <div
          key={s.l}
          style={{
            padding: "18px 16px",
            background: "var(--card-warm)",
            borderRight: i < stats.length - 1 ? "1px solid var(--rule)" : 0,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-num)",
              fontSize: 36,
              fontWeight: 400,
              lineHeight: 1,
              color: s.c,
              letterSpacing: "-0.02em",
            }}
          >
            {s.v}
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.05em" }}>
            {s.l}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── HighlightsCard（编号列表） ──
function HighlightsCard({ highlights }: { highlights: string[] }) {
  if (highlights.length === 0) {
    return (
      <p style={{ fontSize: 12.5, color: "var(--ink-3)", margin: 0 }}>这个月没看到明显进步。</p>
    )
  }
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
      {highlights.map((h, i) => (
        <li
          key={i}
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 14,
            padding: "10px 0",
            borderBottom: i < highlights.length - 1 ? "1px dashed var(--rule)" : 0,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 22,
              fontWeight: 300,
              color: "var(--sage)",
              letterSpacing: "-0.02em",
              minWidth: 28,
            }}
          >
            0{i + 1}
          </span>
          <span style={{ flex: 1, fontSize: 13, lineHeight: 1.55, color: "var(--ink-1)" }}>{h}</span>
        </li>
      ))}
    </ul>
  )
}

// ── ParentAdviceCard（3 列：下一步学习计划 / 沟通重点 / 家长行动计划） ──
// V11 doctrine: 第二列从临床味标题改为「沟通重点」（沟通是双向）。
//                配色从 amber 警示改为 teal 信息（var(--teal)），匹配 doctrine #5 镜像。
function ParentAdviceCard({ advice }: { advice: GrowthReport["parentAdvice"] }) {
  const cols = [
    { t: "下一步学习计划", items: advice.strengthen, c: "var(--brand)", soft: "var(--brand-paper)" },
    { t: "沟通重点", items: advice.remind, c: "var(--teal)", soft: "#E0EFEF" },
    { t: "家长行动计划", items: advice.encourage, c: "var(--sage)", soft: "var(--sage-soft)" },
  ]
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
      {cols.map((c) => (
        <div
          key={c.t}
          style={{
            padding: 14,
            background: c.soft,
            borderRadius: "var(--r-md)",
            border: "1px solid var(--rule)",
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.12em",
              fontWeight: 700,
              color: c.c,
              marginBottom: 8,
            }}
          >
            {c.t}
          </div>
          {c.items.length === 0 ? (
            <p style={{ margin: 0, fontSize: 11, color: "var(--ink-4)" }}>暂无</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
              {c.items.map((it, i) => (
                <li
                  key={i}
                  style={{
                    fontSize: 12,
                    lineHeight: 1.55,
                    color: "var(--ink-2)",
                    display: "flex",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      color: c.c,
                      marginTop: 8,
                      width: 4,
                      height: 4,
                      borderRadius: 2,
                      background: c.c,
                      flexShrink: 0,
                    }}
                  />
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
}

// ── TopInsight（一句话本月定义） ──
function TopInsight({ insight }: { insight: string }) {
  return (
    <p
      style={{
        fontFamily: "var(--font-display)",
        fontSize: 28,
        lineHeight: 1.4,
        fontWeight: 400,
        color: "var(--ink-1)",
        margin: "20px 0 0",
        letterSpacing: "-0.01em",
        maxWidth: 640,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 56,
          lineHeight: 0.5,
          color: "var(--clay)",
          verticalAlign: "-0.05em",
          marginRight: 4,
        }}
      >
        “
      </span>
      {insight}
    </p>
  )
}

// ── ThisWeekAction（深色 ribbon，hero 卡底） ──
function ThisWeekAction({ action }: { action: string }) {
  return (
    <div
      className="ink-splash"
      style={{
        background: "var(--wash-brand)",
        color: "#fff",
        padding: "16px 32px 18px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          right: -20,
          top: -30,
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          fontSize: 120,
          fontWeight: 300,
          color: "rgba(255,255,255,.06)",
          lineHeight: 1,
          pointerEvents: "none",
        }}
      >
        this week
      </div>
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          fontWeight: 800,
          color: "#FFD8B5",
          marginBottom: 4,
        }}
      >
        这周一件事
      </div>
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-display)",
          fontSize: 17,
          fontWeight: 400,
          lineHeight: 1.55,
          letterSpacing: "-0.005em",
          color: "#fff",
          maxWidth: 540,
        }}
      >
        {action}
      </p>
    </div>
  )
}

// ── HeroCard（Chart + ThisWeekAction） ──
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
    <section
      style={{
        marginTop: 28,
        background: "var(--card)",
        border: "1px solid var(--rule)",
        borderRadius: "var(--r-xl)",
        overflow: "hidden",
        boxShadow: "var(--shadow-2)",
      }}
    >
      <div style={{ padding: "26px 32px 18px" }}>
        <HomeworkExamErrorChart scores={scores} focusSubject={focusSubject} />
      </div>
      <ThisWeekAction action={thisWeekAction} />
    </section>
  )
}

// ── BackupSection（折叠 details） ──
function BackupSection({
  title,
  en,
  defaultOpen = false,
  children,
}: {
  title: string
  en: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <details
      className="print-card"
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      style={{
        background: "var(--card)",
        border: "1px solid var(--rule)",
        borderRadius: "var(--r-lg)",
        overflow: "hidden",
      }}
    >
      <summary
        style={{
          listStyle: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "14px 18px",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: 13,
            color: "var(--ink-4)",
            fontWeight: 400,
            minWidth: 88,
          }}
        >
          {en}
        </span>
        <span style={{ width: 1, height: 14, background: "var(--rule)" }} />
        <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink-1)", flex: 1 }}>
          {title}
        </span>
        <span
          aria-hidden
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            border: "1px solid var(--rule)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--ink-3)",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform .2s",
            flexShrink: 0,
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="2,3.5 5,6.5 8,3.5" />
          </svg>
        </span>
      </summary>
      <div style={{ padding: "16px 18px 18px", borderTop: "1px solid var(--rule-soft)" }}>
        {children}
      </div>
    </details>
  )
}

// ── default export ──
export default function GrowthReportView({ report, printMode }: Props) {
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
        <span>成长报告</span>
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
          Growth Report · For Parents
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

      <TopInsight insight={report.topInsight} />

      <HeroCard
        scores={report.scores}
        focusSubject={report.focusSubject}
        thisWeekAction={report.thisWeekAction}
      />

      <div style={{ marginTop: 24, display: "grid", gap: 10 }}>
        <BackupSection title="小凯的情绪" en="Emotion" defaultOpen={printMode}>
          <EmotionTrendCard emotionTrend={report.emotionTrend} />
        </BackupSection>
        <BackupSection title="月度学习记录" en="Trajectory" defaultOpen={printMode}>
          <TrajectoryCard trajectory={report.trajectory} />
        </BackupSection>

        {printMode && <div className="print-page-break" aria-hidden="true" />}

        <BackupSection title="本月亮点" en="Highlights" defaultOpen={printMode}>
          <HighlightsCard highlights={report.highlights} />
        </BackupSection>
        <BackupSection title="与小凯沟通" en="Advice" defaultOpen={printMode}>
          <ParentAdviceCard advice={report.parentAdvice} />
        </BackupSection>
      </div>

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
            DeliClaw · 月报附言
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
            小凯这个月一点点在往前，下个月咱们再一起看一次。
          </p>
        </aside>
      )}
    </div>
  )
}
