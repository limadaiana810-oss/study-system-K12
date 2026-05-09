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
    if (r.id === "intro") return true
    if (r.id === "retrieve") return stage !== "intro"
    return false
  })

  if (visible.length === 0) return null

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "0 16px 8px" }}>
      {visible.map((reply) => {
        const isPrimary = reply.id === "intro"
        return (
          <button
            key={reply.id}
            disabled={disabled}
            onClick={() => onSelect(reply.id)}
            title={isPrimary ? "快速上传文件并自我介绍" : undefined}
            className={isPrimary ? "animate-glow-pulse" : undefined}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              padding: "8px 14px",
              borderRadius: 999,
              border: isPrimary ? "1px solid var(--ink-1)" : "1px solid var(--rule)",
              background: isPrimary ? "var(--ink-1)" : "var(--card)",
              color: isPrimary ? "#fff" : "var(--ink-2)",
              fontWeight: 600,
              fontFamily: "var(--font-body)",
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.4 : 1,
              transition: "all .15s",
            }}
          >
            {isPrimary ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            )}
            {reply.label}
          </button>
        )
      })}
    </div>
  )
}
