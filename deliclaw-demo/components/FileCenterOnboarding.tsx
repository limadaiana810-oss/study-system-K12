"use client"

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react"

export type OnboardingTarget = "source-rail" | "photo-grid" | "ai-search"

type OnboardingStep = {
  target: OnboardingTarget
  eyebrow: string
  title: string
  body: string
}

type HighlightRect = {
  left: number
  top: number
  width: number
  height: number
  right: number
  bottom: number
  centerX: number
  centerY: number
}

type CardPosition = {
  left: number
  top: number
  width: number
  height: number
}

type PhotoFlowDarkZoneRect = {
  left: number
  top: number
  width: number
  height: number
  right: number
  bottom: number
}

type PhotoFlowPhase = (typeof PHOTO_FLOW_PHASES)[keyof typeof PHOTO_FLOW_PHASES]

type PhotoFlowLayout = {
  darkZoneRect: PhotoFlowDarkZoneRect
  flowRect: CardPosition
  sourceRect: CardPosition
  maskRect: CardPosition
  afterRect: CardPosition
  arrowRect: CardPosition
  labelLeft: number
  labelTop: number
}

interface Props {
  active: boolean
  onFinish: () => void
  onStepTargetChange?: (target: OnboardingTarget | null) => void
}

const TARGET_PADDING = 10
const CARD_WIDTH = 330
const CARD_HEIGHT = 198
const PHOTO_FLOW_SOURCE_SELECTOR = '[data-onboarding-photo-origin="wrong-question"]'
const PHOTO_FLOW_PHASES = {
  thumbnailSource: "thumbnail-source",
  movingToMask: "moving-to-mask",
  arrowDrawing: "arrow-drawing",
  labelVisible: "label-visible",
  afterVisible: "after-visible",
} as const
const PHOTO_FLOW_SOURCE_HOLD_MS = 180
const PHOTO_FLOW_MOVE_DURATION_MS = 820
const PHOTO_FLOW_PAUSE_BEFORE_ARROW_MS = 500
const PHOTO_FLOW_ARROW_DRAW_DURATION_MS = 520
const PHOTO_FLOW_PAUSE_BEFORE_AFTER_MS = 500
const PHOTO_FLOW_LABEL_ARROW_GAP = 10
const PHOTO_CLEANUP_FLOW = {
  before: "/demo-ai-tools/wrong-question-before.jpg",
  after: "/demo-ai-tools/wrong-question-after.jpg",
  label: "去手写 AI",
} as const

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    target: "source-rail",
    eyebrow: "1 / 3 先看这里",
    title: "各种方式交给智能体",
    body: "微信、QQ、钉钉、相册、网盘来的文件都会汇总到这里。你不用记它从哪来。",
  },
  {
    target: "photo-grid",
    eyebrow: "2 / 3 再看照片",
    title: "照片由智能体自动分类",
    body: "错题拍照后会先归进这里，等你需要时，再送去去手写 AI 变成干净卷面。",
  },
  {
    target: "ai-search",
    eyebrow: "3 / 3 最后只要会说",
    title: "说细节，AI 帮你找",
    body: "你可以说照片里的任意细节、来源或相关内容。AI 帮你搜索，比你更懂自己。",
  },
]

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

function getTargetSelector(target: OnboardingTarget) {
  return `[data-onboarding-target="${target}"]`
}

function toHighlightRect(raw: DOMRect): HighlightRect {
  const left = clamp(raw.left - TARGET_PADDING, 8, window.innerWidth - 24)
  const top = clamp(raw.top - TARGET_PADDING, 8, window.innerHeight - 24)
  const right = clamp(raw.right + TARGET_PADDING, left + 24, window.innerWidth - 8)
  const bottom = clamp(raw.bottom + TARGET_PADDING, top + 24, window.innerHeight - 8)

  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
    right,
    bottom,
    centerX: left + (right - left) / 2,
    centerY: top + (bottom - top) / 2,
  }
}

