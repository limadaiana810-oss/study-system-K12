"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import type {
  DemoStage,
  FileCard,
  InferredCandidate,
  MemoryEntry,
  MemoryExtractionResult,
  Message,
  TurnInsight,
  UploadedFile,
} from "@/types"
import { QUICK_REPLIES } from "@/lib/demoScript"
import { extractMemory, stripMemoryTags, mergeMemory, hasMemoryData } from "@/lib/memoryParser"
import { extractFileResults, stripFileResultTags } from "@/lib/fileResultParser"
import { buildFileResultQuery, pickResolvedSearchResult } from "@/lib/fileResultResolver"
import { attachFileUnderstanding, buildTurnInsightFromMemory, markFileUnderstandingFailed } from "@/lib/turnInsight"
import { AI_INTRO } from "@/lib/prompts"
import MessageBubble from "./MessageBubble"
import QuickReplyBar from "./QuickReplyBar"

interface Props {
  memory: MemoryEntry
  onMemoryUpdate: (m: MemoryEntry) => void
  pendingInferred: InferredCandidate[]
  onInferredCandidates: (cands: InferredCandidate[]) => void
  onTurnInsightUpdate: (insight: TurnInsight) => void
  uploadedFiles: UploadedFile[]
  onFileUpload: (base64: string, mime: string, name: string) => void
  stage: DemoStage
  onStageChange: (s: DemoStage) => void
}

type SearchApiResult = {
  fileName: string
  title?: string | null
  mimeType?: string
  url?: string
  uploadedAt?: string
  tags?: {
    subject?: string
    questionType?: string
    knowledgePoints?: string[]
  }
}

type UploadIndexResponse = {
  canonicalName?: string
  description?: string
  subject?: string
  knowledgePoints?: string[]
  questionType?: string
  status?: "ready" | "partial"
}

function isRetrieveIntent(text: string) {
  return /(整理|找|查找|搜索|查看|给我看|调出|找到)/.test(text)
}

