"use client"

import { type FormEvent, useEffect, useMemo, useState } from "react"
import type { ManagedFile } from "@/types"
import {
  BUSINESS_SCENES,
  getDemoBusinessScenes,
  groupFilesByBusinessScene,
  type BusinessSceneLabel,
} from "@/lib/fileBusinessScene"
import { SOURCE_CHANNELS } from "@/lib/fileSourceChannel"

interface Props {
  onFileDeleted?: (id: string) => void
  onFilesCleared?: () => void
  thumbnailBadgeMode?: "default" | "scene"
}

type FileSearchApiResult = {
  id: string
  fileName: string
  title?: string | null
  mimeType?: string
  url?: string
  uploadedAt?: string
  sourceChannel?: string
  description?: string
  tags?: {
    subject?: string
    questionType?: string
    knowledgePoints?: string[]
  }
}

const HIDDEN_CATEGORY_LABELS = new Set(["un" + "known", "\u672a\u5206\u7c7b", "\u5f85\u5206\u7c7b"])

const SUBJECT_HEX: Record<string, string> = {
  数学: "var(--s-math)",
  物理: "var(--s-physics)",
  英语: "var(--s-english)",
  化学: "var(--s-chemistry)",
  语文: "var(--s-chinese)",
}

const SCENE_ACCENT: Record<string, string> = {
  全部: "var(--ink-1)",
  最近错题: "var(--rose)",
  本周作业: "var(--amber)",
  考试资料: "var(--brand)",
  学校通知: "var(--teal)",
  旅游照片: "var(--sage)",
  成长记录: "var(--clay)",
  复习资料: "#6B4FB0",
}

type ToolGroup = { group: string; tools: string[]; featured?: string }
type Tier = { tier: string; badge: string; description: string; kicker: string; featuredAccent: string; groups: ToolGroup[] }

const AI_TOOLBOX: Tier[] = [
  {
    tier: "通用处理",
    badge: "UTILITY",
    description: "面向任意文件的基础 AI 能力",
    kicker: "Tier · I",
    featuredAccent: "var(--ink-1)",
    groups: [
      { group: "图片处理", tools: ["去背景", "去笔迹", "试卷切割", "试卷切题", "内容提取"], featured: "去背景" },
      { group: "文档处理", tools: ["PDF 转 Word", "Word 转 PDF"] },
    ],
  },
  {
    tier: "学习场景",
    badge: "LEARNING",
    description: "理解题目并辅助学习的 AI 能力",
    kicker: "Tier · II",
    featuredAccent: "var(--brand)",
    groups: [
      { group: "学习场景", tools: ["错题回顾", "举一反三", "深度学习", "题目批改"], featured: "错题回顾" },
    ],
  },
]

// ── Pure data helpers (preserved) ──

function normalizeText(text: string) {
  return text.trim().toLowerCase().replace(/\s+/g, "")
}

function cleanSignal(value: string | null | undefined) {
  const normalized = (value || "").trim().replace(/\s+/g, " ")
  if (!normalized || HIDDEN_CATEGORY_LABELS.has(normalized.toLowerCase())) return ""
  return normalized
}

function normalizeSignals(values: Array<string | null | undefined> | undefined) {
  const out: string[] = []
  for (const item of values || []) {
    const signal = cleanSignal(item)
    if (!signal || out.includes(signal)) continue
    out.push(signal)
  }
  return out
}

function normalizeManagedFile(file: ManagedFile): ManagedFile {
  return {
    ...file,
    subject: cleanSignal(file.subject),
    questionType: cleanSignal(file.questionType),
    knowledgePoints: normalizeSignals(file.knowledgePoints),
  }
}

function memorySignals(file: ManagedFile) {
  return normalizeSignals([
    file.sourceChannel,
    file.subject,
    file.questionType,
    ...file.knowledgePoints,
    file.description,
  ]).slice(0, 3)
}

function searchableText(file: ManagedFile) {
  return normalizeText(
    [file.fileName, file.description, file.sourceChannel, file.subject, file.questionType, ...file.knowledgePoints]
      .filter(Boolean)
      .join(" "),
  )
}

function filterFiles(files: ManagedFile[], query: string) {
  const normalized = normalizeText(query)
  if (!normalized) return files
  return files.filter((file) => searchableText(file).includes(normalized))
}

