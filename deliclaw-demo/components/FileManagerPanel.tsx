"use client"

import { type FormEvent, useEffect, useMemo, useState } from "react"
import type { ManagedFile } from "@/types"
import { BUSINESS_SCENES, getDemoBusinessScenes, groupFilesByBusinessScene, type BusinessSceneLabel } from "@/lib/fileBusinessScene"
import { SOURCE_CHANNELS, type SourceChannelLabel } from "@/lib/fileSourceChannel"

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

type SourceVisualTone = {
  shell: string
  dot: string
  count: string
  tile: string
  badge: string
  document: string
  documentIcon: string
  overlay: string
}

type SceneVisualTone = {
  sceneIcon: string
  shell: string
  activeShell: string
  icon: string
  count: string
  badge: string
}

type AIToolboxGroup = {
  label: string
  tone: string
  tools: string[]
}

const SOURCE_VISUAL_TONES: Record<SourceChannelLabel, SourceVisualTone> = {
  微信: {
    shell: "border-emerald-200/80 from-emerald-50 via-white to-lime-100 text-emerald-700 shadow-[0_10px_30px_rgba(16,185,129,0.14)]",
    dot: "bg-emerald-500",
    count: "bg-emerald-600 text-white",
    tile: "bg-gradient-to-br from-emerald-100 via-white to-lime-100 ring-emerald-200/80 hover:ring-emerald-400 hover:shadow-[0_14px_32px_rgba(16,185,129,0.22)]",
    badge: "bg-emerald-600/90 text-white shadow-[0_6px_16px_rgba(16,185,129,0.26)]",
    document: "bg-gradient-to-br from-emerald-100 via-white to-lime-100 text-emerald-500",
    documentIcon: "text-emerald-500",
    overlay: "from-emerald-950/80 via-slate-900/20 to-transparent",
  },
  QQ: {
    shell: "border-sky-200/80 from-sky-50 via-white to-cyan-100 text-sky-700 shadow-[0_10px_30px_rgba(14,165,233,0.14)]",
    dot: "bg-sky-500",
    count: "bg-sky-600 text-white",
    tile: "bg-gradient-to-br from-sky-100 via-white to-cyan-100 ring-sky-200/80 hover:ring-sky-400 hover:shadow-[0_14px_32px_rgba(14,165,233,0.22)]",
    badge: "bg-sky-600/90 text-white shadow-[0_6px_16px_rgba(14,165,233,0.26)]",
    document: "bg-gradient-to-br from-sky-100 via-white to-cyan-100 text-sky-500",
    documentIcon: "text-sky-500",
    overlay: "from-sky-950/80 via-slate-900/20 to-transparent",
  },
  钉钉: {
    shell: "border-blue-200/80 from-blue-50 via-white to-sky-100 text-blue-700 shadow-[0_10px_30px_rgba(37,99,235,0.14)]",
    dot: "bg-blue-500",
    count: "bg-blue-600 text-white",
    tile: "bg-gradient-to-br from-blue-100 via-white to-sky-100 ring-blue-200/80 hover:ring-blue-400 hover:shadow-[0_14px_32px_rgba(37,99,235,0.22)]",
    badge: "bg-blue-600/90 text-white shadow-[0_6px_16px_rgba(37,99,235,0.26)]",
    document: "bg-gradient-to-br from-blue-100 via-white to-sky-100 text-blue-500",
    documentIcon: "text-blue-500",
    overlay: "from-blue-950/80 via-slate-900/20 to-transparent",
  },
  飞书: {
    shell: "border-indigo-200/80 from-indigo-50 via-white to-violet-100 text-indigo-700 shadow-[0_10px_30px_rgba(79,70,229,0.14)]",
    dot: "bg-indigo-500",
    count: "bg-indigo-600 text-white",
    tile: "bg-gradient-to-br from-indigo-100 via-white to-violet-100 ring-indigo-200/80 hover:ring-indigo-400 hover:shadow-[0_14px_32px_rgba(79,70,229,0.24)]",
    badge: "bg-indigo-600/90 text-white shadow-[0_6px_16px_rgba(79,70,229,0.28)]",
    document: "bg-gradient-to-br from-indigo-100 via-white to-violet-100 text-indigo-500",
    documentIcon: "text-indigo-500",
    overlay: "from-indigo-950/80 via-slate-900/20 to-transparent",
  },
  学校平台: {
    shell: "border-amber-200/80 from-amber-50 via-white to-yellow-100 text-amber-700 shadow-[0_10px_30px_rgba(245,158,11,0.14)]",
    dot: "bg-amber-500",
    count: "bg-amber-600 text-white",
    tile: "bg-gradient-to-br from-amber-100 via-white to-yellow-100 ring-amber-200/80 hover:ring-amber-400 hover:shadow-[0_14px_32px_rgba(245,158,11,0.22)]",
    badge: "bg-amber-600/90 text-white shadow-[0_6px_16px_rgba(245,158,11,0.26)]",
    document: "bg-gradient-to-br from-amber-100 via-white to-yellow-100 text-amber-500",
    documentIcon: "text-amber-500",
    overlay: "from-amber-950/80 via-slate-900/20 to-transparent",
  },
  相册拍照: {
    shell: "border-rose-200/80 from-rose-50 via-white to-pink-100 text-rose-700 shadow-[0_10px_30px_rgba(244,63,94,0.14)]",
    dot: "bg-rose-500",
    count: "bg-rose-600 text-white",
    tile: "bg-gradient-to-br from-rose-100 via-white to-pink-100 ring-rose-200/80 hover:ring-rose-400 hover:shadow-[0_14px_32px_rgba(244,63,94,0.22)]",
    badge: "bg-rose-600/90 text-white shadow-[0_6px_16px_rgba(244,63,94,0.26)]",
    document: "bg-gradient-to-br from-rose-100 via-white to-pink-100 text-rose-500",
    documentIcon: "text-rose-500",
    overlay: "from-rose-950/80 via-slate-900/20 to-transparent",
  },
  网盘收藏: {
    shell: "border-violet-200/80 from-violet-50 via-white to-fuchsia-100 text-violet-700 shadow-[0_10px_30px_rgba(139,92,246,0.14)]",
    dot: "bg-violet-500",
    count: "bg-violet-600 text-white",
    tile: "bg-gradient-to-br from-violet-100 via-white to-fuchsia-100 ring-violet-200/80 hover:ring-violet-400 hover:shadow-[0_14px_32px_rgba(139,92,246,0.23)]",
    badge: "bg-violet-600/90 text-white shadow-[0_6px_16px_rgba(139,92,246,0.28)]",
    document: "bg-gradient-to-br from-violet-100 via-white to-fuchsia-100 text-violet-500",
    documentIcon: "text-violet-500",
    overlay: "from-violet-950/80 via-slate-900/20 to-transparent",
  },
}

