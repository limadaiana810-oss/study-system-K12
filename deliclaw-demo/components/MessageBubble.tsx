"use client"

import type { Message } from "@/types"
import FileThumbnailCard from "./FileThumbnailCard"

interface Props {
  message: Message
}

function TypingDots() {
  return (
    <div className="dot-pulse flex gap-1.5 py-1">
      <span /><span /><span />
    </div>
  )
}

function AIAvatar() {
  return (
    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm">
      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    </div>
  )
}

export default function MessageBubble({ message }: Props) {
  const isAI = message.role === "assistant"

  if (isAI) {
    return (
      <div className="flex items-start gap-3 animate-fade-in-up">
        <AIAvatar />
        <div className="max-w-[80%]">
          <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-100">
            {message.isStreaming && message.content === "" ? (
              <TypingDots />
            ) : (
              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                {message.content}
              </p>
            )}
          </div>
          {message.fileCards && message.fileCards.length > 0 && (
            <div className="flex flex-col gap-2 mt-2">
              {message.fileCards.map((card, idx) => (
                <FileThumbnailCard key={idx} file={card} />
              ))}
            </div>
          )}
          <p className="text-[10px] text-gray-300 mt-1.5 ml-1">
            {message.timestamp.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-end justify-end gap-3 animate-fade-in-up">
      <div className="max-w-[75%]">
        {message.imageBase64 && (
          <div className="mb-2 flex justify-end">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:${message.imageMime};base64,${message.imageBase64}`}
              alt="上传的文件"
              className="max-h-40 rounded-xl object-cover shadow-sm"
            />
          </div>
        )}
        {message.content && (
          <div className="bg-gray-900 rounded-2xl rounded-br-sm px-4 py-3">
            <p className="text-sm text-white leading-relaxed">{message.content}</p>
          </div>
        )}
        <p className="text-[10px] text-gray-300 mt-1.5 text-right mr-1">
          {message.timestamp.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  )
}
