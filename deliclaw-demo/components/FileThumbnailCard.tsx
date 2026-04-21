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
      <div className="mt-2 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 max-w-[220px]">
        <div
          className="relative cursor-zoom-in overflow-hidden"
          onClick={() => setLightbox(true)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={file.name}
            className="w-full h-32 object-cover hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors duration-200 flex items-center justify-center">
            <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
          </div>
        </div>
        <div className="px-3 py-2">
          <p className="text-xs font-medium text-gray-700 truncate">{file.name}</p>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {file.tags.map((tag) => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">
                {tag}
              </span>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5">
            📁 已归档 · {file.uploadedAt.toLocaleDateString("zh-CN")}
          </p>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8 cursor-zoom-out"
          onClick={() => setLightbox(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={file.name}
            className="max-h-full max-w-full rounded-xl object-contain shadow-2xl"
          />
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
            onClick={() => setLightbox(false)}
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </>
  )
}
