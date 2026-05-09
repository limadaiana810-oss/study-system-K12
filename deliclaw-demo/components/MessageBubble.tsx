"use client"

import type { Message } from "@/types"
import FileThumbnailCard from "./FileThumbnailCard"

interface Props {
  message: Message
}

function TypingDots() {
  return (
    <div className="dot-pulse" style={{ display: "flex", gap: 6, padding: "4px 0" }}>
      <span /><span /><span />
    </div>
  )
}

function AIAvatar() {
  return (
    <div
      style={{
        width: 30,
        height: 30,
        borderRadius: "50%",
        background: "var(--ink-1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontFamily: "var(--font-display)",
        fontSize: 12,
        color: "#fff",
        fontStyle: "italic",
        fontWeight: 600,
        letterSpacing: "0.02em",
      }}
    >
      迪
    </div>
  )
}

export default function MessageBubble({ message }: Props) {
  const isAI = message.role === "assistant"
  const time = message.timestamp.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  })

  if (isAI) {
    return (
      <div
        className="animate-fade-in-up"
        style={{ display: "flex", alignItems: "flex-start", gap: 12 }}
      >
        <AIAvatar />
        <div style={{ maxWidth: "80%" }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: 10,
              letterSpacing: "0.06em",
              color: "var(--ink-3)",
              marginBottom: 4,
              marginLeft: 2,
            }}
          >
            xiaodi · ai
          </div>
          <div
            style={{
              background: "var(--card)",
              borderRadius: "var(--r-md)",
              borderTopLeftRadius: 2,
              padding: "12px 16px",
              border: "1px solid var(--rule)",
              boxShadow: "var(--shadow-1)",
            }}
          >
            {message.isStreaming && message.content === "" ? (
              <TypingDots />
            ) : (
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: "var(--ink-1)",
                  whiteSpace: "pre-wrap",
                }}
              >
                {message.content}
              </p>
            )}
          </div>
          {message.fileCards && message.fileCards.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
              {message.fileCards.map((card, idx) => (
                <FileThumbnailCard key={idx} file={card} />
              ))}
            </div>
          )}
          <p
            className="num"
            style={{
              fontSize: 10,
              color: "var(--ink-4)",
              marginTop: 6,
              marginLeft: 2,
            }}
          >
            {time}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="animate-fade-in-up"
      style={{ display: "flex", alignItems: "flex-end", justifyContent: "flex-end", gap: 12 }}
    >
      <div style={{ maxWidth: "75%" }}>
        {message.imageBase64 && (
          <div style={{ marginBottom: 8, display: "flex", justifyContent: "flex-end" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:${message.imageMime};base64,${message.imageBase64}`}
              alt="上传的文件"
              style={{
                maxHeight: 160,
                borderRadius: "var(--r-md)",
                objectFit: "cover",
                boxShadow: "var(--shadow-1)",
              }}
            />
          </div>
        )}
        {message.content && (
          <div
            style={{
              background: "var(--ink-1)",
              borderRadius: "var(--r-md)",
              borderBottomRightRadius: 2,
              padding: "12px 16px",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 14,
                lineHeight: 1.55,
                color: "#fff",
              }}
            >
              {message.content}
            </p>
          </div>
        )}
        <p
          className="num"
          style={{
            fontSize: 10,
            color: "var(--ink-4)",
            marginTop: 6,
            marginRight: 2,
            textAlign: "right",
          }}
        >
          {time}
        </p>
      </div>
    </div>
  )
}