function toCardPosition(raw: DOMRect): CardPosition {
  return {
    left: raw.left,
    top: raw.top,
    width: raw.width,
    height: raw.height,
  }
}

function getCardPosition(rect: HighlightRect): CardPosition {
  const width = Math.min(CARD_WIDTH, window.innerWidth - 32)
  const height = CARD_HEIGHT
  const hasRoomBelow = window.innerHeight - rect.bottom > height + 24
  const top = hasRoomBelow ? rect.bottom + 20 : clamp(rect.top - height - 20, 16, window.innerHeight - height - 16)
  const idealLeft =
    rect.centerX > window.innerWidth / 2
      ? rect.right - width
      : rect.left + Math.min(96, rect.width * 0.35)

  return {
    left: clamp(idealLeft, 16, window.innerWidth - width - 16),
    top,
    width,
    height,
  }
}

function getPhotoFlowDarkZoneRect(rect: HighlightRect): PhotoFlowDarkZoneRect {
  const left = 24
  const top = 24
  const right = window.innerWidth - 24
  const bottom = clamp(rect.top - 24, top + 180, window.innerHeight - 24)

  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
    right,
    bottom,
  }
}

function getPhotoFlowLayout(rect: HighlightRect, sourceRect: CardPosition | null): PhotoFlowLayout | null {
  const baseBeforeWidth = 208
  const baseBeforeHeight = 128
  const baseArrowWidth = 126
  const baseArrowHeight = 28
  const baseGap = 24
  const baseLabelHeight = 34
  const labelGap = PHOTO_FLOW_LABEL_ARROW_GAP
  const totalBaseWidth = baseBeforeWidth * 2 + baseArrowWidth + baseGap * 2
  const totalBaseHeight = baseBeforeHeight + baseLabelHeight + labelGap
  const darkZoneRect = getPhotoFlowDarkZoneRect(rect)
  const availableWidth = Math.max(darkZoneRect.width - 24, 240)
  const availableHeight = Math.max(darkZoneRect.height - 24, 112)
  const scale = clamp(Math.min(1, availableWidth / totalBaseWidth, availableHeight / totalBaseHeight), 0.56, 1)
  const beforeWidth = Math.round(baseBeforeWidth * scale)
  const beforeHeight = Math.round(baseBeforeHeight * scale)
  const arrowWidth = Math.round(baseArrowWidth * scale)
  const arrowHeight = Math.round(baseArrowHeight * scale)
  const gap = Math.round(baseGap * scale)
  const labelHeight = Math.round(baseLabelHeight * scale)
  const scaledLabelArrowGap = Math.round(PHOTO_FLOW_LABEL_ARROW_GAP * scale)
  const scaledLabelGap = Math.round(labelGap * scale)
  const flowWidth = beforeWidth * 2 + arrowWidth + gap * 2
  const flowHeight = beforeHeight + labelHeight + scaledLabelGap
  const flowCenterX = darkZoneRect.left + darkZoneRect.width / 2
  const flowCenterY = darkZoneRect.top + darkZoneRect.height / 2
  const flowLeft = clamp(flowCenterX - flowWidth / 2, darkZoneRect.left, darkZoneRect.right - flowWidth)
  const flowTop = clamp(flowCenterY - flowHeight / 2, darkZoneRect.top, darkZoneRect.bottom - flowHeight)
  const cardTop = flowTop + labelHeight + scaledLabelGap
  const flowRect = {
    left: flowLeft,
    top: flowTop,
    width: flowWidth,
    height: flowHeight,
  }
  const maskRect = {
    left: flowLeft,
    top: cardTop,
    width: beforeWidth,
    height: beforeHeight,
  }
  const arrowRect = {
    left: maskRect.left + beforeWidth + gap,
    top: cardTop + beforeHeight / 2 - arrowHeight / 2,
    width: arrowWidth,
    height: arrowHeight,
  }
  const afterRect = {
    left: arrowRect.left + arrowWidth + gap,
    top: cardTop,
    width: beforeWidth,
    height: beforeHeight,
  }

  return {
    darkZoneRect,
    flowRect,
    sourceRect: sourceRect ?? maskRect,
    maskRect,
    afterRect,
    arrowRect,
    labelLeft: arrowRect.left + arrowRect.width / 2,
    labelTop: arrowRect.top - labelHeight - scaledLabelArrowGap,
  }
}

