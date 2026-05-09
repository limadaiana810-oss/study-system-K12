"use client"

import type { InferredCandidate, MemoryEntry, TurnInsight } from "@/types"
import { getStudentStateAvatar } from "@/lib/studentState"
import MemoryCard from "./MemoryCard"

interface Props {
  memory: MemoryEntry
  turnInsight: TurnInsight | null
  pendingInferred: InferredCandidate[]
  onAcceptInferred: (id: string) => void
  onRejectInferred: (id: string) => void
  onEditAcceptInferred?: (id: string, editedValue: string | string[]) => void
  onIgnoreInferred?: (id: string) => void
}

function hasValue(value: unknown) {
  if (Array.isArray(value)) return value.length > 0
  return typeof value === "string" ? value.trim().length > 0 : !!value
}

function getCurrentEmotion(memory: MemoryEntry, turnInsight: TurnInsight | null) {
  return turnInsight?.emotion?.emotion || memory.psychState?.dominant || "平静"
}

function StudentStateAvatar({
  memory,
  turnInsight,
}: {
  memory: MemoryEntry
  turnInsight: TurnInsight | null
}) {
  const state = getStudentStateAvatar(getCurrentEmotion(memory, turnInsight))

  return (
    <section
      style={{
        background: "var(--card)",
        border: "1px solid var(--rule)",
        borderRadius: "var(--r-md)",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "16px 16px 0", textAlign: "center" }}>
        <p
          style={{
            margin: 0,
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--ink-3)",
            fontWeight: 700,
          }}
        >
          用户状态
        </p>
        <h2
          style={{
            margin: "4px 0 0",
            fontFamily: "var(--font-display)",
            fontSize: 20,
            fontWeight: 500,
            color: "var(--ink-1)",
            letterSpacing: "-0.01em",
          }}
        >
          {state.title}
        </h2>
        <p
          style={{
            margin: "4px 0 0",
            fontSize: 11,
            lineHeight: 1.55,
            color: "var(--ink-3)",
          }}
        >
          {state.description}
        </p>
      </div>

      <div
        style={{
          margin: "12px 16px 16px",
          height: 176,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--card-warm)",
          border: "1px solid var(--rule-soft)",
          borderRadius: "var(--r-md)",
          overflow: "hidden",
        }}
      >
        <div key={state.src} className="student-avatar-enter">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={state.src}
            alt={`${state.title}状态的Q版学生`}
            className="student-avatar-float"
            style={{ height: 208, width: 208, objectFit: "contain" }}
          />
        </div>
      </div>
    </section>
  )
}

function LongTermMemoryCards({ memory }: { memory: MemoryEntry }) {
  const factual = memory.factual || {}
  const inferred = memory.inferred || {}
  const hasLongTermMemory =
    Object.values(factual).some(hasValue) || Object.values(inferred).some(hasValue)

  if (!hasLongTermMemory) {
    return (
      <section
        style={{
          background: "var(--card)",
          border: "1px dashed var(--rule)",
          borderRadius: "var(--r-md)",
          padding: 14,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 12,
            fontWeight: 700,
            color: "var(--ink-2)",
            fontFamily: "var(--font-display)",
            letterSpacing: "0.02em",
          }}
        >
          长期记忆会沉淀到这里
        </p>
        <p style={{ margin: "6px 0 0", fontSize: 11, lineHeight: 1.55, color: "var(--ink-3)" }}>
          告诉我姓名、年级、学校、近期目标或爱好后，这里会生成稳定记忆卡片。
        </p>
      </section>
    )
  }

  return (
    <section style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 4px" }}>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: 12,
            color: "var(--ink-4)",
          }}
        >
          long-term
        </span>
        <span style={{ width: 1, height: 12, background: "var(--rule)" }} />
        <p
          style={{
            margin: 0,
            fontSize: 10,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            fontWeight: 700,
            color: "var(--ink-3)",
          }}
        >
          长期记忆
        </p>
      </div>

      {factual.name && (
        <MemoryCard key={`name-${factual.name}`} label="姓名" value={factual.name} delay={0} accent="var(--brand)" />
      )}
      {factual.age && (
        <MemoryCard key={`age-${factual.age}`} label="年龄" value={factual.age} delay={50} accent="var(--brand)" />
      )}
      {factual.grade && (
        <MemoryCard key={`grade-${factual.grade}`} label="年级" value={factual.grade} delay={100} accent="var(--brand)" />
      )}
      {factual.school && (
        <MemoryCard key={`school-${factual.school}`} label="学校" value={factual.school} delay={150} accent="var(--brand)" />
      )}
      {factual.position && (
        <MemoryCard key={`position-${factual.position}`} label="职位" value={factual.position} delay={200} accent="var(--brand)" />
      )}
      {factual.recentGoal && (
        <MemoryCard key={`recent-goal-${factual.recentGoal}`} label="近期目标" value={factual.recentGoal} delay={250} accent="var(--brand)" />
      )}
      {inferred.sleepPattern && (
        <MemoryCard key={`sleep-${inferred.sleepPattern}`} label="已确认作息" value={inferred.sleepPattern} delay={300} accent="var(--sage)" />
      )}
      {inferred.mood && (
        <MemoryCard key={`mood-${inferred.mood}`} label="已确认状态" value={inferred.mood} delay={350} accent="var(--sage)" />
      )}
      {inferred.preferences && inferred.preferences.length > 0 && (
        <MemoryCard
          key={`preferences-${inferred.preferences.join("|")}`}
          label="爱好"
          tags={inferred.preferences}
          delay={400}
          accent="var(--sage)"
        />
      )}
    </section>
  )
}

export default function DatabaseHub({ memory, turnInsight }: Props) {
  const hasAnyMemory =
    Object.values(memory.factual || {}).some(hasValue) ||
    Object.values(memory.inferred || {}).some(hasValue) ||
    !!memory.psychState?.snapshots.length

  return (
    <div
      className="paper-tooth"
      style={{
        display: "flex",
        height: "100%",
        flexDirection: "column",
        borderLeft: "1px solid var(--rule)",
        background: "var(--wash-paper)",
      }}
    >
      <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid var(--rule)" }}>
        <p
          style={{
            margin: 0,
            fontSize: 10,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "var(--ink-3)",
            fontWeight: 700,
          }}
        >
          Memory · For Reference
        </p>
        <h2
          style={{
            margin: "4px 0 0",
            fontFamily: "var(--font-display)",
            fontSize: 18,
            fontWeight: 500,
            color: "var(--ink-1)",
            letterSpacing: "-0.005em",
          }}
        >
          记忆中心
        </h2>
        <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--ink-3)" }}>
          孩子状态 + 成长记忆
        </p>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "grid", gap: 16 }}>
        <StudentStateAvatar memory={memory} turnInsight={turnInsight} />
        <LongTermMemoryCards memory={memory} />
      </div>

      <div
        style={{
          padding: "10px 16px",
          borderTop: "1px solid var(--rule)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: hasAnyMemory ? "var(--sage)" : "var(--ink-4)",
          }}
        />
        <p style={{ margin: 0, fontSize: 10, color: "var(--ink-3)" }}>
          {hasAnyMemory ? "记忆已同步" : "等待首次对话"}
        </p>
      </div>
    </div>
  )
}
