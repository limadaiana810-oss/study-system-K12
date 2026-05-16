"use client"

import type { ReactNode } from "react"
import type { GrowthReport, SubjectProgress } from "@/lib/reportTypes"

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
// Block 1 · 小迪这周做了什么
// ─────────────────────────────────────────────────────────

function KnowledgePointsResolvedCard({
  filesIngested,
  items,
}: {
  filesIngested: number
  items: GrowthReport["weekWork"]["knowledgePointsResolved"]
}) {
  return (
    <SubCard label="这周帮小凯过的几道关" enLabel={`from ${filesIngested} files`} accent="var(--brand)">
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
        {items.map((it, i) => (
          <li
            key={i}
            style={{
              paddingBottom: 6,
              borderBottom: i < items.length - 1 ? "1px dashed var(--rule)" : 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: "var(--ink-1)",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: SUBJECT_HEX[it.subject] ?? "var(--ink-4)",
                  }}
                />
                {it.subject}
              </span>
              <strong style={{ fontSize: 12.5, color: "var(--ink-1)", fontWeight: 600, flex: 1 }}>
                {it.knowledgePoint}
              </strong>
              <span
                className="num"
                style={{ fontSize: 11, color: "var(--sage)", fontWeight: 600 }}
              >
                错 {it.errorCountBefore} → {it.errorCountAfter}
              </span>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: 12,
                lineHeight: 1.55,
                color: "var(--ink-2)",
              }}
            >
              {it.resolvedHow}
            </p>
          </li>
        ))}
      </ul>
    </SubCard>
  )
}

// ─────────────────────────────────────────────────────────
// Block 2 · 小凯的进步（数据驱动：现象 → 错误点 → 根因 → 月考语境）
// ─────────────────────────────────────────────────────────

function trendBadge(trend: SubjectProgress["trend"]) {
  if (trend === "improving") {
    return { label: "在涨", arrow: "↑", color: "var(--sage)", bg: "var(--sage-soft)" }
  }
  if (trend === "regressing") {
    return { label: "在退", arrow: "↓", color: "var(--clay)", bg: "var(--card-warm)" }
  }
  return { label: "数据不足", arrow: "—", color: "var(--ink-3)", bg: "var(--paper)" }
}

function SubjectProgressCard({ items }: { items: SubjectProgress[] }) {
  return (
    <SubCard label="按学科看走向" enLabel="by subject" accent="var(--brand)">
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
        {items.map((s, i) => {
          const badge = trendBadge(s.trend)
          return (
            <li
              key={i}
              style={{
                paddingBottom: 8,
                borderBottom: i < items.length - 1 ? "1px dashed var(--rule)" : 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--ink-1)",
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: SUBJECT_HEX[s.subject] ?? "var(--ink-4)",
                    }}
                  />
                  {s.subject}
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "2px 8px",
                    background: badge.bg,
                    color: badge.color,
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    borderRadius: 999,
                    border: `1px solid ${badge.color}`,
                  }}
                >
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 400 }}>{badge.arrow}</span>
                  {badge.label}
                </span>
              </div>

              {s.trend === "insufficient-data" ? (
                <p
                  style={{
                    margin: 0,
                    paddingLeft: 11,
                    fontSize: 12,
                    lineHeight: 1.55,
                    color: "var(--ink-3)",
                    fontStyle: "italic",
                  }}
                >
                  {s.insufficientNote}
                </p>
              ) : (
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    paddingLeft: 11,
                    margin: 0,
                    display: "grid",
                    gap: 3,
                  }}
                >
                  {s.dataObservation && (
                    <DataLine label="数据" value={s.dataObservation} />
                  )}
                  {s.errorPattern && (
                    <DataLine label="错误点" value={s.errorPattern} />
                  )}
                  {s.rootCause && (
                    <DataLine label="根因" value={s.rootCause} accent />
                  )}
                  {s.scoreContext && (
                    <DataLine label="月考" value={s.scoreContext} />
                  )}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </SubCard>
  )
}