function getPhotoStepCardPosition(layout: PhotoFlowLayout): CardPosition {
  const width = Math.min(CARD_WIDTH, window.innerWidth - 32)
  const height = CARD_HEIGHT
  const leftOfFlow = layout.flowRect.left - width - 28
  const centeredTop = clamp(
    layout.flowRect.top + layout.flowRect.height / 2 - height / 2,
    layout.darkZoneRect.top,
    layout.darkZoneRect.bottom - height
  )

  if (leftOfFlow >= layout.darkZoneRect.left) {
    return {
      left: clamp(leftOfFlow, 16, window.innerWidth - width - 16),
      top: centeredTop,
      width,
      height,
    }
  }

  const aboveFlowTop = layout.flowRect.top - height - 20
  if (aboveFlowTop >= layout.darkZoneRect.top) {
    return {
      left: clamp(layout.darkZoneRect.left, 16, window.innerWidth - width - 16),
      top: aboveFlowTop,
      width,
      height,
    }
  }

  return {
    left: clamp(layout.darkZoneRect.left, 16, window.innerWidth - width - 16),
    top: clamp(layout.darkZoneRect.top, 16, window.innerHeight - height - 16),
    width,
    height,
  }
}

function FlowArrow({ active, className = "" }: { active: boolean; className?: string }) {
  return (
    <svg className={`overflow-visible ${className}`} viewBox="0 0 132 36" aria-hidden="true">
      <path
        d="M6 18 H112 M98 8 L126 18 L98 28"
        pathLength={100}
        fill="none"
        stroke="rgba(255,255,255,0.96)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
        style={{
          opacity: active ? 1 : 0,
          strokeDasharray: "100 100",
          strokeDashoffset: active ? 0 : 100,
          transition: `stroke-dashoffset ${PHOTO_FLOW_ARROW_DRAW_DURATION_MS}ms ease-out, opacity 120ms linear`,
        }}
      />
    </svg>
  )
}

function StaticPreviewCard({
  rect,
  src,
  alt,
  badge,
  badgeClassName,
  visible,
}: {
  rect: CardPosition
  src: string
  alt: string
  badge: string
  badgeClassName: string
  visible: boolean
}) {
  return (
    <div
      className="pointer-events-none fixed z-[82] transition-all duration-300 ease-out"
      style={{
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        opacity: visible ? 1 : 0,
        transform: `translateX(${visible ? 0 : 18}px)`,
      }}
      aria-hidden="true"
    >
      <div className="relative h-full overflow-hidden rounded-[24px] border border-white/80 bg-white/95 p-2 shadow-[0_14px_40px_rgba(15,23,42,0.2)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="h-full w-full rounded-[18px] object-cover" />
        <span className={`absolute left-3 top-3 rounded-full px-2 py-1 text-[9px] font-black text-white shadow-[0_8px_20px_rgba(15,23,42,0.25)] sm:text-[10px] ${badgeClassName}`}>
          {badge}
        </span>
      </div>
    </div>
  )
}

