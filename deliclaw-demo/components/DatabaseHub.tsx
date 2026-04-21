"use client"

import type { InferredCandidate, MemoryEntry, TurnInsight } from "@/types"
import { EMOTION_COLOR } from "@/lib/memoryParser"
import MemoryCard from "./MemoryCard"

interface Props {
  memory: MemoryEntry
  turnInsight: TurnInsight | null
  pendingInferred: InferredCandidate[]
  onAcceptInferred: (id: string) => void
  onRejectInferred: (id: string) => void
}

type FileSummary = {
  fileName: string
  tags: string[]
  uploadedAt?: string
  description?: string
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

function stringifyValue(value: string | string[]) {
  return Array.isArray(value) ? value.join("，") : value
}

function hasInferredValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value.length > 0
  return !!value
}

function hasTurnInsightDetail(turnInsight: TurnInsight | null) {
  return !!(
    turnInsight &&
    (
      turnInsight.factualAdded.length > 0 ||
      turnInsight.inferredPending.length > 0 ||
      turnInsight.emotion ||
      turnInsight.fileUnderstanding
    )
  )
}

function recentFiles(memory: MemoryEntry): FileSummary[] {
  const indexed = memory.fileIndex || []
  if (indexed.length > 0) {
    return indexed.slice(-3).reverse().map((item) => ({
      fileName: item.fileName,
      tags: item.tags || [],
      uploadedAt: item.uploadedAt,
      description: item.description,
    }))
  }

  if (memory.fileTags?.length || memory.fileDescription) {
    return [
      {
        fileName: "最近解析文件",
        tags: memory.fileTags || [],
        description: memory.fileDescription,
      },
    ]
  }

  return []
}

