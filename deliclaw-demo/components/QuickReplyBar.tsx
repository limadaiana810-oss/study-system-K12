"use client"

import type { DemoStage } from "@/types"
import { QUICK_REPLIES } from "@/lib/demoScript"

interface Props {
  stage: DemoStage
  disabled: boolean
  onSelect: (id: string) => void
}

export default function QuickReplyBar({ stage, disabled, onSelect }: Props) {
  const visible = QUICK_REPLIES.filter((r) => {
    if (r.id === "intro") return true           // 上传文件 始终显示
    if (r.id === "retrieve") return stage !== "intro"   // 只在非 intro 时显示
    return false
  })

  if (visible.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 px-4 pb-2">
      {visible.map((reply) => (
        <button
          key={reply.id}
          disabled={disabled}
          onClick={() => onSelect(reply.id)}
          title={reply.id === "intro" ? "快速上传文件并自我介绍" : undefined}
          className={[
            "flex items-center gap-1.5 text-xs px-3 py-2 rounded-full border font-medium transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed",
            reply.id === "intro"
              // 上传按钮：深色 + 环状脉冲发光，始终醒目
              ? "border-indigo-300 bg-indigo-600 text-white shadow-md hover:bg-indigo-700 hover:shadow-lg hover:scale-[1.02] animate-glow-pulse"
              // 普通按钮：浅色 + hover
              : "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300",
          ].join(" ")}
        >
          {reply.id === "intro" ? (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          ) : (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          )}
          {reply.label}
        </button>
      ))}
    </div>
  )
}
