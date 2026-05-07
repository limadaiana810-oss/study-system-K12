"use client"

import { useState, useEffect, useRef } from "react"
import type { DemoStage, MemoryEntry, UploadedFile, InferredCandidate, TurnInsight } from "@/types"
import ChatPanel from "@/components/ChatPanel"
import DatabaseHub from "@/components/DatabaseHub"
import { applyInferredCandidate, dedupeCandidates } from "@/lib/memoryParser"
import { FILE_CENTER_ONBOARDING_STORAGE_KEY } from "@/lib/onboardingStorage"
import { acceptDueInferredCandidates, getNextAutoConfirmDelay } from "@/lib/pendingInferred"

const MEMORY_STORAGE_KEY = "deliclaw_memory"
const FILES_STORAGE_KEY = "deliclaw_files"
const STAGE_STORAGE_KEY = "deliclaw_stage"
const PENDING_INFERRED_STORAGE_KEY = "deliclaw_inferred_pending"

export default function Home() {
  const [memory, setMemory] = useState<MemoryEntry>({})
  const [stage, setStage] = useState<DemoStage>("intro")
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [pendingInferred, setPendingInferred] = useState<InferredCandidate[]>([])
  const [turnInsight, setTurnInsight] = useState<TurnInsight | null>(null)
  const [activeView, setActiveView] = useState<"chat" | "files" | "reports">("chat")
  const [isLoaded, setIsLoaded] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const isResettingRef = useRef(false)
  const memoryRef = useRef(memory)
  const pendingInferredRef = useRef(pendingInferred)

  /**
   * 注意：不要把 Base64 原图写入 localStorage。
   * localStorage 通常只有 5~10MB 配额，几张图片就会触发 QuotaExceededError。
   * 这里仅持久化"文件元信息"（用于 UI 展示/兼容），文件内容由服务端 SQLite 方案存储与检索。
   */
  function toPersistedFileMeta(files: UploadedFile[]) {
    // 控制数量，避免 localStorage 膨胀（只存最近 50 条元信息）
    return files.slice(-50).map((f) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      uploadedAt: f.uploadedAt instanceof Date ? f.uploadedAt.toISOString() : String(f.uploadedAt),
    }))
  }

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedMemory = localStorage.getItem(MEMORY_STORAGE_KEY)
      const savedFiles = localStorage.getItem(FILES_STORAGE_KEY)
      const savedStage = localStorage.getItem(STAGE_STORAGE_KEY)
      const savedPending = localStorage.getItem(PENDING_INFERRED_STORAGE_KEY)

      if (savedMemory) {
        try {
          const parsed = JSON.parse(savedMemory)
          // 保护：确保解析结果是对象，不是 null/undefined
          if (parsed && typeof parsed === "object") {
            setMemory(parsed)
          }
        } catch (err) {
          console.error("[DeliClaw] 记忆加载失败:", err)
          // 解析失败时不删除数据，保留给用户手动修复的机会
        }
      }

      // 保护：如果之前把 base64 写入了 localStorage，这里会非常大且解析慢/失败
      if (savedFiles) {
        if (savedFiles.length > 200_000) {
          // 超过约 200KB 直接丢弃，避免卡死在"加载记忆中..."
          localStorage.removeItem(FILES_STORAGE_KEY)
        } else {
          try {
            const parsedFiles = JSON.parse(savedFiles)
            // 只恢复元信息（base64 不持久化）
            setUploadedFiles(
              parsedFiles.map((f: any) => ({
                id: f.id,
                name: f.name,
                mimeType: f.mimeType,
                base64: "", // 不从 localStorage 恢复内容
                uploadedAt: new Date(f.uploadedAt),
              }))
            )
          } catch {
            localStorage.removeItem(FILES_STORAGE_KEY)
          }
        }
      }

      if (savedStage) setStage(savedStage as DemoStage)

      if (savedPending) {
        try {
          setPendingInferred(JSON.parse(savedPending))
        } catch {
          localStorage.removeItem(PENDING_INFERRED_STORAGE_KEY)
        }
      }
    } finally {
      setIsLoaded(true)
    }
  }, [])

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (!isLoaded || isResetting) return
    try {
      localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(memory))
      // 只存元信息，避免 QuotaExceededError
      localStorage.setItem(FILES_STORAGE_KEY, JSON.stringify(toPersistedFileMeta(uploadedFiles)))
      localStorage.setItem(STAGE_STORAGE_KEY, stage)
      localStorage.setItem(PENDING_INFERRED_STORAGE_KEY, JSON.stringify(pendingInferred))
    } catch (err) {
      console.error("[DeliClaw] 记忆保存失败:", err)
      // 如果用户浏览器空间不足，降级：至少保证内存态可继续跑 demo
      // 不抛错，避免页面功能被中断
    }
  }, [memory, uploadedFiles, stage, pendingInferred, isLoaded, isResetting])

  // 页面关闭/刷新前强制保存，防止状态未同步到 localStorage
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isResettingRef.current) return
      try {
        localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(memory))
        localStorage.setItem(FILES_STORAGE_KEY, JSON.stringify(toPersistedFileMeta(uploadedFiles)))
        localStorage.setItem(STAGE_STORAGE_KEY, stage)
        localStorage.setItem(PENDING_INFERRED_STORAGE_KEY, JSON.stringify(pendingInferred))
      } catch {
        // ignore
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [memory, uploadedFiles, stage, pendingInferred])

  useEffect(() => {
    memoryRef.current = memory
  }, [memory])

  useEffect(() => {
    pendingInferredRef.current = pendingInferred
  }, [pendingInferred])

  useEffect(() => {
    if (!isLoaded || isResetting) return

    const delay = getNextAutoConfirmDelay(pendingInferred)
    if (delay === null) return

    const timerId = window.setTimeout(() => {
      const { memory: nextMemory, pendingInferred: nextPendingInferred, acceptedIds } = acceptDueInferredCandidates({
        memory: memoryRef.current,
        pendingInferred: pendingInferredRef.current,
      })

      if (acceptedIds.length === 0) return

      memoryRef.current = nextMemory
      pendingInferredRef.current = nextPendingInferred
      setMemory(nextMemory)
      setPendingInferred(nextPendingInferred)
      setTurnInsight((prev) => {
        if (!prev?.inferredPending?.length) return prev
        return {
          ...prev,
          inferredPending: prev.inferredPending.filter((candidate) => !acceptedIds.includes(candidate.id)),
          updatedAt: new Date().toISOString(),
        }
      })
    }, delay)

    return () => window.clearTimeout(timerId)
  }, [pendingInferred, isLoaded, isResetting])

  const handleFileUpload = (base64: string, mime: string, name: string) => {
    const newFile: UploadedFile = {
      id: crypto.randomUUID(),
      name,
      base64: "", // SQLite 是 source of truth，不在 React state 保留原图
      mimeType: mime,
      uploadedAt: new Date(),
    }
    setUploadedFiles(prev => [...prev, newFile])
  }

  const handleClearMemory = () => {
    if (!window.confirm("确定要重置会话吗？所有记忆和对话历史将被清除。")) {
      return
    }

    isResettingRef.current = true
    setIsResetting(true)
    localStorage.removeItem(MEMORY_STORAGE_KEY)
    localStorage.removeItem(FILES_STORAGE_KEY)
    localStorage.removeItem(STAGE_STORAGE_KEY)
    localStorage.removeItem(PENDING_INFERRED_STORAGE_KEY)
    localStorage.removeItem(FILE_CENTER_ONBOARDING_STORAGE_KEY)
    localStorage.removeItem("deliclaw_report_wrong-questions")
    localStorage.removeItem("deliclaw_report_growth")
    window.requestAnimationFrame(() => {
      window.location.replace(window.location.pathname + window.location.search)
    })
  }

  const handleAddInferredCandidates = (cands: InferredCandidate[]) => {
    if (!cands || cands.length === 0) return
    setPendingInferred((prev) => dedupeCandidates(prev, cands))
  }

  const handleAcceptInferred = (id: string) => {
    setPendingInferred((prev) => {
      const cand = prev.find((c) => c.id === id)
      if (!cand) return prev
      setMemory((m) => applyInferredCandidate(m, cand))
      return prev.filter((c) => c.id !== id)
    })
    // 同步更新 turnInsight，移除已接受的候选
    setTurnInsight((prev) => {
      if (!prev?.inferredPending) return prev
      return {
        ...prev,
        inferredPending: prev.inferredPending.filter((c) => c.id !== id),
        updatedAt: new Date().toISOString(),
      }
    })
  }

  const handleRejectInferred = (id: string) => {
    setPendingInferred((prev) => prev.filter((c) => c.id !== id))
    setTurnInsight((prev) => {
      if (!prev?.inferredPending) return prev
      return {
        ...prev,
        inferredPending: prev.inferredPending.filter((c) => c.id !== id),
        updatedAt: new Date().toISOString(),
      }
    })
  }

  const handleEditAcceptInferred = (id: string, editedValue: string | string[]) => {
    setPendingInferred((prev) => {
      const idx = prev.findIndex((c) => c.id === id)
      if (idx === -1) return prev
      const cand = { ...prev[idx], editedValue, status: "edited_then_accepted" as const, autoConfirmAt: undefined }
      setMemory((m) => applyInferredCandidate(m, cand))
      return prev.filter((c) => c.id !== id)
    })
    setTurnInsight((prev) => {
      if (!prev?.inferredPending) return prev
      return {
        ...prev,
        inferredPending: prev.inferredPending.filter((c) => c.id !== id),
        updatedAt: new Date().toISOString(),
      }
    })
  }

  const handleIgnoreInferred = (id: string) => {
    setPendingInferred((prev) => prev.filter((c) => c.id !== id))
    setTurnInsight((prev) => {
      if (!prev?.inferredPending) return prev
      return {
        ...prev,
        inferredPending: prev.inferredPending.filter((c) => c.id !== id),
        updatedAt: new Date().toISOString(),
      }
    })
  }

  if (isResetting) {
    return <div className="h-screen bg-[#FAFAFA] flex items-center justify-center text-gray-400 text-sm">正在重新开始会话…</div>
  }

  if (!isLoaded) {
    return <div className="h-screen bg-[#FAFAFA] flex items-center justify-center text-gray-400 text-sm">正在加载记忆...</div>
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="h-11 bg-white border-b border-gray-100 flex items-center px-6 gap-2 flex-shrink-0">
        <div className="w-5 h-5 rounded-md bg-indigo-600 flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 10h16M4 14h8" />
          </svg>
        </div>
        <span className="text-sm font-bold text-gray-900 tracking-tight">DeliClaw</span>
        <span className="text-xs text-gray-300 font-medium ml-1">智能文件管理</span>

        <div className="ml-auto">
          <button
            onClick={handleClearMemory}
            className="text-[10px] px-2 py-1 rounded bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
          >
            重置会话
          </button>
        </div>
      </div>

      {/* Main split */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 min-w-0">
          <ChatPanel
            memory={memory}
            onMemoryUpdate={setMemory}
            pendingInferred={pendingInferred}
            onInferredCandidates={handleAddInferredCandidates}
            onTurnInsightUpdate={setTurnInsight}
            uploadedFiles={uploadedFiles}
            onFileUpload={handleFileUpload}
            stage={stage}
            onStageChange={setStage}
            activeView={activeView}
            onActiveViewChange={setActiveView}
          />
        </div>
        {activeView === "chat" && (
          <div className="w-72 flex-shrink-0">
            <DatabaseHub
              memory={memory}
              turnInsight={turnInsight}
              pendingInferred={pendingInferred}
              onAcceptInferred={handleAcceptInferred}
              onRejectInferred={handleRejectInferred}
              onEditAcceptInferred={handleEditAcceptInferred}
              onIgnoreInferred={handleIgnoreInferred}
            />
          </div>
        )}
      </div>
    </div>
  )
}