function DataLine({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <li style={{ display: "flex", gap: 8, fontSize: 12, lineHeight: 1.55 }}>
      <span
        style={{
          flexShrink: 0,
          width: 36,
          fontSize: 10,
          letterSpacing: "0.1em",
          color: accent ? "var(--clay)" : "var(--ink-3)",
          fontWeight: 700,
          paddingTop: 3,
        }}
      >
        {label}
      </span>
      <span style={{ color: accent ? "var(--ink-1)" : "var(--ink-2)", fontWeight: accent ? 500 : 400 }}>
        {value}
      </span>
    </li>
  )
}

// ─────────────────────────────────────────────────────────
// Block 3 · 我的建议
// ─────────────────────────────────────────────────────────

function StudyAdviceCard({
  studyAdvice,
}: {
  studyAdvice: GrowthReport["recommendation"]["studyAdvice"]
}) {
  return (
    <SubCard label="学习建议" enLabel="what to do this week" accent="var(--brand)">
      <p
        style={{
          margin: "0 0 8px",
          fontFamily: "var(--font-display)",
          fontSize: 14,
          fontWeight: 500,
          lineHeight: 1.55,
          color: "var(--ink-1)",
        }}
      >
        {studyAdvice.action}
      </p>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 4 }}>
        <DataLine label="为什么" value={studyAdvice.whyThisAction} />
        <DataLine label="不补全科" value={studyAdvice.whyNotBroader} />
      </ul>
    </SubCard>
  )
}

function CommunicationApproachCard({
  approach,
}: {
  approach: GrowthReport["recommendation"]["communicationApproach"]
}) {
  const { childEmotion, alphaGenContext, developmentalStrategy } = approach
  return (
    <SubCard label="沟通方式" enLabel="how to talk tonight" accent="var(--clay)">
      {/* ① 小孩的情绪 */}
      <SubSection no="①" title="小孩的情绪" meta="emotion now">
        <p
          style={{
            margin: "0 0 6px",
            fontFamily: "var(--font-display)",
            fontSize: 13.5,
            fontWeight: 500,
            lineHeight: 1.55,
            color: "var(--ink-1)",
          }}
        >
          {childEmotion.summary}
        </p>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 4 }}>
          {childEmotion.evidence.map((e, i) => (
            <li
              key={i}
              style={{
                display: "flex",
                gap: 6,
                fontSize: 11.5,
                lineHeight: 1.55,
                color: "var(--ink-3)",
              }}
            >
              <span style={{ color: "var(--ink-4)", flexShrink: 0 }}>·</span>
              <span>{e}</span>
            </li>
          ))}
        </ul>
      </SubSection>

      {/* ② Alpha 世代沟通方式 / 原因 */}
      <SubSection
        no="②"
        title="Alpha 世代沟通"
        meta={alphaGenContext.bornRange}
      >
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: "0 0 8px",
            display: "grid",
            gap: 4,
          }}
        >
          {alphaGenContext.traits.map((t, i) => (
            <li
              key={i}
              style={{
                display: "flex",
                gap: 6,
                fontSize: 12,
                lineHeight: 1.55,
                color: "var(--ink-1)",
              }}
            >
              <span style={{ color: "var(--ink-4)", flexShrink: 0 }}>·</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
        <p
          style={{
            margin: 0,
            padding: "6px 10px",
            background: "var(--paper)",
            border: "1px solid var(--rule-soft)",
            borderLeft: "3px solid var(--clay)",
            borderRadius: "var(--r-sm)",
            fontSize: 11.5,
            lineHeight: 1.55,
            color: "var(--ink-2)",
            fontStyle: "italic",
            fontFamily: "var(--font-display)",
          }}
        >
          {alphaGenContext.whyDifferent}
        </p>
      </SubSection>

      {/* ③ 不同年龄段心理学沟通策略 */}
      <SubSection no="③" title="不同年龄段沟通策略" meta="by age bracket">
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: "0 0 10px",
            display: "grid",
            gap: 8,
          }}
        >
          {developmentalStrategy.ageBrackets.map((b, i) => (
            <li
              key={i}
              style={{
                padding: b.isCurrent ? "8px 10px" : "6px 10px 6px 0",
                background: b.isCurrent ? "var(--card-warm)" : "transparent",
                border: b.isCurrent ? "1px solid var(--clay)" : "0",
                borderRadius: b.isCurrent ? "var(--r-sm)" : 0,
                borderBottom:
                  !b.isCurrent && i < developmentalStrategy.ageBrackets.length - 1
                    ? "1px dashed var(--rule)"
                    : undefined,
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                <span
                  className="num"
                  style={{
                    flexShrink: 0,
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: b.isCurrent ? "var(--clay)" : "var(--ink-1)",
                  }}
                >
                  {b.range}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--ink-3)",
                    fontWeight: 500,
                  }}
                >
                  {b.stageName}
                </span>
                {b.isCurrent && (
                  <span
                    style={{
                      marginLeft: "auto",
                      padding: "1px 6px",
                      background: "var(--clay)",
                      color: "#fff",
                      fontSize: 9.5,
                      letterSpacing: "0.08em",
                      fontWeight: 700,
                      borderRadius: 999,
                    }}
                  >
                    小凯当前
                  </span>
                )}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontStyle: "italic",
                  fontSize: 10.5,
                  color: "var(--ink-4)",
                  marginBottom: 4,
                }}
              >
                {b.theorist}
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 11.5,
                  lineHeight: 1.55,
                  color: b.isCurrent ? "var(--ink-1)" : "var(--ink-2)",
                  fontWeight: b.isCurrent ? 500 : 400,
                }}
              >
                {b.strategy}
              </p>
            </li>
          ))}
        </ul>

        <div
          style={{
            marginTop: 10,
            paddingTop: 10,
            borderTop: "1px solid var(--rule-soft)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 6,
              marginBottom: 6,
            }}
          >
            <strong
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                color: "var(--ink-1)",
                letterSpacing: "0.02em",
              }}
            >
              今晚怎么开口
            </strong>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: 10.5,
                color: "var(--ink-4)",
              }}
            >
              for 12-14 bracket
            </span>
          </div>
          <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
            {developmentalStrategy.tonightLines.map((line, i) => (
              <li key={i} style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                <span
                  className="num"
                  style={{
                    flexShrink: 0,
                    width: 16,
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--brand)",
                  }}
                >
                  {i + 1}.
                </span>
                <span
                  style={{
                    fontSize: 12,
                    lineHeight: 1.55,
                    color: "var(--ink-1)",
                  }}
                >
                  {line}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <p
          style={{
            margin: "10px 0 0",
            padding: "6px 10px",
            background: "var(--paper)",
            border: "1px solid var(--rule-soft)",
            borderRadius: "var(--r-sm)",
            fontSize: 11.5,
            lineHeight: 1.5,
            color: "var(--clay)",
            fontWeight: 700,
            letterSpacing: "0.02em",
          }}
        >
          ✦ {developmentalStrategy.keyword}
        </p>
      </SubSection>
    </SubCard>
  )
}

