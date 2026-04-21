"use client"

import { useEffect, useState } from "react"

interface Props {
  label: string
  value?: string
  tags?: string[]
  delay?: number
  accent?: string
}

export default function MemoryCard({ label, value, tags, delay = 0, accent = "#6366F1" }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  return (
    <div
      className="rounded-xl bg-white p-3 shadow-sm border border-gray-100"
      style={{
        borderLeftWidth: 3,
        borderLeftColor: accent,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(10px)",
        transition: "opacity 0.35s ease-out, transform 0.35s ease-out",
      }}
    >
      <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1.5">
        {label}
      </p>
      {value && (
        <p className="text-sm font-semibold text-gray-800">{value}</p>
      )}
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: `${accent}18`, color: accent }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
