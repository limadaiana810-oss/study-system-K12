import test from "node:test"
import assert from "node:assert/strict"

import {
  MOCK_SCORES,
  MOCK_EMOTION_HISTORY,
  getScoresForWindow,
} from "./mockScores.ts"

test("MOCK_SCORES covers all 5 subjects", () => {
  const subjects = new Set(MOCK_SCORES.map((s) => s.subject))
  assert.equal(subjects.size, 5)
  for (const subj of ["语文", "数学", "英语", "物理", "化学"]) {
    assert.ok(subjects.has(subj as any), `missing ${subj}`)
  }
})

test("MOCK_SCORES has at least 50 entries spread over 30 days", () => {
  assert.ok(MOCK_SCORES.length >= 50, `expected >= 50, got ${MOCK_SCORES.length}`)
  const dates = MOCK_SCORES.map((s) => s.date).sort()
  const span = (new Date(dates[dates.length - 1]).getTime() - new Date(dates[0]).getTime()) / (24 * 3600 * 1000)
  assert.ok(span <= 30 && span >= 20, `span out of range: ${span}`)
})

test("MOCK_SCORES values are within [0, max] for each entry", () => {
  for (const s of MOCK_SCORES) {
    assert.ok(s.value >= 0 && s.value <= s.max, `invalid value ${s.value}/${s.max} for ${s.id}`)
  }
})

test("getScoresForWindow returns ascending dates and respects window", () => {
  const out = getScoresForWindow(30)
  assert.ok(out.length > 0)
  for (let i = 1; i < out.length; i++) {
    assert.ok(out[i - 1].date <= out[i].date, `dates not ascending at ${i}`)
  }
})

test("MOCK_EMOTION_HISTORY has exactly 4 weekly entries with valid weeks", () => {
  assert.equal(MOCK_EMOTION_HISTORY.length, 4)
  assert.deepEqual(
    MOCK_EMOTION_HISTORY.map((e) => e.week),
    [1, 2, 3, 4]
  )
  for (const entry of MOCK_EMOTION_HISTORY) {
    assert.ok(typeof entry.dominant === "string" && entry.dominant.length > 0)
  }
})