const SCENE_VISUAL_TONES: Record<BusinessSceneLabel | "全部", SceneVisualTone> = {
  全部: {
    sceneIcon: "全",
    shell: "border-slate-200 bg-white text-slate-600 ring-slate-200 hover:border-slate-300 hover:bg-slate-50",
    activeShell: "border-slate-950 bg-slate-950 text-white ring-slate-950 shadow-[0_10px_24px_rgba(15,23,42,0.18)]",
    icon: "bg-white text-slate-900",
    count: "bg-slate-100 text-slate-500",
    badge: "bg-slate-950/90 text-white shadow-[0_6px_16px_rgba(15,23,42,0.24)]",
  },
  最近错题: {
    sceneIcon: "错",
    shell: "border-rose-200 bg-rose-50/80 text-rose-700 ring-rose-100 hover:border-rose-300 hover:bg-rose-100",
    activeShell: "border-rose-500 bg-rose-600 text-white ring-rose-500 shadow-[0_10px_24px_rgba(225,29,72,0.22)]",
    icon: "bg-white text-rose-600",
    count: "bg-rose-100 text-rose-600",
    badge: "bg-rose-600/90 text-white shadow-[0_6px_16px_rgba(225,29,72,0.26)]",
  },
  本周作业: {
    sceneIcon: "作",
    shell: "border-amber-200 bg-amber-50/80 text-amber-700 ring-amber-100 hover:border-amber-300 hover:bg-amber-100",
    activeShell: "border-amber-500 bg-amber-500 text-white ring-amber-500 shadow-[0_10px_24px_rgba(245,158,11,0.22)]",
    icon: "bg-white text-amber-600",
    count: "bg-amber-100 text-amber-700",
    badge: "bg-amber-600/90 text-white shadow-[0_6px_16px_rgba(245,158,11,0.26)]",
  },
  考试资料: {
    sceneIcon: "考",
    shell: "border-sky-200 bg-sky-50/80 text-sky-700 ring-sky-100 hover:border-sky-300 hover:bg-sky-100",
    activeShell: "border-sky-500 bg-sky-600 text-white ring-sky-500 shadow-[0_10px_24px_rgba(14,165,233,0.22)]",
    icon: "bg-white text-sky-600",
    count: "bg-sky-100 text-sky-600",
    badge: "bg-sky-600/90 text-white shadow-[0_6px_16px_rgba(14,165,233,0.26)]",
  },
  学校通知: {
    sceneIcon: "通",
    shell: "border-blue-200 bg-blue-50/80 text-blue-700 ring-blue-100 hover:border-blue-300 hover:bg-blue-100",
    activeShell: "border-blue-500 bg-blue-600 text-white ring-blue-500 shadow-[0_10px_24px_rgba(37,99,235,0.22)]",
    icon: "bg-white text-blue-600",
    count: "bg-blue-100 text-blue-600",
    badge: "bg-blue-600/90 text-white shadow-[0_6px_16px_rgba(37,99,235,0.26)]",
  },
  旅游照片: {
    sceneIcon: "旅",
    shell: "border-teal-200 bg-teal-50/80 text-teal-700 ring-teal-100 hover:border-teal-300 hover:bg-teal-100",
    activeShell: "border-teal-500 bg-teal-600 text-white ring-teal-500 shadow-[0_10px_24px_rgba(13,148,136,0.22)]",
    icon: "bg-white text-teal-600",
    count: "bg-teal-100 text-teal-600",
    badge: "bg-teal-600/90 text-white shadow-[0_6px_16px_rgba(13,148,136,0.26)]",
  },
  成长记录: {
    sceneIcon: "长",
    shell: "border-fuchsia-200 bg-fuchsia-50/80 text-fuchsia-700 ring-fuchsia-100 hover:border-fuchsia-300 hover:bg-fuchsia-100",
    activeShell: "border-fuchsia-500 bg-fuchsia-600 text-white ring-fuchsia-500 shadow-[0_10px_24px_rgba(192,38,211,0.22)]",
    icon: "bg-white text-fuchsia-600",
    count: "bg-fuchsia-100 text-fuchsia-600",
    badge: "bg-fuchsia-600/90 text-white shadow-[0_6px_16px_rgba(192,38,211,0.26)]",
  },
  复习资料: {
    sceneIcon: "习",
    shell: "border-violet-200 bg-violet-50/80 text-violet-700 ring-violet-100 hover:border-violet-300 hover:bg-violet-100",
    activeShell: "border-violet-500 bg-violet-600 text-white ring-violet-500 shadow-[0_10px_24px_rgba(124,58,237,0.22)]",
    icon: "bg-white text-violet-600",
    count: "bg-violet-100 text-violet-600",
    badge: "bg-violet-600/90 text-white shadow-[0_6px_16px_rgba(124,58,237,0.26)]",
  },
}