function InsightChip({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "confirmed" | "pending" }) {
  const styles = {
    neutral: "bg-slate-100 text-slate-600",
    confirmed: "bg-emerald-50 text-emerald-700",
    pending: "bg-amber-50 text-amber-700",
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${styles[tone]}`}>
      {label}
    </span>
  )
}

function TurnInsightPanel({ turnInsight }: { turnInsight: TurnInsight | null }) {
  const hasDetail = hasTurnInsightDetail(turnInsight)
  const file = turnInsight?.fileUnderstanding
  const fileStatus =
    file?.status === "failed" ? "文件未入库" :
    file?.status === "ready" ? "文件已入库" :
    file ? "部分入库" : ""

  return (
    <section className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-3.5 shadow-sm animate-[pulse_0.8s_ease-out_1]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600">本轮理解</p>
          <p className="mt-0.5 text-sm font-bold text-slate-900">我刚刚理解到</p>
        </div>
        <InsightChip label={turnInsight ? "刚刚更新" : "等待输入"} tone={turnInsight ? "confirmed" : "neutral"} />
      </div>

      {turnInsight?.userText && (
        <div className="mt-3 rounded-xl bg-white/80 p-2.5 ring-1 ring-slate-100">
          <p className="text-[10px] font-semibold text-slate-400">你刚刚说了</p>
          <p className="mt-1 line-clamp-3 text-[12px] leading-relaxed text-slate-700">「{turnInsight.userText}」</p>
        </div>
      )}

      {!turnInsight && (
        <p className="mt-3 rounded-xl bg-white/80 p-2.5 text-[12px] leading-relaxed text-slate-500 ring-1 ring-slate-100">
          先发送一句话或上传一个文件，我会在这里展示理解过程。
        </p>
      )}

      {turnInsight && !hasDetail && (
        <p className="mt-3 rounded-xl bg-white/80 p-2.5 text-[12px] leading-relaxed text-slate-500 ring-1 ring-slate-100">
          这一轮没有新增记忆，但对话上下文已参与理解。
        </p>
      )}

      {turnInsight?.factualAdded.length ? (
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <InsightChip label="已确认" tone="confirmed" />
            <p className="text-[11px] font-bold text-slate-700">我确认的事实</p>
          </div>
          {turnInsight.factualAdded.map((fact) => (
            <div key={`${fact.label}-${fact.value}`} className="flex items-center justify-between rounded-lg bg-white/80 px-2.5 py-2 ring-1 ring-emerald-100">
              <span className="text-[11px] text-slate-400">{fact.label}</span>
              <span className="text-[12px] font-semibold text-slate-800">{fact.value}</span>
            </div>
          ))}
        </div>
      ) : null}

      {turnInsight?.emotion && (
        <div className="mt-3 rounded-xl bg-white/80 p-2.5 ring-1 ring-slate-100">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-700">我感知到的状态</p>
            <span className="text-[12px] font-bold" style={{ color: EMOTION_COLOR[turnInsight.emotion.emotion] ?? "#64748B" }}>
              {turnInsight.emotion.emotion}
            </span>
          </div>
          {turnInsight.emotion.evidence && (
            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">依据：{turnInsight.emotion.evidence}</p>
          )}
        </div>
      )}

      {turnInsight?.inferredPending.length ? (
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <InsightChip label="待确认" tone="pending" />
            <p className="text-[11px] font-bold text-slate-700">我准备记住的内容</p>
          </div>
          {turnInsight.inferredPending.map((item) => (
            <div key={`${item.label}-${item.value}`} className="rounded-lg bg-white/80 px-2.5 py-2 ring-1 ring-amber-100">
              <p className="text-[12px] font-semibold text-slate-800">{item.label}：{item.value}</p>
              {item.evidence && <p className="mt-1 text-[11px] leading-relaxed text-slate-400">依据：{item.evidence}</p>}
            </div>
          ))}
        </div>
      ) : null}

      {file && (
        <div className="mt-3 rounded-xl bg-white/85 p-2.5 ring-1 ring-sky-100">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold text-slate-700">我如何理解这个文件</p>
            <InsightChip label={fileStatus} tone={file.status === "failed" ? "pending" : "confirmed"} />
          </div>
          <p className="mt-1 text-[12px] font-semibold text-slate-800">{file.originalName}</p>
          {file.canonicalName && <p className="mt-1 text-[11px] text-slate-400">标准名：{file.canonicalName}</p>}
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{file.description}</p>
          {file.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {file.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export default function DatabaseHub({ memory, turnInsight, pendingInferred, onAcceptInferred, onRejectInferred }: Props) {
  const hasFactual = memory.factual && Object.values(memory.factual).some(Boolean)
  const hasInferred = memory.inferred && Object.values(memory.inferred).some(hasInferredValue)
  const hasPending = pendingInferred && pendingInferred.length > 0
  const hasPsychState = memory.psychState && memory.psychState.snapshots.length > 0
  const files = recentFiles(memory)
  const hasFiles = files.length > 0
  const isEmpty = !hasFactual && !hasInferred && !hasPending && !hasPsychState && !hasFiles

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
            <p className="text-[10px] text-gray-400">理解过程 + 长期记忆</p>
          </div>
        </div>
      </div>

      {/* Memory cards */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <TurnInsightPanel key={turnInsight?.turnId ?? "empty-turn-insight"} turnInsight={turnInsight} />

        {isEmpty ? (
          /* 冷启动引导 */
          <div className="space-y-3">
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3.5">
              <p className="text-xs font-bold text-slate-700 mb-2">长期记忆会沉淀到这里</p>
              <div className="space-y-2">
                {[
                  { color: "#3B82F6", label: "事实记忆", desc: "姓名、年级、学校等你告诉我的信息" },
                  { color: "#F59E0B", label: "待确认推测", desc: "作息、偏好，需要你确认后才写入" },
                  { color: "#EC4899", label: "情绪趋势", desc: "每轮对话感知状态并形成趋势" },
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
            {/* 事实记忆区域 */}
            {hasFactual && (
              <section className="space-y-2">
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
              </section>
            )}

            {/* 待确认推测区域 */}
            {(hasPending || hasInferred) && (
              <section className="space-y-2">
                <div className="flex items-center gap-1.5 px-1">
                  <div className="w-1 h-3 bg-amber-500 rounded-full" />
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                    待确认推测{hasPending ? `（${pendingInferred.length}）` : ""}
                  </p>
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
                      {stringifyValue(c.value)}
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
                          确认后写入长期记忆
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {hasInferred && !hasPending && (
                  <p className="rounded-xl bg-emerald-50 px-3 py-2 text-[11px] leading-relaxed text-emerald-700">
                    之前的推测已由你确认，并沉淀为长期理解。
                  </p>
                )}
                {memory.inferred?.sleepPattern && (
                  <MemoryCard label="已确认作息" value={memory.inferred.sleepPattern} accent="#10B981" />
                )}
                {memory.inferred?.mood && (
                  <MemoryCard label="已确认状态" value={memory.inferred.mood} accent="#10B981" />
                )}
                {memory.inferred?.preferences && memory.inferred.preferences.length > 0 && (
                  <MemoryCard label="已确认偏好" tags={memory.inferred.preferences} accent="#10B981" />
                )}
              </section>
            )}

            {/* 情绪趋势区域 */}
            {hasPsychState && psych && (
              <section className="space-y-2">
                <div className="flex items-center gap-1.5 px-1">
                  <div className="w-1 h-3 rounded-full" style={{ backgroundColor: dominantColor }} />
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">情绪趋势</p>
                </div>

                <div
                  className="rounded-xl bg-white p-3 shadow-sm border border-gray-100"
                  style={{ borderLeftWidth: 3, borderLeftColor: dominantColor }}
                >
                  <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1.5">当前趋势</p>
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
                      最近依据：「{psych.snapshots[psych.snapshots.length - 1].evidence}」
                    </p>
                  )}
                </div>
              </section>
            )}

            {/* 文件索引区域 */}
            {hasFiles && (
              <section className="space-y-2">
                <div className="flex items-center gap-1.5 px-1">
                  <div className="w-1 h-3 bg-cyan-500 rounded-full" />
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">文件索引</p>
                </div>
                {files.map((file) => (
                  <div key={`${file.fileName}-${file.uploadedAt || file.description || ""}`} className="rounded-xl bg-white p-3 shadow-sm border border-gray-100 border-l-[3px] border-l-cyan-500">
                    <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1.5">
                      {file.uploadedAt ? `入库 ${file.uploadedAt}` : "最近文件"}
                    </p>
                    <p className="text-sm font-semibold text-gray-800">{file.fileName}</p>
                    {file.description && <p className="mt-1 text-[11px] leading-relaxed text-gray-400">{file.description}</p>}
                    {file.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {file.tags.map((tag) => (
                          <span key={tag} className="rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold text-cyan-700">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </section>
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
