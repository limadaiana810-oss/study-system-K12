"use client"

import type { InferredCandidate, MemoryEntry } from "@/types"
import { EMOTION_COLOR } from "@/lib/memoryParser"
import MemoryCard from "./MemoryCard"

interface Props {
  memory: MemoryEntry
  pendingInferred: InferredCandidate[]
  onAcceptInferred: (id: string) => void
  onRejectInferred: (id: string) => void
}

function labelForField(field: string) {
  const map: Record<string, string> = {
    sleepPattern: "作息习惯",
    mood: "情绪状态",
    preferences: "偏好",
  }
  return map[field] || field
}

function scoreColor(score: number): string {
  if (score < 0.4) return "#EF4444"
  if (score < 0.6) return "#F59E0B"
  return "#34D399"
}

export default function DatabaseHub({ memory, pendingInferred, onAcceptInferred, onRejectInferred }: Props) {
  const hasFactual = memory.factual && Object.values(memory.factual).some(Boolean)
  const hasInferred = memory.inferred && Object.values(memory.inferred).some(v =>
    v && (Array.isArray(v) ? v.length > 0 : true)
  )
  const hasFileTags = memory.fileTags && memory.fileTags.length > 0
  const hasActions = memory.actions && memory.actions.length > 0
  const hasFileDesc = !!memory.fileDescription
  const hasPending = pendingInferred && pendingInferred.length > 0
  const hasPsychState = memory.psychState && memory.psychState.snapshots.length > 0

  const isEmpty = !hasFactual && !hasInferred && !hasPending && !hasFileTags && !hasActions && !hasFileDesc && !hasPsychState

  const psych = memory.psychState
  const dominantColor = psych ? (EMOTION_COLOR[psych.dominant] ?? "#94A3B8") : "#94A3B8"

  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-100">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 3 8 3s8-.79 8-3V7M4 7c0 2.21 3.582 3 8 3s8-.79 8-3M4 7c0-2.21 3.582-3 8-3s8 .79 8 3" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-800 leading-tight">记忆中心</p>
            <p className="text-[10px] text-gray-400">实时记忆</p>
          </div>
        </div>
      </div>

      {/* Memory cards */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isEmpty ? (
          /* 冷启动引导 */
          <div className="space-y-3">
            <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-3.5">
              <p className="text-xs font-bold text-indigo-700 mb-2">我能记住什么？</p>
              <div className="space-y-2">
                {[
                  { color: "#3B82F6", label: "事实记忆", desc: "姓名、年级、学校等你告诉我的信息" },
                  { color: "#8B5CF6", label: "习惯推测", desc: "作息、偏好——需要你来确认" },
                  { color: "#EC4899", label: "情绪状态", desc: "每轮对话自动感知你的情绪" },
                  { color: "#06B6D4", label: "文件索引", desc: "上传文件自动分类，一句话找回" },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <p className="text-[11px] text-gray-600 leading-relaxed">
                      <span className="font-semibold">{item.label}</span>：{item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-gray-300 text-center px-2">先跟我打个招呼，记忆就开始建立</p>
          </div>
        ) : (
          <>
            {/* 情绪追踪区域 */}
            {hasPsychState && psych && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 px-1">
                  <div className="w-1 h-3 rounded-full" style={{ backgroundColor: dominantColor }} />
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">情绪追踪</p>
                </div>

                <div
                  className="rounded-xl bg-white p-3 shadow-sm border border-gray-100"
                  style={{ borderLeftWidth: 3, borderLeftColor: dominantColor }}
                >
                  <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1.5">当前情绪</p>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-bold text-gray-800">{psych.dominant}</span>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${psych.compositeScore * 100}%`,
                          backgroundColor: scoreColor(psych.compositeScore),
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400">{(psych.compositeScore * 100).toFixed(0)}%</span>
                  </div>

                  {/* 10轮历史迷你柱状图 */}
                  {psych.snapshots.length > 1 && (
                    <div className="flex items-end gap-0.5 h-5 mt-1">
                      {psych.snapshots.map((s, i) => (
                        <div
                          key={s.timestamp}
                          className="flex-1 rounded-sm transition-all duration-300"
                          title={`${s.emotion} (${(s.weight * 100).toFixed(0)}%)`}
                          style={{
                            height: `${Math.max(15, s.weight * 100)}%`,
                            backgroundColor: EMOTION_COLOR[s.emotion] ?? "#94A3B8",
                            opacity: 0.4 + (i / psych.snapshots.length) * 0.6,
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {psych.snapshots.length > 0 && psych.snapshots[psych.snapshots.length - 1].evidence && (
                    <p className="text-[10px] text-gray-400 mt-1.5 truncate">
                      「{psych.snapshots[psych.snapshots.length - 1].evidence}」
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* 待确认推测区域 */}
            {hasPending && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 px-1">
                  <div className="w-1 h-3 bg-amber-500 rounded-full" />
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">待确认推测（{pendingInferred.length}）</p>
                </div>

                {pendingInferred.map((c, idx) => (
                  <div
                    key={c.id}
                    className="rounded-xl bg-white p-3 shadow-sm border border-gray-100"
                    style={{
                      borderLeftWidth: 3,
                      borderLeftColor: "#F59E0B",
                      opacity: 1,
                      transform: "translateX(0)",
                      transition: "opacity 0.35s ease-out, transform 0.35s ease-out",
                    }}
                  >
                    <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1.5">
                      {labelForField(c.field)}
                    </p>
                    <p className="text-sm font-semibold text-gray-800">
                      {Array.isArray(c.value) ? c.value.join("，") : c.value}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                      依据：{c.evidence}
                      {typeof c.confidence === "number" ? `（置信度 ${(c.confidence * 100).toFixed(0)}%）` : ""}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={() => onAcceptInferred(c.id)}
                        className="text-[11px] px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 font-semibold hover:bg-emerald-100 transition-colors"
                      >
                        接受
                      </button>
                      <button
                        onClick={() => onRejectInferred(c.id)}
                        className="text-[11px] px-2 py-1 rounded-lg bg-gray-50 text-gray-500 font-semibold hover:bg-gray-100 transition-colors"
                      >
                        拒绝
                      </button>
                      {idx === 0 && (
                        <span className="ml-auto text-[10px] text-gray-300">
                          仅在你确认后才会写入长期记忆
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 事实记忆区域 */}
            {hasFactual && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 px-1">
                  <div className="w-1 h-3 bg-blue-500 rounded-full" />
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">事实记忆</p>
                </div>
                {memory.factual?.name && (
                  <MemoryCard
                    key={`name-${memory.factual.name}`}
                    label="姓名"
                    value={memory.factual.name}
                    delay={0}
                    accent="#3B82F6"
                  />
                )}
                {memory.factual?.age && (
                  <MemoryCard
                    key={`age-${memory.factual.age}`}
                    label="年龄"
                    value={memory.factual.age}
                    delay={50}
                    accent="#3B82F6"
                  />
                )}
                {memory.factual?.grade && (
                  <MemoryCard
                    key={`grade-${memory.factual.grade}`}
                    label="年级"
                    value={memory.factual.grade}
                    delay={100}
                    accent="#3B82F6"
                  />
                )}
                {memory.factual?.school && (
                  <MemoryCard
                    key={`school-${memory.factual.school}`}
                    label="学校"
                    value={memory.factual.school}
                    delay={150}
                    accent="#3B82F6"
                  />
                )}
                {memory.factual?.position && (
                  <MemoryCard
                    key={`position-${memory.factual.position}`}
                    label="职位"
                    value={memory.factual.position}
                    delay={200}
                    accent="#3B82F6"
                  />
                )}
              </div>
            )}

            {/* 推测记忆区域 */}
            {hasInferred && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 px-1">
                  <div className="w-1 h-3 bg-purple-500 rounded-full" />
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">推测记忆</p>
                </div>
                {memory.inferred?.sleepPattern && (
                  <MemoryCard
                    key={`sleep-${memory.inferred.sleepPattern}`}
                    label="作息习惯"
                    value={memory.inferred.sleepPattern}
                    delay={0}
                    accent="#8B5CF6"
                  />
                )}
                {memory.inferred?.mood && (
                  <MemoryCard
                    key={`mood-${memory.inferred.mood}`}
                    label="情绪状态"
                    value={memory.inferred.mood}
                    delay={50}
                    accent="#8B5CF6"
                  />
                )}
                {memory.inferred?.preferences && memory.inferred.preferences.length > 0 && (
                  <MemoryCard
                    key={`pref-${memory.inferred.preferences.join(",")}`}
                    label="偏好"
                    tags={memory.inferred.preferences}
                    delay={100}
                    accent="#8B5CF6"
                  />
                )}
              </div>
            )}

            {/* 文件标签 */}
            {hasFileTags && (
              <MemoryCard
                key={`tags-${memory.fileTags!.join(",")}`}
                label="文件标签"
                tags={memory.fileTags}
                delay={200}
                accent="#06B6D4"
              />
            )}

            {/* 操作记录 */}
            {hasActions && (
              <MemoryCard
                key={`actions-${memory.actions!.join(",")}`}
                label="操作"
                tags={memory.actions}
                delay={250}
                accent="#10B981"
              />
            )}

            {/* 文件描述 */}
            {hasFileDesc && (
              <MemoryCard
                key={`desc-${memory.fileDescription!.slice(0, 20)}`}
                label="文件描述"
                value={memory.fileDescription}
                delay={300}
                accent="#F59E0B"
              />
            )}
          </>
        )}
      </div>

      {/* Footer status */}
      <div className="px-4 py-3 border-t border-gray-50">
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${isEmpty ? "bg-gray-300" : "bg-emerald-400"}`} />
          <p className="text-[10px] text-gray-400">
            {isEmpty ? "等待首次对话" : "记忆已同步"}
          </p>
          {hasPsychState && psych && (
            <span className="ml-auto text-[10px]" style={{ color: dominantColor }}>
              {psych.snapshots.length} 轮 · {psych.dominant}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