function searchResultToManagedFile(result: FileSearchApiResult, existing?: ManagedFile): ManagedFile {
  if (existing) return normalizeManagedFile(existing)
  return normalizeManagedFile({
    id: result.id,
    fileName: result.fileName,
    title: result.title ?? null,
    mimeType: result.mimeType || "application/octet-stream",
    url: result.url || "",
    uploadedAt: result.uploadedAt || "",
    sourceChannel: result.sourceChannel,
    description: result.description || "",
    subject: result.tags?.subject || "",
    questionType: result.tags?.questionType || "",
    knowledgePoints: Array.isArray(result.tags?.knowledgePoints) ? result.tags.knowledgePoints : [],
  })
}

function isWrongQuestionCandidate(file: ManagedFile) {
  return (
    file.mimeType.startsWith("image/") &&
    file.questionType === "错题" &&
    getDemoBusinessScenes(file).includes("最近错题")
  )
}

// ── Editorial sub-components ──

const CHANNEL_HEX: Record<string, string> = {
  "微信": "#07C160",
  "QQ": "#1296DB",
  "钉钉": "#1A6FFF",
  "飞书": "#3370FF",
  "学校平台": "#A67C2D",
  "相册拍照": "#8B5563",
  "网盘收藏": "#6B4FB0",
}

function formatChannelTime(iso: string | undefined): string {
  if (!iso) return ""
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return ""
  const d = new Date(t)
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  if (sameDay) return `今日 ${hh}:${mm}`
  const M = String(d.getMonth() + 1).padStart(2, "0")
  const D = String(d.getDate()).padStart(2, "0")
  return `${M}/${D} ${hh}:${mm}`
}

function SourceChips({ files }: { files: ManagedFile[] }) {
  const counts = new Map<string, number>()
  for (const file of files) {
    const channel = file.sourceChannel || "微信"
    counts.set(channel, (counts.get(channel) || 0) + 1)
  }
  const total = files.length
  const channelsWithFiles = Array.from(counts.values()).filter((n) => n > 0).length
  const maxCount = Math.max(1, ...Array.from(counts.values()))

  // "本周新增" — files uploaded within the last 7 days
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const weekDelta = files.reduce((acc, f) => {
    const t = f.uploadedAt ? Date.parse(f.uploadedAt) : NaN
    return Number.isFinite(t) && t >= oneWeekAgo ? acc + 1 : acc
  }, 0)

  // 最近一次：latest file by uploadedAt
  const latestFile = files.reduce<ManagedFile | null>((best, f) => {
    const t = f.uploadedAt ? Date.parse(f.uploadedAt) : NaN
    if (!Number.isFinite(t)) return best
    const bestT = best?.uploadedAt ? Date.parse(best.uploadedAt) : NaN
    return !Number.isFinite(bestT) || t > bestT ? f : best
  }, null)
  const latestLabel = latestFile
    ? `最近一次：${formatChannelTime(latestFile.uploadedAt)} · ${latestFile.sourceChannel || "—"}`
    : ""

  return (
    <div data-onboarding-target="source-rail">
      {/* Section header — serif + italic English + right N份/M渠道 badge */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontSize: 21,
            fontWeight: 500,
            color: "var(--ink-1)",
            letterSpacing: "0.02em",
          }}
        >
          渠道汇总
        </h2>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: 12.5,
            color: "var(--ink-3)",
            letterSpacing: "0.04em",
          }}
        >
          multi-channel inbox
        </span>
        <span
          className="num"
          style={{
            marginLeft: "auto",
            fontSize: 12,
            color: "var(--ink-3)",
            fontWeight: 500,
            letterSpacing: "0.02em",
          }}
        >
          <strong style={{ color: "var(--ink-1)", fontWeight: 600, fontFamily: "var(--font-num)" }}>{total}</strong> 份
          {" / "}
          <strong style={{ color: "var(--ink-1)", fontWeight: 600, fontFamily: "var(--font-num)" }}>{channelsWithFiles}</strong> 渠道
        </span>
      </div>

      {/* Channel bars */}
      <div style={{ display: "grid", gap: 10 }}>
        {SOURCE_CHANNELS.map((channel) => {
          const count = counts.get(channel.label) || 0
          const accent = CHANNEL_HEX[channel.label] || "var(--ink-3)"
          const fillPct = count > 0 ? (count / maxCount) * 100 : 0
          return (
            <div
              key={channel.label}
              style={{
                display: "grid",
                gridTemplateColumns: "26px 64px 1fr 28px",
                gap: 12,
                alignItems: "center",
                paddingBottom: 9,
                borderBottom: "1px dashed var(--rule-soft)",
              }}
            >
              {/* Tinted icon block */}
              <span
                aria-hidden
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "var(--r-sm)",
                  background: count > 0 ? accent : "var(--paper)",
                  border: count > 0 ? "none" : "1px solid var(--rule-soft)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  color: count > 0 ? "#FFFFFF" : "var(--ink-4)",
                  fontFamily: "var(--font-display)",
                }}
              >
                {channel.label.slice(0, 1)}
              </span>
              {/* Label */}
              <span
                style={{
                  fontSize: 13,
                  color: "var(--ink-2)",
                  fontWeight: 600,
                  letterSpacing: "0.01em",
                }}
              >
                {channel.label}
              </span>
              {/* Progress bar */}
              <span
                style={{
                  position: "relative",
                  height: 6,
                  background: "var(--paper)",
                  borderRadius: 999,
                  overflow: "hidden",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: `${fillPct}%`,
                    background: count > 0 ? accent : "transparent",
                    opacity: 0.85,
                    transition: "width .25s ease",
                  }}
                />
              </span>
              {/* Count or em-dash for empty */}
              <span
                className="num"
                style={{
                  textAlign: "right",
                  fontSize: 13,
                  fontWeight: 600,
                  color: count > 0 ? "var(--ink-1)" : "var(--ink-4)",
                }}
              >
                {count > 0 ? count : "—"}
              </span>
            </div>
          )
        })}
      </div>

      {/* Footer — 本周新增 (left) + 最近一次 italic (right) */}
      <div
        style={{
          marginTop: 14,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span
          className="num"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 12px",
            background: "var(--card-warm)",
            border: "1px solid var(--rule-soft)",
            borderRadius: 999,
            fontSize: 11.5,
            fontWeight: 600,
            color: "var(--ink-2)",
          }}
        >
          本周新增 +{weekDelta}
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: 11.5,
            color: "var(--ink-4)",
          }}
        >
          {latestLabel || "where files arrive"}
        </span>
      </div>
    </div>
  )
}

