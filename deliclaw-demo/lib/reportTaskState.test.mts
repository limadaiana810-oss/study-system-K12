import test from "node:test"
import assert from "node:assert/strict"

import {
  readTaskState,
  setTaskDone,
  clearTaskState,
  TASK_STATE_STORAGE_KEY,
} from "./reportTaskState.ts"

function installShim() {
  const store = new Map<string, string>()
  ;(globalThis as any).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  }
  return store
}

test("TASK_STATE_STORAGE_KEY exposes the storage key", () => {
  assert.equal(TASK_STATE_STORAGE_KEY, "deliclaw_report_wq_tasks")
})

test("readTaskState returns empty object when nothing stored", () => {
  installShim()
  assert.deepEqual(readTaskState("2026-05-07T00:00:00Z"), {})
})

test("setTaskDone writes a task and readTaskState returns it for matching generatedAt", () => {
  installShim()
  setTaskDone("2026-05-07T00:00:00Z", "focus-0-task-0", true)
  assert.deepEqual(readTaskState("2026-05-07T00:00:00Z"), { "focus-0-task-0": true })
})

test("readTaskState returns empty when generatedAt does not match stored generatedAt", () => {
  installShim()
  setTaskDone("2026-05-07T00:00:00Z", "focus-0-task-0", true)
  assert.deepEqual(readTaskState("2026-05-08T00:00:00Z"), {})
})

test("setTaskDone replaces stored generatedAt when called with a new one", () => {
  installShim()
  setTaskDone("2026-05-07T00:00:00Z", "focus-0-task-0", true)
  setTaskDone("2026-05-08T00:00:00Z", "focus-0-task-1", true)
  assert.deepEqual(readTaskState("2026-05-07T00:00:00Z"), {})
  assert.deepEqual(readTaskState("2026-05-08T00:00:00Z"), { "focus-0-task-1": true })
})

test("setTaskDone(false) removes a previously-set task", () => {
  installShim()
  setTaskDone("2026-05-07T00:00:00Z", "focus-0-task-0", true)
  setTaskDone("2026-05-07T00:00:00Z", "focus-0-task-0", false)
  assert.deepEqual(readTaskState("2026-05-07T00:00:00Z"), {})
})

test("clearTaskState removes the storage key", () => {
  const store = installShim()
  setTaskDone("2026-05-07T00:00:00Z", "focus-0-task-0", true)
  clearTaskState()
  assert.equal(store.has(TASK_STATE_STORAGE_KEY), false)
})

test("readTaskState handles malformed JSON gracefully", () => {
  installShim()
  ;(globalThis as any).localStorage.setItem(TASK_STATE_STORAGE_KEY, "not json")
  assert.deepEqual(readTaskState("2026-05-07T00:00:00Z"), {})
})
