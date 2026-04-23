import type { InferredCandidate, MemoryEntry } from "@/types"
import { applyInferredCandidate } from "./memoryParser.ts"

type AcceptDueInferredInput = {
  memory: MemoryEntry
  pendingInferred: InferredCandidate[]
  nowMs?: number
}

type AcceptDueInferredResult = {
  memory: MemoryEntry
  pendingInferred: InferredCandidate[]
  acceptedIds: string[]
}

export function getNextAutoConfirmDelay(pendingInferred: InferredCandidate[], nowMs = Date.now()): number | null {
  const dueTimes = pendingInferred
    .map((candidate) => candidate.autoConfirmAt)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value))

  if (dueTimes.length === 0) return null

  return Math.max(0, Math.min(...dueTimes) - nowMs)
}

export function acceptDueInferredCandidates({
  memory,
  pendingInferred,
  nowMs = Date.now(),
}: AcceptDueInferredInput): AcceptDueInferredResult {
  const dueCandidates = pendingInferred.filter((candidate) => typeof candidate.autoConfirmAt === "number" && candidate.autoConfirmAt <= nowMs)

  if (dueCandidates.length === 0) {
    return { memory, pendingInferred, acceptedIds: [] }
  }

  const acceptedIds = dueCandidates.map((candidate) => candidate.id)
  const nextMemory = dueCandidates.reduce(
    (currentMemory, candidate) => applyInferredCandidate(currentMemory, candidate),
    memory
  )
  const nextPendingInferred = pendingInferred.filter((candidate) => !acceptedIds.includes(candidate.id))

  return {
    memory: nextMemory,
    pendingInferred: nextPendingInferred,
    acceptedIds,
  }
}
