"use client"

import { useEffect, useMemo, useState } from "react"
import type { ManagedFile } from "@/types"

interface Props {
  onFileDeleted?: (id: string) => void
  onFilesCleared?: () => void
}

function groupFiles(files: ManagedFile[]) {
  const tree = new Map<string, Map<string, ManagedFile[]>>()

  for (const f of files) {
    const qt = f.questionType || "未分类"
    const sub = f.subject || "未分类"
    if (!tree.has(qt)) tree.set(qt, new Map())
    const subMap = tree.get(qt)!
    if (!subMap.has(sub)) subMap.set(sub, [])
    subMap.get(sub)!.push(f)
  }

  return tree
}

function findDuplicates(files: ManagedFile[]): Array<{ key: string; items: ManagedFile[] }> {
  const byKey = new Map<string, ManagedFile[]>()
  for (const f of files) {
    const key = f.title || f.fileName
    if (!byKey.has(key)) byKey.set(key, [])
    byKey.get(key)!.push(f)
  }
  return [...byKey.entries()]
    .filter(([, items]) => items.length > 1)
    .map(([key, items]) => ({ key, items }))
}

function FileCard({ file, onDelete }: { file: ManagedFile; onDelete: (id: string) => void }) {
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="group relative rounded-xl bg-white border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="aspect-[4/3] bg-gray-50 relative">
        {file.mimeType.startsWith("image/") ? (
          <img
            src={file.url}
            alt={file.fileName}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        )}
        <button
          onClick={() => {
            if (confirming) {
              onDelete(file.id)
              setConfirming(false)
            } else {
              setConfirming(true)
              setTimeout(() => setConfirming(false), 3000)
            }
          }}
          className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold transition-all ${
            confirming ? "bg-red-500 scale-110" : "bg-black/40 opacity-0 group-hover:opacity-100 hover:bg-red-500"
          }`}
          title={confirming ? "再次点击确认删除" : "删除"}
        >
          {confirming ? "!" : "×"}
        </button>
      </div>
      <div className="p-2.5">
        <p className="text-[11px] font-semibold text-slate-800 truncate" title={file.fileName}>
          {file.fileName}
        </p>
        {file.knowledgePoints.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {file.knowledgePoints.slice(0, 3).map((kp) => (
              <span key={kp} className="text-[9px] px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700 font-medium">
                {kp}
              </span>
            ))}
          </div>
        )}
        <p className="mt-1 text-[9px] text-gray-400">{file.uploadedAt}</p>
      </div>
    </div>
  )
}

export default function FileManagerPanel({ onFileDeleted, onFilesCleared }: Props) {
  const [files, setFiles] = useState<ManagedFile[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedQt, setExpandedQt] = useState<Set<string>>(new Set())
  const [expandedSub, setExpandedSub] = useState<Set<string>>(new Set())
  const [clearConfirming, setClearConfirming] = useState(false)

  const fetchFiles = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/files/list")
      if (res.ok) {
        const json = await res.json()
        setFiles(json.files || [])
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

  const tree = useMemo(() => groupFiles(files), [files])
  const duplicates = useMemo(() => findDuplicates(files), [files])

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/files/${id}`, { method: "DELETE" })
      if (res.ok) {
        setFiles((prev) => prev.filter((f) => f.id !== id))
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
        onFilesCleared?.()
      }
    } catch {
      // ignore
    } finally {
      setClearConfirming(false)
    }
  }

  const toggleQt = (qt: string) => {
    setExpandedQt((prev) => {
      const next = new Set(prev)
      if (next.has(qt)) next.delete(qt)
      else next.add(qt)
      return next
    })
  }

  const toggleSub = (key: string) => {
    setExpandedSub((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
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

  if (files.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-[12px] text-gray-400">还没有上传文件</p>
        <p className="text-[10px] text-gray-300 mt-1">在聊天中上传图片，我会自动分类到这里</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* 统计栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-gray-500">共 {files.length} 个文件</span>
          {duplicates.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium">
              {duplicates.length} 组重复
            </span>
          )}
        </div>
        <button
          onClick={handleClearAll}
          className={`text-[10px] px-2 py-1 rounded-lg font-medium transition-colors ${
            clearConfirming
              ? "bg-red-50 text-red-600"
              : "bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500"
          }`}
        >
          {clearConfirming ? "再次点击确认清空" : "清空全部"}
        </button>
      </div>

      {/* 重复提示 */}
      {duplicates.length > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-100 p-2.5">
          <p className="text-[10px] font-bold text-amber-700 mb-1">检测到重复文件</p>
          {duplicates.slice(0, 3).map((dup) => (
            <div key={dup.key} className="flex items-center gap-1.5 text-[10px] text-amber-600">
              <span className="truncate max-w-[140px]">{dup.key}</span>
              <span className="text-amber-400">×{dup.items.length}</span>
            </div>
          ))}
          {duplicates.length > 3 && (
            <p className="text-[10px] text-amber-400 mt-0.5">还有 {duplicates.length - 3} 组...</p>
          )}
        </div>
      )}

      {/* 分类树 */}
      <div className="space-y-2">
        {[...tree.entries()].map(([qt, subMap]) => (
          <div key={qt} className="rounded-xl border border-gray-100 overflow-hidden">
            <button
              onClick={() => toggleQt(qt)}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50/80 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-700">{qt}</span>
                <span className="text-[10px] text-gray-400">{[...subMap.values()].flat().length} 个</span>
              </div>
              <svg
                className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expandedQt.has(qt) ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {expandedQt.has(qt) && (
              <div className="p-2 space-y-2">
                {[...subMap.entries()].map(([sub, subFiles]) => {
                  const key = `${qt}::${sub}`
                  return (
                    <div key={sub}>
                      <button
                        onClick={() => toggleSub(key)}
                        className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-slate-600">{sub}</span>
                          <span className="text-[9px] text-gray-400">{subFiles.length}</span>
                        </div>
                        <svg
                          className={`w-3 h-3 text-gray-400 transition-transform ${expandedSub.has(key) ? "rotate-180" : ""}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {expandedSub.has(key) && (
                        <div className="grid grid-cols-2 gap-2 px-1 pt-1">
                          {subFiles.map((f) => (
                            <FileCard key={f.id} file={f} onDelete={handleDelete} />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
