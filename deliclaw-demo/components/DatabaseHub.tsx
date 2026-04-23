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

function StudentStateAvatar({ memory, turnInsight }: { memory: MemoryEntry; turnInsight: TurnInsight | null }) {
  const state = getStudentStateAvatar(getCurrentEmotion(memory, turnInsight))

  return (
    <section
      className="overflow-hidden rounded-2xl border bg-gradient-to-b from-slate-50 to-white shadow-sm"
      style={{ borderColor: `${state.accent}33` }}
    >
      <div className="px-4 pt-4 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">用户状态</p>
        <h2 className="mt-1 text-base font-black text-slate-900">{state.title}</h2>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{state.description}</p>
      </div>

      <div
        className="mx-4 mt-3 flex h-44 items-center justify-center overflow-hidden rounded-2xl border"
        style={{ backgroundColor: `${state.accent}12`, borderColor: `${state.accent}22` }}
      >
        <div key={state.src} className="student-avatar-enter">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={state.src}
            alt={`${state.title}状态的Q版学生`}
            className="student-avatar-float h-52 w-52 object-contain"
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
    Object.values(factual).some(hasValue) ||
    Object.values(inferred).some(hasValue)

  if (!hasLongTermMemory) {
    return (
      <section className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
        <p className="text-xs font-bold text-slate-700">长期记忆会沉淀到这里</p>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
          告诉我姓名、年级、学校或近期目标后，这里会生成稳定记忆卡片。
        </p>
      </section>
    )
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-1.5 px-1">
        <div className="h-3 w-1 rounded-full bg-blue-500" />
        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">长期记忆</p>
      </div>

      {factual.name && (
        <MemoryCard key={`name-${factual.name}`} label="姓名" value={factual.name} delay={0} accent="#3B82F6" />
      )}
      {factual.age && (
        <MemoryCard key={`age-${factual.age}`} label="年龄" value={factual.age} delay={50} accent="#3B82F6" />
      )}
      {factual.grade && (
        <MemoryCard key={`grade-${factual.grade}`} label="年级" value={factual.grade} delay={100} accent="#3B82F6" />
      )}
      {factual.school && (
        <MemoryCard key={`school-${factual.school}`} label="学校" value={factual.school} delay={150} accent="#3B82F6" />
      )}
      {factual.position && (
        <MemoryCard key={`position-${factual.position}`} label="职位" value={factual.position} delay={200} accent="#3B82F6" />
      )}
      {factual.recentGoal && (
        <MemoryCard key={`recent-goal-${factual.recentGoal}`} label="近期目标" value={factual.recentGoal} delay={250} accent="#3B82F6" />
      )}
      {inferred.sleepPattern && (
        <MemoryCard key={`sleep-${inferred.sleepPattern}`} label="已确认作息" value={inferred.sleepPattern} delay={300} accent="#10B981" />
      )}
      {inferred.mood && (
        <MemoryCard key={`mood-${inferred.mood}`} label="已确认状态" value={inferred.mood} delay={350} accent="#10B981" />
      )}
      {inferred.preferences && inferred.preferences.length > 0 && (
        <MemoryCard key={`preferences-${inferred.preferences.join("|")}`} label="已确认偏好" tags={inferred.preferences} delay={400} accent="#10B981" />
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
    <div className="flex h-full flex-col border-l border-gray-100 bg-white">
      <div className="border-b border-gray-50 px-5 pb-4 pt-5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600">
            <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 3 8 3s8-.79 8-3V7M4 7c0 2.21 3.582 3 8 3s8-.79 8-3M4 7c0-2.21 3.582-3 8-3s8 .79 8 3" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-bold leading-tight text-gray-800">记忆中心</p>
            <p className="text-[10px] text-gray-400">孩子状态 + 成长记忆</p>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <StudentStateAvatar memory={memory} turnInsight={turnInsight} />
        <LongTermMemoryCards memory={memory} />
      </div>

      <div className="border-t border-gray-50 px-4 py-3">
        <div className="flex items-center gap-1.5">
          <div className={`h-1.5 w-1.5 rounded-full ${hasAnyMemory ? "bg-emerald-400" : "bg-gray-300"}`} />
          <p className="text-[10px] text-gray-400">{hasAnyMemory ? "记忆已同步" : "等待首次对话"}</p>
        </div>
      </div>
    </div>
  )
}
