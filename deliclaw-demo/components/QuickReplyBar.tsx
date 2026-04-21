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
    if (r.id === "intro") return stage === "intro"
    if (r.id === "retrieve") return stage === "uploaded"
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
          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700 font-medium hover:bg-indigo-100 hover:border-indigo-300 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {reply.label}
        </button>
      ))}
    </div>
  )
}