function normalizeQueryText(text: string) {
  return (text || "")
    .trim()
    .toLowerCase()
    // 去掉常见标点与空白（保留中文字符）
    .replace(/[\s，,。.!！?？:：;；()（）【】\[\]{}<>《》"“”'‘’]/g, "")
}

const TAG_SYNONYMS: Record<string, string[]> = {
  // 可按业务继续扩展（偏“演示可用”）
  高数: ["高等数学", "微积分"],
  英语: ["英文"],
  语文: ["中文"],
  错题: ["错题本", "错题集", "错题整理"],
  物理: ["力学", "电磁学"],
  化学: ["有机", "无机"],
}

function expandSynonyms(term: string): string[] {
  const out = new Set<string>([term])
  for (const [k, vs] of Object.entries(TAG_SYNONYMS)) {
    if (term === k) vs.forEach((v) => out.add(v))
    if (vs.includes(term)) out.add(k)
  }
  return [...out]
}

function buildQueryTerms(text: string, knownTags: string[]) {
  const normalized = normalizeQueryText(text)
  const out = new Set<string>()

  // 1) 已知 tag 的直接命中（支持“英语错题”连写）
  for (const t of knownTags) {
    if (!t) continue
    if (normalized.includes(normalizeQueryText(t))) out.add(t)
  }

  // 2) n-gram 兜底（让“模糊语义/复合词”更容易命中描述字段）
  // 控制数量：仅取 2/3-gram，且最多 24 个，避免过度匹配
  const grams: string[] = []
  for (const n of [2, 3]) {
    for (let i = 0; i + n <= normalized.length; i++) grams.push(normalized.slice(i, i + n))
  }
  for (const g of grams.slice(0, 24)) out.add(g)

  // 3) 同义词扩展（用于 tag 精确命中不足时）
  for (const t of [...out]) {
    expandSynonyms(t).forEach((x) => out.add(x))
  }

  return [...out].filter(Boolean)
}

async function fillMissingFileData(cards: FileCard[]): Promise<FileCard[]> {
  const missing = cards.filter((c) => !c.base64 && !c.url)
  if (missing.length === 0) return cards

  const fetched = await Promise.all(
    missing.map((c) =>
      fetch("/api/files/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: c.name, topK: 3 }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
    )
  )

  const nameToData: Record<string, { base64?: string; mimeType?: string; url?: string }> = {}
  for (const json of fetched) {
    for (const r of json?.results ?? []) {
      if (r.fileName) {
        nameToData[r.fileName] = {
          base64: r.base64,
          mimeType: r.mimeType,
          url: r.url,
        }
      }
    }
  }

  return cards.map((c) =>
    c.base64 || c.url
      ? c
      : {
          ...c,
          base64: nameToData[c.name]?.base64 ?? "",
          url: nameToData[c.name]?.url ?? c.url,
          mimeType: nameToData[c.name]?.mimeType ?? c.mimeType,
        }
  )
}

function mergeCardTags(result: SearchApiResult | undefined, fallback: string[] = []) {
  return [
    ...(result?.tags?.subject ? [result.tags.subject] : []),
    ...(result?.tags?.questionType ? [result.tags.questionType] : []),
    ...(Array.isArray(result?.tags?.knowledgePoints) ? result.tags.knowledgePoints : []),
    ...fallback,
  ].filter((value, index, array) => !!value && array.indexOf(value) === index)
}

async function resolveFileCardsFromRefs(refs: ReturnType<typeof extractFileResults>, localFiles: UploadedFile[]): Promise<FileCard[]> {
  const resolved = await Promise.all(
    refs.map(async (ref) => {
      const localMatch = ref.fileName ? localFiles.find((file) => file.name === ref.fileName) : undefined
      const query = buildFileResultQuery(ref)
      let matched: SearchApiResult | undefined

      if (query) {
        const json = await fetch("/api/files/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, topK: 5 }),
        })
          .then((res) => (res.ok ? res.json() : null))
          .catch(() => null)

        matched = pickResolvedSearchResult(ref, json?.results ?? [])
      }

      if (!matched && !localMatch) return null

      return {
        name: matched?.fileName || ref.fileName || ref.canonicalName || localMatch?.name || "已归档文件",
        base64: localMatch?.base64 || "",
        url: matched?.url,
        mimeType: matched?.mimeType || localMatch?.mimeType || "image/jpeg",
        tags: mergeCardTags(matched, ref.tags || []),
        uploadedAt: new Date(matched?.uploadedAt || ref.uploadedAt || localMatch?.uploadedAt || new Date().toISOString()),
      } satisfies FileCard
    })
  )

  return resolved.filter(Boolean) as FileCard[]
}

function scoreFileForQuery(params: { queryTerms: string[]; fileName: string; tags: string[]; description?: string }) {
  const { queryTerms, fileName, tags, description } = params
  const nFileName = normalizeQueryText(fileName)
  const nDesc = normalizeQueryText(description || "")
  const nTags = tags.map((t) => normalizeQueryText(t))

  let score = 0

  for (const q0 of queryTerms) {
    const q = normalizeQueryText(q0)
    if (!q) continue

    // 文件名命中：更强的信号
    if (nFileName && (nFileName.includes(q) || q.includes(nFileName))) score += 2.0

    // tag 命中：强信号
    for (const t of nTags) {
      if (!t) continue
      if (t === q) score += 2.2
      else if (t.includes(q) || q.includes(t)) score += 1.2
    }

    // 描述命中：弱信号（允许“模糊语义”）
    if (nDesc && nDesc.includes(q)) score += 0.6
  }

  // 小的去噪：tag 越多/越泛，不额外加分
  return score
}

function buildApiMessages(msgs: Message[]) {
  // 限制历史记录数量，防止 payload 过大导致 ECONNRESET 或超时
  const MAX_HISTORY = 10
  const history = msgs.slice(-MAX_HISTORY)

  return history
    .filter((m) => !m.isStreaming)
    .map((m, idx) => {
      const contentForModel =
        m.role === "assistant"
          ? (m.rawContent ?? m.content) // 助手消息回传 rawContent，保留 <memory>/<file-result>
          : m.content

      // 只有最后一条用户消息才携带图片 base64，减少重复传输
      const isLastUserMessage = idx === history.length - 1 && m.role === "user"

      if (m.imageBase64 && isLastUserMessage) {
        const attachmentInfo = m.attachmentName
          ? `\n\n[附件信息]\n- 文件名: ${m.attachmentName}\n- 上传时间: ${m.attachmentUploadedAt ?? ""}\n（请在 <memory>.fileIndex 中用 fileName 建立可检索索引）`
          : ""

        return {
          role: m.role,
          content: [
            { type: "text", text: (contentForModel || "分类这个文件") + attachmentInfo },
            { type: "image_url", image_url: { url: `data:${m.imageMime};base64,${m.imageBase64}` } },
          ],
        }
      }
      // 历史消息中的图片只保留文本描述（如果有），或者直接传文本
      return { role: m.role, content: contentForModel }
    })
}

export default function ChatPanel({
  memory,
  onMemoryUpdate,
  pendingInferred,
  onInferredCandidates,
  onTurnInsightUpdate,
  uploadedFiles,
  onFileUpload,
  stage,
  onStageChange,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "intro",
      role: "assistant",
      content: AI_INTRO,
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [pendingUploads, setPendingUploads] = useState<UploadedFile[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const messagesRef = useRef<Message[]>(messages)
  const activeTurnIdRef = useRef<string | null>(null)

  useEffect(() => { messagesRef.current = messages }, [messages])
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        const base64 = result.split(",")[1]
        const mime = file.type || "image/jpeg"
        const newFile: UploadedFile = {
          id: crypto.randomUUID(),
          name: file.name,
          base64,
          mimeType: mime,
          uploadedAt: new Date(),
        }
        setPendingUploads(prev => [...prev, newFile])
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ""
  }, [])

  const sendMessage = useCallback(
    async (text: string, files: UploadedFile[] = []) => {
      if (isStreaming) return
      if (!text.trim() && files.length === 0) return

      // 纯前端兜底检索：如果用户在“找/查看/整理”且本地已有关联索引，则不依赖模型也能找回文件
      if (files.length === 0 && isRetrieveIntent(text) && memory.fileIndex?.length) {
        // 方案 B（SQLite 服务端索引）：优先走服务端检索（embedding + tags），失败再回退前端模糊匹配
        try {
          const res = await fetch("/api/files/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: text, topK: 6 }),
          })
          if (res.ok) {
            const json = await res.json()
            const results = json?.results ?? []
            const fileCards: FileCard[] = results
              .map((r: any) => ({
                name: r.fileName,
                base64: r.base64,
                url: r.url,
                mimeType: r.mimeType || "image/jpeg",
                tags: [
                  ...(r.tags?.subject ? [r.tags.subject] : []),
                  ...(r.tags?.questionType ? [r.tags.questionType] : []),
                  ...(Array.isArray(r.tags?.knowledgePoints) ? r.tags.knowledgePoints : []),
                ].filter(Boolean),
                uploadedAt: new Date(r.uploadedAt || new Date().toISOString()),
              }))

            if (fileCards.length > 0) {
            const userMsg: Message = {
              id: crypto.randomUUID(),
              role: "user",
              content: text,
              timestamp: new Date(),
            }
            activeTurnIdRef.current = userMsg.id
            const aiMsg: Message = {
              id: crypto.randomUUID(),
              role: "assistant",
              content: `好的，已为你找到 ${fileCards.length} 个文件。`,
              fileCards,
              timestamp: new Date(),
            }
            onTurnInsightUpdate(buildTurnInsightFromMemory({
              turnId: userMsg.id,
              userText: userMsg.content,
              extracted: { delta: {}, inferredCandidates: [] },
            }))
            setMessages((prev) => {
              const next = [...prev, userMsg, aiMsg]
              messagesRef.current = next
              return next
            })
            onStageChange("done")
            return
          }
          }
        } catch {
          // ignore and fallback
        }

        const knownTags = [...new Set(memory.fileIndex.flatMap((f) => f.tags || []))]
        const queryTerms = buildQueryTerms(text, knownTags)
        if (queryTerms.length > 0) {
          // 评分排序 + 阈值过滤：支持“模糊语义”召回
          const scored = memory.fileIndex
            .map((f) => ({
              f,
              score: scoreFileForQuery({
                queryTerms,
                fileName: f.fileName,
                tags: f.tags || [],
                description: f.description,
              }),
            }))
            .filter((x) => x.score >= 2.2) // 至少命中 1 个 tag（或强描述）才返回
            .sort((a, b) => b.score - a.score)

          const hits = scored.map((x) => x.f).slice(0, 6)

          let fileCards: FileCard[] = hits
            .map((h) => {
              const found = uploadedFiles.find((f) => f.name === h.fileName)
              if (!found) return null
              return {
                name: found.name,
                base64: found.base64,
                mimeType: found.mimeType,
                tags: h.tags || [],
                uploadedAt: new Date(found.uploadedAt),
              }
            })
            .filter(Boolean) as FileCard[]

          fileCards = await fillMissingFileData(fileCards)

          const userMsg: Message = {
            id: crypto.randomUUID(),
            role: "user",
            content: text,
            timestamp: new Date(),
          }
          activeTurnIdRef.current = userMsg.id
          const aiMsg: Message = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: fileCards.length > 0 ? `好的，已为你找到 ${fileCards.length} 个文件。` : "我没找到匹配的文件，换个说法试试？",
            fileCards: fileCards.length > 0 ? fileCards : undefined,
            timestamp: new Date(),
          }
          onTurnInsightUpdate(buildTurnInsightFromMemory({
            turnId: userMsg.id,
            userText: userMsg.content,
            extracted: { delta: {}, inferredCandidates: [] },
          }))
          setMessages((prev) => {
            const next = [...prev, userMsg, aiMsg]
            messagesRef.current = next
            return next
          })
          onStageChange("done")
          return
        }
      }

      // 记录所有文件到全局 state（localStorage 持久化）
      files.forEach((f) => onFileUpload(f.base64, f.mimeType, f.name))

      setIsStreaming(true)
      setPendingUploads([])

      // 批量上传：对每个文件单独走一次“识别/打标/入索引”，避免只识别第一张导致“搜不到”
      const batch = files.length > 0 ? files : [undefined]
      let memorySnapshot = memory

      for (let i = 0; i < batch.length; i++) {
        const file = batch[i]

        const userMsg: Message = {
          id: crypto.randomUUID(),
          role: "user",
          content: file ? (text.trim() || "分类这个文件") : text,
          imageBase64: file?.base64,
          imageMime: file?.mimeType,
          attachmentName: file?.name,
          attachmentUploadedAt: file?.uploadedAt ? file.uploadedAt.toISOString() : undefined,
          timestamp: new Date(),
        }
        activeTurnIdRef.current = userMsg.id
        setMessages((prev) => {
          const next = [...prev, userMsg]
          messagesRef.current = next
          return next
        })

        const aiMsgId = crypto.randomUUID()
        setMessages((prev) => {
          const next = [
            ...prev,
            { id: aiMsgId, role: "assistant" as const, content: "", timestamp: new Date(), isStreaming: true },
          ]
          messagesRef.current = next
          return next
        })

        let latestInsight: TurnInsight | null = null
        const publishTurnInsight = (extractedResult: MemoryExtractionResult) => {
          latestInsight = buildTurnInsightFromMemory({
            turnId: userMsg.id,
            userText: userMsg.content,
            extracted: extractedResult,
          })
          onTurnInsightUpdate(latestInsight)
          return latestInsight
        }
        const ensureTurnInsight = () => {
          if (latestInsight) return latestInsight
          latestInsight = buildTurnInsightFromMemory({
            turnId: userMsg.id,
            userText: userMsg.content,
            extracted: { delta: {}, inferredCandidates: [] },
          })
          onTurnInsightUpdate(latestInsight)
          return latestInsight
        }
        const uploadFileForInsight = async (params: { description?: string; tagsHint?: string[] }) => {
          if (!file?.name) return
          const baseInsight = ensureTurnInsight()
          const isStillActiveTurn = () => activeTurnIdRef.current === userMsg.id
          try {
            const res = await fetch("/api/files/upload", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: file.id,
                fileName: file.name,
                mimeType: file.mimeType,
                base64: file.base64,
                uploadedAt: file.uploadedAt ? file.uploadedAt.toISOString() : new Date().toISOString(),
                description: params.description || "",
                tagsHint: params.tagsHint || [],
              }),
            })
            if (!res.ok) throw new Error(await res.text())
            const json = (await res.json()) as UploadIndexResponse
            if (!isStillActiveTurn()) return
            latestInsight = attachFileUnderstanding(baseInsight, {
              originalName: file.name,
              canonicalName: json.canonicalName,
              description: json.description,
              subject: json.subject,
              knowledgePoints: json.knowledgePoints,
              questionType: json.questionType,
              status: json.status,
            })
            onTurnInsightUpdate(latestInsight)
          } catch {
            if (!isStillActiveTurn()) return
            latestInsight = markFileUnderstandingFailed(baseInsight, file.name)
            onTurnInsightUpdate(latestInsight)
          }
        }

        try {
          const allMsgs = [...messagesRef.current]
          // Strip psychState before sending — model doesn't need emotion history for retrieval
          const { psychState: _ps, ...memoryForApi } = (memorySnapshot ?? {}) as any
          const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: buildApiMessages(allMsgs),
              hasImage: !!file,
              memorySnapshot: memoryForApi,
              pendingInferredSnapshot: pendingInferred.map((c) => ({ field: c.field, op: c.op, value: c.value })),
            }),
          })

          if (!response.ok) throw new Error(await response.text())

          const reader = response.body!.getReader()
          const decoder = new TextDecoder()
          let buf = ""
          let fullContent = ""
          let streamMemoryUpdated = false

          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buf += decoder.decode(value, { stream: true })
            const lines = buf.split("\n")
            buf = lines.pop() ?? ""

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue
              const data = line.slice(6).trim()
              if (data === "[DONE]") continue
              try {
                const json = JSON.parse(data)
                const chunk: string = json.choices?.[0]?.delta?.content ?? ""
                if (!chunk) continue
                fullContent += chunk
                const display = stripFileResultTags(stripMemoryTags(fullContent))
                setMessages((prev) => {
                  const next = prev.map((m) => (m.id === aiMsgId ? { ...m, content: display } : m))
                  messagesRef.current = next
                  return next
                })
                // 实时更新记忆：一旦检测到完整的 </memory> 标签就立即更新，不等 stream 结束
                if (!streamMemoryUpdated && fullContent.includes("</memory>")) {
                  streamMemoryUpdated = true
                  const earlyExtracted = extractMemory(fullContent)
                  if (earlyExtracted && (hasMemoryData(earlyExtracted.delta) || earlyExtracted.emotionSnapshot)) {
                    const earlyMerged = mergeMemory(memorySnapshot, earlyExtracted.delta, earlyExtracted.emotionSnapshot)
                    memorySnapshot = earlyMerged
                    onMemoryUpdate(earlyMerged)
                    publishTurnInsight(earlyExtracted)
                  }
                }
              } catch { /* skip malformed SSE line */ }
            }
          }

          // Parse tags after stream completes
          const extracted = extractMemory(fullContent)
          if (extracted) {
            publishTurnInsight(extracted)

            // 1) 流中已实时更新，这里只补兜底 fileIndex（模型漏写时）
            {
              let merged = streamMemoryUpdated ? memorySnapshot : mergeMemory(memorySnapshot, extracted.delta, extracted.emotionSnapshot)

              // 兜底：即使模型没输出 fileIndex，也用”本次上传的附件名 + 解析出的 tags/description”构建可检索索引
              if (file?.name && (extracted.delta.fileTags?.length || extracted.delta.fileDescription)) {
                merged = mergeMemory(merged, {
                  fileIndex: [
                    {
                      fileName: file.name,
                      tags: extracted.delta.fileTags || [],
                      uploadedAt: file.uploadedAt ? file.uploadedAt.toISOString() : undefined,
                      description: extracted.delta.fileDescription,
                    },
                  ],
                })
              }

              memorySnapshot = merged
              onMemoryUpdate(merged)

              // 方案 B（SQLite 服务端索引）：
              // 上传完成后，把“原图 + 描述 + tagsHint”交给服务端做：
              // 1) 结构化 tags 抽取（学科/题型/知识点/日期）
              // 2) embedding（OpenRouter embeddings）
              // 3) SQLite 关联存储
              if (file?.name) {
                void uploadFileForInsight({
                  description: extracted.delta.fileDescription || "",
                  tagsHint: extracted.delta.fileTags || [],
                })
              }
            }

            // 2) 隐式记忆：只进入待确认队列
            if (extracted.inferredCandidates.length > 0) {
              onInferredCandidates(extracted.inferredCandidates)
            }

            // State machine: only advance to "uploaded" when a file was actually uploaded
            if (stage === "intro" && (files.length > 0 || extracted.delta.fileTags?.length)) {
              onStageChange("uploaded")
            }
          } else if (file?.name) {
            void uploadFileForInsight({ description: "", tagsHint: [] })
          } else {
            ensureTurnInsight()
          }

          const fileResults = extractFileResults(fullContent)
          if (fileResults.length > 0) {
            let fileCards = await resolveFileCardsFromRefs(fileResults, [...uploadedFiles, ...files])
            fileCards = await fillMissingFileData(fileCards)

            setMessages((prev) => {
              const next = prev.map((m) => (m.id === aiMsgId ? { ...m, isStreaming: false, fileCards, rawContent: fullContent } : m))
              messagesRef.current = next
              return next
            })
            onStageChange("done")
          } else {
            setMessages((prev) => {
              const next = prev.map((m) => (m.id === aiMsgId ? { ...m, isStreaming: false, rawContent: fullContent } : m))
              messagesRef.current = next
              return next
            })
          }
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : "请求失败"
          setMessages((prev) => {
            const next = prev.map((m) => (m.id === aiMsgId ? { ...m, content: `⚠️ ${errMsg}`, isStreaming: false } : m))
            messagesRef.current = next
            return next
          })
        }
      }

      setIsStreaming(false)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      isStreaming,
      memory,
      stage,
      uploadedFiles,
      pendingInferred,
      onFileUpload,
      onInferredCandidates,
      onMemoryUpdate,
      onStageChange,
      onTurnInsightUpdate,
    ]
  )

  const handleQuickReply = useCallback(
    (id: string) => {
      const reply = QUICK_REPLIES.find((r) => r.id === id)
      if (!reply) return
      if (reply.triggerUpload) {
        fileInputRef.current?.click()
        setInput(reply.message)
      } else {
        sendMessage(reply.message)
      }
    },
    [sendMessage]
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isStreaming) return
    sendMessage(input.trim(), pendingUploads)
    setInput("")
  }

  const removePendingUpload = (id: string) => {
    setPendingUploads(prev => prev.filter(f => f.id !== id))
  }

  return (
    <div className="h-full flex flex-col bg-[#F8F9FA]">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shadow-sm">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">DeliClaw</p>
          <p className="text-[11px] text-emerald-500 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            在线
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Quick replies */}
      <QuickReplyBar stage={stage} disabled={isStreaming} onSelect={handleQuickReply} />

      {/* Input */}
      <div className="px-4 pb-4">
        <form onSubmit={handleSubmit} className="flex items-end gap-2 bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="说点什么…"
            disabled={isStreaming}
            className="flex-1 text-sm text-gray-800 bg-transparent outline-none placeholder:text-gray-300 disabled:opacity-50"
          />
          <label className="cursor-pointer text-gray-400 hover:text-indigo-500 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
          <button
            type="submit"
            disabled={isStreaming || (!input.trim() && pendingUploads.length === 0)}
            className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
        {pendingUploads.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {pendingUploads.map((file) => (
              <div key={file.id} className="group relative">
                <div className="w-12 h-12 rounded-lg border border-indigo-100 overflow-hidden shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`data:${file.mimeType};base64,${file.base64}`}
                    alt="preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  onClick={() => removePendingUpload(file.id)}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            <div className="h-12 flex items-center px-1">
               <span className="text-[10px] text-indigo-500 font-medium">准备上传 {pendingUploads.length} 个文件</span>
             </div>
           </div>
         )}
       </div>
    </div>
  )
}