export default function FileCenterOnboarding({ active, onFinish, onStepTargetChange }: Props) {
  const [stepIndex, setStepIndex] = useState(0)
  const [rect, setRect] = useState<HighlightRect | null>(null)
  const [cardPosition, setCardPosition] = useState<CardPosition | null>(null)
  const [targetMissing, setTargetMissing] = useState(false)
  const [photoSourceRect, setPhotoSourceRect] = useState<CardPosition | null>(null)
  const [photoFlowPhase, setPhotoFlowPhase] = useState<PhotoFlowPhase>(PHOTO_FLOW_PHASES.thumbnailSource)
  const step = ONBOARDING_STEPS[stepIndex]
  const isLastStep = stepIndex === ONBOARDING_STEPS.length - 1

  const measureTarget = useCallback(
    (shouldScroll: boolean) => {
      if (!active) return false
      const target = document.querySelector<HTMLElement>(getTargetSelector(step.target))
      if (!target) {
        setTargetMissing(true)
        setPhotoSourceRect(null)
        return false
      }

      setTargetMissing(false)
      if (shouldScroll) {
        target.scrollIntoView({
          block: "center",
          inline: "nearest",
          behavior: prefersReducedMotion() ? "auto" : "smooth",
        })
      }

      window.requestAnimationFrame(() => {
        const nextRect = toHighlightRect(target.getBoundingClientRect())
        setRect(nextRect)
        setCardPosition(getCardPosition(nextRect))

        if (step.target === "photo-grid") {
          const source = document.querySelector<HTMLElement>(PHOTO_FLOW_SOURCE_SELECTOR)
          setPhotoSourceRect(source ? toCardPosition(source.getBoundingClientRect()) : null)
          return
        }

        setPhotoSourceRect(null)
      })

      return true
    },
    [active, step.target]
  )

  useEffect(() => {
    if (!active) return
    let attempts = 0
    const found = measureTarget(true)
    const retryId = window.setInterval(() => {
      attempts += 1
      if (measureTarget(attempts === 1) || attempts >= 20) {
        window.clearInterval(retryId)
      }
    }, found ? 500 : 140)

    const handleViewportChange = () => measureTarget(false)
    window.addEventListener("resize", handleViewportChange)
    window.addEventListener("scroll", handleViewportChange, true)

    return () => {
      window.clearInterval(retryId)
      window.removeEventListener("resize", handleViewportChange)
      window.removeEventListener("scroll", handleViewportChange, true)
    }
  }, [active, measureTarget])

  useEffect(() => {
    onStepTargetChange?.(active ? step.target : null)
  }, [active, onStepTargetChange, step.target])

  const photoFlowLayout = useMemo(() => {
    if (!rect || step.target !== "photo-grid") return null
    return getPhotoFlowLayout(rect, photoSourceRect)
  }, [photoSourceRect, rect, step.target])

  useEffect(() => {
    if (!active || step.target !== "photo-grid") {
      setPhotoFlowPhase(PHOTO_FLOW_PHASES.thumbnailSource)
      return
    }

    if (!photoFlowLayout) {
      setPhotoFlowPhase(PHOTO_FLOW_PHASES.thumbnailSource)
      return
    }

    if (prefersReducedMotion()) {
      setPhotoFlowPhase(PHOTO_FLOW_PHASES.afterVisible)
      return
    }

    setPhotoFlowPhase(PHOTO_FLOW_PHASES.thumbnailSource)
    const timers = [
      window.setTimeout(() => {
        setPhotoFlowPhase(PHOTO_FLOW_PHASES.movingToMask)
      }, PHOTO_FLOW_SOURCE_HOLD_MS),
      window.setTimeout(() => {
        setPhotoFlowPhase(PHOTO_FLOW_PHASES.arrowDrawing)
      }, PHOTO_FLOW_SOURCE_HOLD_MS + PHOTO_FLOW_MOVE_DURATION_MS + PHOTO_FLOW_PAUSE_BEFORE_ARROW_MS),
      window.setTimeout(() => {
        setPhotoFlowPhase(PHOTO_FLOW_PHASES.labelVisible)
      }, PHOTO_FLOW_SOURCE_HOLD_MS + PHOTO_FLOW_MOVE_DURATION_MS + PHOTO_FLOW_PAUSE_BEFORE_ARROW_MS + PHOTO_FLOW_ARROW_DRAW_DURATION_MS),
      window.setTimeout(() => {
        setPhotoFlowPhase(PHOTO_FLOW_PHASES.afterVisible)
      }, PHOTO_FLOW_SOURCE_HOLD_MS + PHOTO_FLOW_MOVE_DURATION_MS + PHOTO_FLOW_PAUSE_BEFORE_ARROW_MS + PHOTO_FLOW_ARROW_DRAW_DURATION_MS + PHOTO_FLOW_PAUSE_BEFORE_AFTER_MS),
    ]

    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [active, photoFlowLayout, step.target])

  const handleFinish = useCallback(() => {
    onStepTargetChange?.(null)
    onFinish()
  }, [onFinish, onStepTargetChange])

  useEffect(() => {
    if (!active) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleFinish()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [active, handleFinish])

  const handleNext = () => {
    if (isLastStep) {
      handleFinish()
      return
    }
    setStepIndex((current) => current + 1)
  }

  const stepCardPosition = step.target === "photo-grid" && photoFlowLayout ? getPhotoStepCardPosition(photoFlowLayout) : cardPosition

  const stepCardStyle = useMemo<CSSProperties>(() => {
    if (!stepCardPosition) {
      return {
        left: "50%",
        top: "50%",
        width: "min(330px, calc(100vw - 32px))",
        transform: "translate(-50%, -50%)",
      }
    }
    return {
      left: stepCardPosition.left,
      top: stepCardPosition.top,
      width: stepCardPosition.width,
    }
  }, [stepCardPosition])

  const arrow = useMemo(() => {
    if (!rect || !stepCardPosition) return null
    const endX = clamp(rect.centerX, stepCardPosition.left + 28, stepCardPosition.left + stepCardPosition.width - 28)
    const cardBelowTarget = stepCardPosition.top > rect.centerY
    const endY = cardBelowTarget ? stepCardPosition.top + 4 : stepCardPosition.top + stepCardPosition.height - 4

    return {
      startX: rect.centerX,
      startY: cardBelowTarget ? rect.bottom : rect.top,
      endX,
      endY,
    }
  }, [rect, stepCardPosition])

  const showCleanupLabel = photoFlowPhase === PHOTO_FLOW_PHASES.labelVisible || photoFlowPhase === PHOTO_FLOW_PHASES.afterVisible
  const showCleanupResult = photoFlowPhase === PHOTO_FLOW_PHASES.afterVisible
  const shouldPinBeforeInMask = photoFlowPhase !== PHOTO_FLOW_PHASES.thumbnailSource
  const showPhotoCleanupFlow =
    step.target === "photo-grid" &&
    !targetMissing &&
    photoFlowLayout &&
    (photoSourceRect !== null || photoFlowPhase === PHOTO_FLOW_PHASES.afterVisible)
  const stepBody = targetMissing ? "页面正在准备文件中心，稍等一下就能看到这里。" : step.body
  const beforeRect = photoFlowLayout ? (shouldPinBeforeInMask ? photoFlowLayout.maskRect : photoFlowLayout.sourceRect) : null

  if (!active) return null

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="文件中心首次引导">
      {rect ? (
        <div
          className="fixed z-[81] rounded-[18px] border-[3px] border-white/95 bg-white/10"
          style={{
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.68), 0 0 32px rgba(255, 255, 255, 0.38)",
          }}
        />
      ) : (
        <div className="fixed inset-0 z-[81] bg-slate-950/70" />
      )}

      {showPhotoCleanupFlow && photoFlowLayout && beforeRect && (
        <section className="pointer-events-none fixed inset-0 z-[82]" aria-label="错题去手写演示">
          <div
            className="fixed z-[82] overflow-hidden border border-white/70 shadow-[0_18px_48px_rgba(2,6,23,0.28)]"
            style={{
              left: beforeRect.left,
              top: beforeRect.top,
              width: beforeRect.width,
              height: beforeRect.height,
              borderRadius: shouldPinBeforeInMask ? 24 : 12,
              padding: shouldPinBeforeInMask ? 8 : 0,
              background: shouldPinBeforeInMask ? "rgba(255,255,255,0.96)" : "rgba(255,255,255,0.12)",
              boxShadow: shouldPinBeforeInMask
                ? "0 14px 40px rgba(15,23,42,0.2)"
                : "0 10px 28px rgba(2,6,23,0.14)",
              transitionProperty: "left, top, width, height, border-radius, padding, background, box-shadow",
              transitionDuration: `${shouldPinBeforeInMask ? PHOTO_FLOW_MOVE_DURATION_MS : 0}ms`,
              transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
            }}
            aria-hidden="true"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={PHOTO_CLEANUP_FLOW.before} alt="错题原图" className="h-full w-full rounded-[18px] object-cover" />
            <span className="absolute left-3 top-3 rounded-full bg-rose-600/95 px-2 py-1 text-[9px] font-black text-white shadow-[0_8px_20px_rgba(225,29,72,0.35)] sm:text-[10px]">
              原图
            </span>
          </div>

          <div
            className="fixed z-[82]"
            style={{
              left: photoFlowLayout.arrowRect.left,
              top: photoFlowLayout.arrowRect.top,
              width: photoFlowLayout.arrowRect.width,
              height: photoFlowLayout.arrowRect.height,
            }}
          >
            <FlowArrow active={photoFlowPhase === PHOTO_FLOW_PHASES.arrowDrawing || showCleanupLabel || showCleanupResult} className="h-full w-full" />
          </div>

          <div
            className="fixed z-[82] rounded-full border border-white/60 bg-indigo-600/95 px-3 py-2 text-center text-[10px] font-black text-white shadow-[0_12px_28px_rgba(79,70,229,0.34)] transition-all duration-300 sm:px-4 sm:text-xs"
            style={{
              left: photoFlowLayout.labelLeft,
              top: photoFlowLayout.labelTop,
              opacity: showCleanupLabel ? 1 : 0,
              transform: `translate(-50%, ${showCleanupLabel ? "0px" : "10px"})`,
            }}
          >
            {PHOTO_CLEANUP_FLOW.label}
          </div>

          <StaticPreviewCard
            rect={photoFlowLayout.afterRect}
            src={PHOTO_CLEANUP_FLOW.after}
            alt="干净卷面"
            badge="干净卷面"
            badgeClassName="bg-emerald-600/95"
            visible={showCleanupResult}
          />
        </section>
      )}

      {arrow && (
        <svg className="pointer-events-none fixed inset-0 z-[83] h-screen w-screen" aria-hidden="true">
          <defs>
            <marker id="file-onboarding-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,6 L9,3 z" fill="white" />
            </marker>
          </defs>
          <path
            d={`M ${arrow.startX} ${arrow.startY} C ${arrow.startX} ${(arrow.startY + arrow.endY) / 2}, ${arrow.endX} ${(arrow.startY + arrow.endY) / 2}, ${arrow.endX} ${arrow.endY}`}
            fill="none"
            stroke="white"
            strokeLinecap="round"
            strokeWidth="3"
            markerEnd="url(#file-onboarding-arrow)"
          />
        </svg>
      )}

      <section
        className="fixed z-[84] rounded-2xl border border-white/70 bg-white p-4 text-slate-950 shadow-[0_24px_70px_rgba(0,0,0,0.32)]"
        style={stepCardStyle}
      >
        <p className="text-[11px] font-black text-indigo-600">{step.eyebrow}</p>
        <h3 className="mt-1 text-lg font-black tracking-tight">{step.title}</h3>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{stepBody}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex gap-1.5" aria-hidden="true">
            {ONBOARDING_STEPS.map((item, index) => (
              <span
                key={item.target}
                className={`h-1.5 rounded-full transition-all ${index === stepIndex ? "w-5 bg-indigo-600" : "w-1.5 bg-slate-200"}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleFinish}
              className="rounded-xl px-3 py-2 text-xs font-black text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              跳过
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white shadow-sm transition-colors hover:bg-indigo-700"
            >
              {isLastStep ? "知道了" : "下一步"}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
