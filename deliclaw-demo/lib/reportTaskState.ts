export const TASK_STATE_STORAGE_KEY = "deliclaw_report_wq_tasks"

type Stored = {
  generatedAt: string
  done: Record<string, true>
}

function read(): Stored | null {
  try {
    const raw = localStorage.getItem(TASK_STATE_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof parsed.generatedAt !== "string" ||
      !parsed.done ||
      typeof parsed.done !== "object" ||
      Array.isArray(parsed.done)
    ) {
      return null
    }
    return parsed as Stored
  } catch {
    return null
  }
}

function write(value: Stored): void {
  try {
    localStorage.setItem(TASK_STATE_STORAGE_KEY, JSON.stringify(value))
  } catch {
    // ignore quota / unavailable
  }
}

export function readTaskState(generatedAt: string): Record<string, true> {
  const stored = read()
  if (!stored || stored.generatedAt !== generatedAt) return {}
  return stored.done
}

export function setTaskDone(generatedAt: string, taskId: string, done: boolean): void {
  const stored = read()
  const sameGeneration = stored && stored.generatedAt === generatedAt
  const next: Stored = {
    generatedAt,
    done: sameGeneration ? { ...stored!.done } : {},
  }
  if (done) {
    next.done[taskId] = true
  } else {
    delete next.done[taskId]
  }
  write(next)
}

export function clearTaskState(): void {
  try {
    localStorage.removeItem(TASK_STATE_STORAGE_KEY)
  } catch {
    // ignore
  }
}
