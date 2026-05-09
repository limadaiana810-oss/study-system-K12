"use client"

import { useEffect, useState } from "react"

interface Props {
  label: string
  value?: string
  tags?: string[]
  delay?: number
  accent?: string
}

export default function MemoryCard({ label, value, tags, delay = 0, accent = "var(--brand)" }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  return (
    <div
      style={{
        background: "var(--card)",
        padding: "12px 14px",
        borderRadius: "var(--r-md)",
        border: "1px solid var(--rule)",
        borderLeft: `3px solid ${accent}`,
        boxShadow: "var(--shadow-1)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(10px)",
        transition: "opacity 0.35s ease-out, transform 0.35s ease-out",
      }}
    >
      <p
        style={{
          margin: "0 0 6px",
          fontSize: 10,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          fontWeight: 700,
          color: "var(--ink-3)",
          fontFamily: "var(--font-body)",
        }}
      >
        {label}
      </p>
      {value && (
        <p
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 600,
            color: "var(--ink-1)",
            lineHeight: 1.5,
          }}
        >
          {value}
        </p>
      )}
      {tags && tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
          {tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: 11,
                padding: "1px 8px",
                borderRadius: 999,
                fontWeight: 500,
                background: `color-mix(in srgb, ${accent} 14%, transparent)`,
                color: accent,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