const AI_TOOLBOX_GROUPS: AIToolboxGroup[] = [
  {
    label: "图片处理类",
    tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
    tools: ["去背景", "去笔迹", "试卷切割", "试卷切题"],
  },
  {
    label: "文档处理类",
    tone: "bg-sky-50 text-sky-700 border-sky-200",
    tools: ["PDF转word", "word转PDF"],
  },
]

function getSourceVisualTone(sourceChannel?: string) {
  if (sourceChannel && sourceChannel in SOURCE_VISUAL_TONES) {
    return SOURCE_VISUAL_TONES[sourceChannel as SourceChannelLabel]
  }
  return SOURCE_VISUAL_TONES["微信"]
}

function getSceneVisualTone(scene: BusinessSceneLabel | "全部") {
  return SCENE_VISUAL_TONES[scene]
}

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
  return normalizeText([
    file.fileName,
    file.description,
    file.sourceChannel,
    file.subject,
    file.questionType,
    ...file.knowledgePoints,
  ].filter(Boolean).join(" "))
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
  return file.mimeType.startsWith("image/") && file.questionType === "错题" && getDemoBusinessScenes(file).includes("最近错题")
}

function SourceChips({ files }: { files: ManagedFile[] }) {
  const counts = new Map<string, number>()
  for (const file of files) {
    const channel = file.sourceChannel || "微信"
    counts.set(channel, (counts.get(channel) || 0) + 1)
  }

  return (
    <div data-onboarding-target="source-rail" className="min-w-0 flex-1 space-y-3">
      <div className="min-w-0">
        <p className="text-xs font-black text-slate-950">多渠道汇总</p>
      </div>
      <div className="iosSourceRail grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-3 lg:grid-cols-7">
        {SOURCE_CHANNELS.map((channel) => {
          const count = counts.get(channel.label) || 0
          const tone = getSourceVisualTone(channel.label)
          return (
            <span
              key={channel.label}
              className={`flex min-h-12 min-w-0 items-center justify-between gap-2 rounded-[22px] border bg-gradient-to-br px-3 py-2 font-black backdrop-blur transition-transform hover:-translate-y-0.5 ${tone.shell}`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className={`h-2 w-2 shrink-0 rounded-full ${tone.dot}`} />
                <span className="truncate">{channel.label}</span>
              </span>
              <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] leading-none ${tone.count}`}>
                {count}
              </span>
            </span>
          )
        })}
      </div>

      <section className="rounded-[24px] border border-slate-200/70 bg-white/75 p-3 shadow-[0_12px_32px_rgba(15,23,42,0.06)] backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-950 text-[10px] font-black text-white">
            AI
          </span>
          <p className="text-xs font-black text-slate-950">AI 工具箱</p>
        </div>

        <div className="mt-3 space-y-2.5">
          {AI_TOOLBOX_GROUPS.map((group) => (
            <div key={group.label} className="flex flex-col gap-2 md:flex-row md:items-center">
              <span className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-[10px] font-black ${group.tone}`}>
                {group.label}
              </span>
              <div className="flex flex-wrap gap-2">
                {group.tools.map((tool) => (
                  <span
                    key={tool}
                    className="rounded-full border border-slate-200 bg-white/85 px-2.5 py-1 text-[11px] font-semibold text-slate-600 shadow-[0_4px_12px_rgba(15,23,42,0.04)]"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
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
    <div className="sceneTaskRail flex gap-2 overflow-x-auto pb-1">
      {sceneItems.map((scene) => {
        const count = scene === "全部" ? files.length : grouped.get(scene)?.length || 0
        const active = activeScene === scene
        const tone = getSceneVisualTone(scene)
        return (
          <button
            key={scene}
            type="button"
            onClick={() => onSceneChange(scene)}
            className={`flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-2.5 py-1.5 text-[11px] font-black ring-1 transition-all hover:-translate-y-0.5 ${
              active ? tone.activeShell : tone.shell
            }`}
          >
            <span className={`sceneIcon flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${tone.icon}`}>
              {tone.sceneIcon}
            </span>
            <span className="truncate">{scene}</span>
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] leading-none ${active ? "bg-white/20 text-white" : tone.count}`}>
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
  const tone = getSourceVisualTone(sourceChannel)
  const shouldShowSceneBadge = thumbnailBadgeMode === "scene" || activeScene !== "全部"
  const badgeScene = activeScene === "全部" ? getDemoBusinessScenes(file)[0] : activeScene
  const badgeLabel = shouldShowSceneBadge ? badgeScene ?? "已分类" : sourceChannel
  const badgeTone = shouldShowSceneBadge ? getSceneVisualTone(badgeScene ?? "全部").badge : tone.badge

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
      className={`group relative aspect-square overflow-hidden rounded-xl ring-1 transition-all hover:z-10 hover:scale-[1.025] ${tone.tile}`}
    >
      {file.mimeType.startsWith("image/") ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={file.url} alt={file.fileName} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className={`flex h-full w-full items-center justify-center ${tone.document}`}>
          <svg className={`h-6 w-6 ${tone.documentIcon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
      )}

      <span className={`absolute left-1 top-1 max-w-[80%] truncate rounded-full px-1.5 py-0.5 text-[8px] font-black backdrop-blur ${badgeTone}`}>
        {badgeLabel}
      </span>

      <div className={`absolute inset-0 flex flex-col justify-end bg-gradient-to-t p-2 opacity-0 transition-opacity group-hover:opacity-100 ${tone.overlay}`}>
        <p className="truncate text-[10px] font-bold text-white" title={file.fileName}>
          {file.fileName}
        </p>
        {signals.length > 0 && (
          <p className="mt-0.5 truncate text-[8px] font-medium text-white/75">
            记忆线索 · {signals.join(" / ")}
          </p>
        )}
        <button
          type="button"
          onClick={handleDeleteClick}
          className={`mt-1 w-fit rounded-full px-2 py-0.5 text-[8px] font-bold text-white ${
            confirming ? "bg-red-500" : "bg-white/20 hover:bg-red-500"
          }`}
        >
          {confirming ? "确认删除" : "删除"}
        </button>
      </div>
    </div>
  )
}

export default function FileManagerPanel({ onFileDeleted, onFilesCleared, thumbnailBadgeMode = "default" }: Props) {
  const [files, setFiles] = useState<ManagedFile[]>([])
  const [loading, setLoading] = useState(true)
  const [draftQuery, setDraftQuery] = useState("")
  const [submittedQuery, setSubmittedQuery] = useState("")
  const [searchResults, setSearchResults] = useState<ManagedFile[] | null>(null)
  const [activeScene, setActiveScene] = useState<BusinessSceneLabel | "全部">("全部")
  const [querying, setQuerying] = useState(false)
  const [clearConfirming, setClearConfirming] = useState(false)

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
    [visibleFiles]
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
        results.map((result: FileSearchApiResult) => searchResultToManagedFile(result, existingById.get(result.id)))
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

  const handleClearAll = async () => {
    if (!clearConfirming) {
      setClearConfirming(true)
      setTimeout(() => setClearConfirming(false), 3000)
      return
    }
    try {
      const res = await fetch("/api/files/clear", { method: "POST" })
      if (res.ok) {
        setFiles([])
        clearSubmittedQuery()
        onFilesCleared?.()
      }
    } catch {
      // ignore
    } finally {
      setClearConfirming(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="dot-pulse flex gap-1.5">
          <span /><span /><span />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 text-slate-950">
      <SourceChips files={files} />

      <section data-onboarding-target="ai-search" className="commandSurface mx-auto max-w-3xl pt-2 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-500">AI 文件系统</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">想找哪份文件？</h2>
        <form onSubmit={handleQuerySubmit} className="mt-4 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition-shadow focus-within:shadow-md">
          <label className="min-w-0 flex-1">
            <input
              value={draftQuery}
              onChange={(event) => setDraftQuery(event.target.value)}
              placeholder="例如：找上周的英语错题，或者草原旅行照片"
              className="w-full bg-transparent px-2 py-2 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-300"
            />
          </label>
          <button
            type="submit"
            disabled={querying || files.length === 0}
            className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {querying ? "查找中" : "查找"}
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            disabled={files.length === 0}
            className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              clearConfirming ? "bg-red-50 text-red-600" : "text-slate-400 hover:bg-slate-100 hover:text-red-500"
            }`}
          >
            {clearConfirming ? "再次确认" : "清空"}
          </button>
        </form>
        <p className="mt-2 text-xs font-medium text-slate-400">可以说时间、来源、内容或场景</p>
        {querying && (
          <div className="mt-3 flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">
            <div className="dot-pulse flex gap-1">
              <span /><span /><span />
            </div>
            <span>正在查找相关文件…</span>
          </div>
        )}
      </section>

      <div className="space-y-3 border-y border-slate-200/70 py-3">
        <SceneTabs files={files} activeScene={activeScene} onSceneChange={setActiveScene} />

        {submittedQuery && (
          <div className="flex items-center justify-between gap-3 text-xs">
            <p className="min-w-0 truncate font-semibold text-slate-500">“{submittedQuery}”</p>
            <button type="button" onClick={clearSubmittedQuery} className="shrink-0 font-bold text-slate-400 hover:text-indigo-600">
              查看全部
            </button>
          </div>
        )}

      </div>

      <div data-onboarding-target="photo-grid" className="min-h-32">
        {files.length === 0 ? (
          <p className="py-10 text-center text-sm font-medium text-slate-400">
            上传文件后，AI 会把来源、时间和内容线索放进这里。
          </p>
        ) : visibleFiles.length === 0 ? (
          <p className="py-10 text-center text-sm font-medium text-slate-400">
            {activeScene === "全部" ? "没找到相关文件。可以换个时间、来源或内容再试。" : "这个场景下暂时没有匹配文件。"}
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 2xl:grid-cols-10">
            {visibleFiles.map((file) => {
              const shouldMarkOnboardingWrongQuestion = onboardingWrongQuestionId === file.id
              const isOnboardingWrongQuestion = shouldMarkOnboardingWrongQuestion && isWrongQuestionCandidate(file)

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
    </div>
  )
}
