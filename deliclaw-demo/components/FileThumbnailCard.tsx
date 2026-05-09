"use client"

import { useState } from "react"
import type { FileCard } from "@/types"

interface Props {
  file: FileCard
}

export default function FileThumbnailCard({ file }: Props) {
  const [lightbox, setLightbox] = useState(false)
  const src = file.url || `data:${file.mimeType};base64,${file.base64}`

  return (
    <>
      <div
        style={{
          marginTop: 8,
          maxWidth: 220,
          background: "var(--card)",
          border: "1px solid var(--rule)",
          borderRadius: "var(--r-md)",
          overflow: "hidden",
        }}
      >
        <button
          type="button"
          onClick={() => setLightbox(true)}
          style={{
            position: "relative",
            display: "block",
            width: "100%",
            border: 0,
            padding: 0,
            background: "var(--card-warm)",
            cursor: "zoom-in",
            overflow: "hidden",
          }}
          aria-label={`查看 ${file.name}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={file.name}
            style={{
              width: "100%",
              height: 128,
              objectFit: "cover",
              display: "block",
              transition: "transform .3s",
            }}
          />
        </button>
        <div style={{ padding: "10px 14px" }}>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              fontWeight: 500,
              color: "var(--ink-1)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={file.name}
          >
            {file.name}
          </p>
          {file.tags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
              {file.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: 10,
                    padding: "1px 8px",
                    borderRadius: 999,
                    background: "var(--paper)",
                    color: "var(--ink-3)",
                    fontWeight: 600,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          <p
            className="num"
            style={{
              margin: "8px 0 0",
              fontSize: 10,
              color: "var(--ink-4)",
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
            }}
          >
            archived · {file.uploadedAt.toLocaleDateString("zh-CN")}
          </p>
        </div>
      </div>

      {lightbox && (
        <div
          onClick={() => setLightbox(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            background: "rgba(26,26,31,.86)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
            cursor: "zoom-out",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={file.name}
            style={{
              maxHeight: "100%",
              maxWidth: "100%",
              objectFit: "contain",
              borderRadius: "var(--r-md)",
              boxShadow: "0 20px 60px rgba(0,0,0,.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setLightbox(false)}
            aria-label="关闭"
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: 0,
              background: "rgba(255,255,255,.1)",
              color: "rgba(255,255,255,.85)",
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>
      )}
    </>
  )
}