function SubSection({
  no,
  title,
  meta,
  children,
}: {
  no: string
  title: string
  meta?: string
  children: ReactNode
}) {
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 5 }}>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 14,
            fontWeight: 300,
            color: "var(--clay)",
            lineHeight: 1,
          }}
        >
          {no}
        </span>
        <strong style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink-1)", letterSpacing: "0.02em" }}>
          {title}
        </strong>
        {meta && (
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: 10.5,
              color: "var(--ink-4)",
              fontWeight: 400,
            }}
          >
            {meta}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Default export
// ─────────────────────────────────────────────────────────
export default function GrowthReportView({ report, printMode }: Props) {
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
        <span>家庭成长报告</span>
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
          For Parents
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

      {/* Block 1 · 小迪这周做了什么 */}
      <BlockHeading index="01" cn="小迪这周做了什么" en="what i did this week" />
      <KnowledgePointsResolvedCard
        filesIngested={report.weekWork.filesIngested}
        items={report.weekWork.knowledgePointsResolved}
      />

      {/* Block 2 · 小凯的进步 */}
      <BlockHeading index="02" cn="小凯的进步" en="his progress" />
      <SubjectProgressCard items={report.progressAssessment.bySubject} />

      {/* Block 3 · 我的建议
          顺序：先沟通后建议（今晚 → 这周；说 → 做）
          策略 1-2-3 内部：物理（建安全感）→ 邻居补习（清焦虑）→ 数学卡点（衔接学习建议）*/}
      <BlockHeading index="03" cn="我的建议" en="my recommendation" />
      <CommunicationApproachCard approach={report.recommendation.communicationApproach} />
      <StudyAdviceCard studyAdvice={report.recommendation.studyAdvice} />
    </div>
  )
}