function AIToolbox() {
  const totalTools = AI_TOOLBOX.reduce(
    (n, tier) => n + tier.groups.reduce((m, g) => m + g.tools.length, 0),
    0,
  )
  return (
    <div>
      {/* Inner header — mirrors the SourceChips header treatment */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontSize: 21,
            fontWeight: 500,
            color: "var(--ink-1)",
            letterSpacing: "0.02em",
          }}
        >
          AI 工具箱
        </h2>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: 12.5,
            color: "var(--ink-3)",
            letterSpacing: "0.04em",
          }}
        >
          smart actions
        </span>
        <span
          className="num"
          style={{
            marginLeft: "auto",
            fontSize: 12,
            color: "var(--ink-3)",
            fontWeight: 500,
            letterSpacing: "0.02em",
          }}
        >
          <strong style={{ color: "var(--ink-1)", fontWeight: 600, fontFamily: "var(--font-num)" }}>{totalTools}</strong> 项
          {" / "}
          <strong style={{ color: "var(--ink-1)", fontWeight: 600, fontFamily: "var(--font-num)" }}>{AI_TOOLBOX.length}</strong> 类
        </span>
      </div>

      {/* Tiers */}
      <div style={{ display: "grid", gap: 0 }}>
        {AI_TOOLBOX.map((tier, tierIdx) => (
          <div
            key={tier.tier}
            style={{
              display: "grid",
              gridTemplateColumns: "112px 1fr",
              gap: 18,
              paddingTop: tierIdx === 0 ? 0 : 16,
              paddingBottom: tierIdx === AI_TOOLBOX.length - 1 ? 0 : 16,
              borderTop: tierIdx === 0 ? "none" : "1px dashed var(--rule-soft)",
            }}
          >
            {/* Left: tier label column */}
            <div style={{ display: "grid", gap: 6, alignContent: "start" }}>
              <span
                style={{
                  fontSize: 9.5,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "var(--ink-4)",
                  fontWeight: 700,
                }}
              >
                {tier.kicker}
              </span>
              <h3
                style={{
                  margin: 0,
                  fontFamily: "var(--font-display)",
                  fontSize: 15,
                  fontWeight: 500,
                  color: "var(--ink-1)",
                  letterSpacing: "0.04em",
                }}
              >
                {tier.tier}
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: 11.5,
                  fontFamily: "var(--font-display)",
                  fontStyle: "italic",
                  color: "var(--ink-3)",
                  lineHeight: 1.55,
                }}
              >
                {tier.description}
              </p>
              <span
                style={{
                  marginTop: 4,
                  display: "inline-block",
                  width: "fit-content",
                  padding: "2px 8px",
                  fontSize: 9.5,
                  letterSpacing: "0.18em",
                  fontWeight: 700,
                  color: "#F5EFD9",
                  background: tier.featuredAccent,
                  border: `1px solid ${tier.featuredAccent}`,
                  borderRadius: "var(--r-sm)",
                }}
              >
                {tier.badge}
              </span>
            </div>

            {/* Right: groups + tool buttons */}
            <div style={{ display: "grid", gap: 14 }}>
              {tier.groups.map((g) => (
                <div
                  key={g.group}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "64px 1fr",
                    gap: 12,
                    alignItems: "baseline",
                  }}
                >
                  <span
                    style={{
                      fontSize: 11.5,
                      fontFamily: "var(--font-display)",
                      fontStyle: "italic",
                      color: "var(--ink-3)",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {g.group}
                  </span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {g.tools.map((t) => {
                      const isFeatured = g.featured === t
                      return (
                        <span
                          key={t}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "4px 11px",
                            fontSize: 12.5,
                            fontWeight: 600,
                            borderRadius: 999,
                            border: isFeatured
                              ? `1px solid ${tier.featuredAccent}`
                              : "1px solid var(--rule-soft)",
                            background: isFeatured ? tier.featuredAccent : "var(--paper)",
                            color: isFeatured ? "#F5EFD9" : "var(--ink-2)",
                            letterSpacing: "0.02em",
                          }}
                        >
                          <span
                            aria-hidden
                            style={{
                              width: 4,
                              height: 4,
                              borderRadius: "50%",
                              background: isFeatured ? "#F5EFD9" : "var(--ink-3)",
                              opacity: isFeatured ? 1 : 0.7,
                            }}
                          />
                          {t}
                        </span>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SceneTabs({
  files,
  activeScene,
  onSceneChange,
}: {
  files: ManagedFile[]
  activeScene: BusinessSceneLabel | "全部"
  onSceneChange: (scene: BusinessSceneLabel | "全部") => void
}) {
  const grouped = groupFilesByBusinessScene(files)
  const sceneItems: Array<BusinessSceneLabel | "全部"> = ["全部", ...BUSINESS_SCENES]
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "baseline" }}>
      {sceneItems.map((scene) => {
        const count = scene === "全部" ? files.length : grouped.get(scene)?.length || 0
        const active = activeScene === scene
        return (
          <button
            key={scene}
            type="button"
            onClick={() => onSceneChange(scene)}
            style={{
              display: "inline-flex",
              alignItems: "baseline",
              gap: 6,
              padding: 0,
              border: 0,
              background: "transparent",
              fontSize: 13,
              color: active ? "var(--ink-1)" : "var(--ink-3)",
              fontWeight: active ? 700 : 500,
              letterSpacing: "0.01em",
              cursor: "pointer",
              fontFamily: "var(--font-body)",
              transition: "color .15s",
            }}
          >
            <span>{scene}</span>
            <span
              className="num"
              style={{
                fontSize: 11,
                fontWeight: active ? 700 : 500,
                color: active ? "var(--ink-2)" : "var(--ink-4)",
              }}
            >
              {count}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function ThumbnailTile({
  file,
  activeScene,
  thumbnailBadgeMode,
  isOnboardingWrongQuestion,
  onDelete,
}: {
  file: ManagedFile
  activeScene: BusinessSceneLabel | "全部"
  thumbnailBadgeMode: "default" | "scene"
  isOnboardingWrongQuestion: boolean
  onDelete: (id: string) => void
}) {
  const [confirming, setConfirming] = useState(false)
  const signals = memorySignals(file)
  const sourceChannel = file.sourceChannel || "微信"
  const shouldShowSceneBadge = thumbnailBadgeMode === "scene" || activeScene !== "全部"
  const badgeScene = activeScene === "全部" ? getDemoBusinessScenes(file)[0] : activeScene
  const badgeLabel = shouldShowSceneBadge ? badgeScene ?? "已分类" : sourceChannel
  const badgeAccent = shouldShowSceneBadge
    ? SCENE_ACCENT[badgeScene ?? "全部"] ?? "var(--ink-3)"
    : "var(--ink-3)"
  const subjectAccent = SUBJECT_HEX[file.subject] ?? "var(--ink-4)"

  const handleDeleteClick = () => {
    if (confirming) {
      onDelete(file.id)
      setConfirming(false)
      return
    }
    setConfirming(true)
    setTimeout(() => setConfirming(false), 3000)
  }

  return (
    <div
      data-onboarding-photo-origin={isOnboardingWrongQuestion ? "wrong-question" : undefined}
      style={{
        position: "relative",
        aspectRatio: "1 / 1",
        background: "var(--card-warm)",
        borderRadius: "var(--r-md)",
        overflow: "hidden",
        border: "1px solid var(--rule)",
        cursor: "pointer",
      }}
      className="group"
    >
      {file.mimeType.startsWith("image/") ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={file.url}
          alt={file.fileName}
          style={{ height: "100%", width: "100%", objectFit: "cover" }}
          loading="lazy"
        />
      ) : (
        <div
          style={{
            display: "flex",
            height: "100%",
            width: "100%",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 56,
              fontWeight: 300,
              color: subjectAccent,
              opacity: 0.18,
              letterSpacing: "-0.05em",
              userSelect: "none",
            }}
          >
            {file.subject || "?"}
          </span>
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            style={{ position: "absolute", color: "var(--ink-3)" }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
      )}

      <span
        style={{
          position: "absolute",
          top: 6,
          left: 6,
          padding: "2px 7px",
          background: shouldShowSceneBadge ? badgeAccent : "rgba(255,255,255,.85)",
          color: shouldShowSceneBadge ? "#fff" : "var(--ink-2)",
          fontSize: 10,
          fontWeight: 700,
          borderRadius: 4,
          maxWidth: "80%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {badgeLabel}
      </span>

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          background: "linear-gradient(to top, rgba(26,26,31,.78), transparent 55%)",
          padding: 8,
          opacity: 0,
          transition: "opacity .2s",
        }}
        className="hover-overlay"
      >
        <p
          style={{
            margin: 0,
            fontSize: 10,
            fontWeight: 700,
            color: "#fff",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={file.fileName}
        >
          {file.fileName}
        </p>
        {signals.length > 0 && (
          <p
            style={{
              margin: "2px 0 0",
              fontSize: 9,
              color: "rgba(255,255,255,.75)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            记忆线索 · {signals.join(" / ")}
          </p>
        )}
        <button
          type="button"
          onClick={handleDeleteClick}
          style={{
            marginTop: 6,
            width: "fit-content",
            padding: "2px 8px",
            fontSize: 9,
            fontWeight: 700,
            color: "#fff",
            background: confirming ? "var(--rose)" : "rgba(255,255,255,.18)",
            border: 0,
            borderRadius: 999,
            cursor: "pointer",
          }}
        >
          {confirming ? "确认删除" : "删除"}
        </button>
      </div>
    </div>
  )
}

export default function FileManagerPanel({
  onFileDeleted,
  onFilesCleared,
  thumbnailBadgeMode = "default",
}: Props) {
  const [files, setFiles] = useState<ManagedFile[]>([])
  const [loading, setLoading] = useState(true)
  const [draftQuery, setDraftQuery] = useState("")
  const [submittedQuery, setSubmittedQuery] = useState("")
  const [searchResults, setSearchResults] = useState<ManagedFile[] | null>(null)
  const [activeScene, setActiveScene] = useState<BusinessSceneLabel | "全部">("全部")
  const [querying, setQuerying] = useState(false)

  const fetchFiles = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/files/list")
      if (res.ok) {
        const json = await res.json()
        const nextFiles = Array.isArray(json.files) ? json.files.map(normalizeManagedFile) : []
        setFiles(nextFiles)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFiles()
  }, [])

  const visibleFiles = useMemo(() => {
    const baseFiles = !submittedQuery ? files : searchResults || filterFiles(files, submittedQuery)
    if (activeScene === "全部") return baseFiles
    return baseFiles.filter((file) => getDemoBusinessScenes(file).includes(activeScene))
  }, [activeScene, files, searchResults, submittedQuery])

  const onboardingWrongQuestionId = useMemo(
    () => visibleFiles.find((file) => isWrongQuestionCandidate(file))?.id ?? null,
    [visibleFiles],
  )

  const handleQuerySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextQuery = draftQuery.trim()
    setSubmittedQuery(nextQuery)
    setSearchResults(null)
    if (!nextQuery) return
    setQuerying(true)
    try {
      const res = await fetch("/api/files/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: nextQuery, topK: 24 }),
      })
      if (!res.ok) throw new Error("search failed")
      const json = await res.json()
      const existingById = new Map(files.map((file) => [file.id, file]))
      const results = Array.isArray(json.results) ? json.results : []
      setSearchResults(
        results.map((result: FileSearchApiResult) =>
          searchResultToManagedFile(result, existingById.get(result.id)),
        ),
      )
    } catch {
      setSearchResults(filterFiles(files, nextQuery))
    } finally {
      setQuerying(false)
    }
  }

  const clearSubmittedQuery = () => {
    setDraftQuery("")
    setSubmittedQuery("")
    setSearchResults(null)
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/files/${id}`, { method: "DELETE" })
      if (res.ok) {
        setFiles((prev) => prev.filter((f) => f.id !== id))
        setSearchResults((prev) => prev?.filter((f) => f.id !== id) ?? null)
        onFileDeleted?.(id)
      }
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 0" }}>
        <div className="dot-pulse" style={{ display: "flex", gap: 6 }}>
          <span /><span /><span />
        </div>
      </div>
    )
  }

  return (
    <div
      className="paper-tooth"
      style={{
        background: "var(--wash-paper)",
        padding: "36px 44px 56px",
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
          gap: 12,
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--ink-3)",
          fontWeight: 700,
        }}
      >
        <span>文件中心</span>
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
          File Center · {files.length} files
        </span>
      </div>

      {/* Workstation — 渠道汇总 (left) + AI 工具箱 (right) inside one editorial card */}
      <section
        style={{
          marginTop: 24,
          background: "var(--card)",
          border: "1px solid var(--rule)",
          borderRadius: "var(--r-lg)",
          boxShadow: "var(--shadow-2)",
          padding: "26px 30px 28px",
        }}
      >
        {/* Workstation eyebrow — kicker + title + flex rule + italic English */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 22,
          }}
        >
          <span
            style={{
              fontSize: 9.5,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: "var(--ink-4)",
              fontWeight: 800,
            }}
          >
            工作台
          </span>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 14,
              fontWeight: 500,
              color: "var(--ink-2)",
              letterSpacing: "0.02em",
            }}
          >
            渠道汇总 & AI 工具箱
          </span>
          <span aria-hidden style={{ flex: 1, height: 1, background: "var(--rule-soft)" }} />
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: 11.5,
              color: "var(--ink-4)",
              whiteSpace: "nowrap",
            }}
          >
            where files arrive · how AI helps
          </span>
        </div>

        {/* Two-column body, with a vertical binding rule between them */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "5fr 1px 7fr",
            gap: 28,
            alignItems: "start",
          }}
        >
          <SourceChips files={files} />
          <span style={{ alignSelf: "stretch", background: "var(--rule-soft)" }} aria-hidden />
          <AIToolbox />
        </div>
      </section>

      {/* Search tier — minimal: small label + 52px input + hint chips */}
      <section style={{ marginTop: 28 }} data-onboarding-target="ai-search">
        <div
          style={{
            fontSize: 13,
            color: "var(--ink-3)",
            fontWeight: 500,
            marginBottom: 10,
            letterSpacing: "0.01em",
          }}
        >
          小迪 · 文件助手
        </div>

        <form onSubmit={handleQuerySubmit} style={{ position: "relative", maxWidth: 480 }}>
          <span
            aria-hidden
            style={{
              position: "absolute",
              left: 18,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--ink-4)",
              display: "flex",
              alignItems: "center",
              pointerEvents: "none",
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
          </span>
          <input
            value={draftQuery}
            onChange={(e) => setDraftQuery(e.target.value)}
            placeholder="时间、来源、内容、场景——说一句就行"
            disabled={files.length === 0}
            style={{
              width: "100%",
              height: 52,
              padding: draftQuery ? "0 46px 0 44px" : "0 22px 0 44px",
              background: "var(--card)",
              border: "1px solid var(--rule-soft)",
              borderRadius: 999,
              fontSize: 14.5,
              color: "var(--ink-1)",
              outline: "none",
              boxShadow: "var(--shadow-1)",
              fontFamily: "var(--font-body)",
              opacity: files.length === 0 ? 0.55 : 1,
            }}
          />
          {draftQuery && (
            <button
              type="button"
              onClick={() => {
                setDraftQuery("")
                clearSubmittedQuery()
              }}
              aria-label="清空输入"
              style={{
                position: "absolute",
                right: 14,
                top: "50%",
                transform: "translateY(-50%)",
                width: 22,
                height: 22,
                padding: 0,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                border: 0,
                borderRadius: 999,
                background: "var(--paper)",
                color: "var(--ink-3)",
                cursor: "pointer",
              }}
            >
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M2 2l8 8M10 2l-8 8" />
              </svg>
            </button>
          )}
        </form>

        {querying && (
          <div
            style={{
              marginTop: 10,
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              color: "var(--ink-3)",
            }}
          >
            <div className="dot-pulse" style={{ display: "flex", gap: 4 }}>
              <span /><span /><span />
            </div>
            <span>正在查找相关文件…</span>
          </div>
        )}

        {/* Suggestion hint chips — direct, no leading label */}
        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {[
            "上周做错的那道英语题",
            "妈妈在钉钉里发的考试通知",
            "暑假在草原拍的那张照片",
            "老师讲化学时的那份讲义",
          ].map((hint) => (
            <button
              key={hint}
              type="button"
              onClick={() => setDraftQuery(hint)}
              style={{
                padding: "6px 14px",
                background: "var(--paper)",
                border: "1px solid var(--rule-soft)",
                borderRadius: 999,
                fontSize: 13,
                color: "var(--ink-3)",
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "var(--font-body)",
              }}
            >
              {hint}
            </button>
          ))}
        </div>
      </section>

      {/* Hairline divider — separates "find new" from "browse existing" */}
      <div
        aria-hidden
        style={{
          marginTop: 28,
          marginBottom: 18,
          height: 1,
          background: "var(--rule-soft)",
          opacity: 0.6,
        }}
      />

      {/* Tier 3 — Scene tabs + Photo grid (hairline above lives in search-tier) */}
      <div
        style={{
          paddingBottom: 8,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <SceneTabs files={files} activeScene={activeScene} onSceneChange={setActiveScene} />
        {submittedQuery && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              fontSize: 12,
            }}
          >
            <p
              style={{
                margin: 0,
                color: "var(--ink-3)",
                fontStyle: "italic",
                fontFamily: "var(--font-display)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              “{submittedQuery}”
            </p>
            <button
              type="button"
              onClick={clearSubmittedQuery}
              style={{
                background: "transparent",
                border: 0,
                fontSize: 12,
                fontWeight: 600,
                color: "var(--ink-3)",
                cursor: "pointer",
              }}
            >
              查看全部 →
            </button>
          </div>
        )}
      </div>

      <div data-onboarding-target="photo-grid" style={{ marginTop: 18, minHeight: 128 }}>
        {files.length === 0 ? (
          <p style={{ padding: "40px 0", textAlign: "center", fontSize: 13, color: "var(--ink-4)" }}>
            上传文件后，AI 会把来源、时间和内容线索放进这里。
          </p>
        ) : visibleFiles.length === 0 ? (
          <p style={{ padding: "40px 0", textAlign: "center", fontSize: 13, color: "var(--ink-4)" }}>
            {activeScene === "全部"
              ? "没找到相关文件。可以换个时间、来源或内容再试。"
              : "这个场景下暂时没有匹配文件。"}
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(118px, 1fr))",
              gap: 8,
            }}
          >
            {visibleFiles.map((file) => {
              const shouldMarkOnboardingWrongQuestion = onboardingWrongQuestionId === file.id
              const isOnboardingWrongQuestion =
                shouldMarkOnboardingWrongQuestion && isWrongQuestionCandidate(file)
              return (
                <ThumbnailTile
                  key={file.id}
                  file={file}
                  activeScene={activeScene}
                  thumbnailBadgeMode={thumbnailBadgeMode}
                  isOnboardingWrongQuestion={isOnboardingWrongQuestion}
                  onDelete={handleDelete}
                />
              )
            })}
          </div>
        )}
      </div>

      <style>{`
        .group:hover > .hover-overlay { opacity: 1 !important; }
      `}</style>
    </div>
  )
}
