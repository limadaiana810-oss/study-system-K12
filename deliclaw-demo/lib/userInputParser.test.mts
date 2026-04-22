import { describe, it } from "node:test"
import assert from "node:assert"
import { parseUserInputCapture } from "./userInputParser.ts"

describe("parseUserInputCapture", () => {
  it("extracts task intent for 整理", () => {
    const items = parseUserInputCapture("帮我整理一下这些错题")
    const task = items.find((i) => i.type === "task_progress")
    assert.ok(task)
    assert.strictEqual(task.value, "文件整理")
  })

  it("extracts task intent for 找文件", () => {
    const items = parseUserInputCapture("帮我找一下上次的英语试卷")
    const task = items.find((i) => i.type === "task_progress")
    assert.ok(task)
    assert.strictEqual(task.value, "文件检索")
  })

  it("extracts emotion from 开心", () => {
    const items = parseUserInputCapture("今天很开心，作业都做完了")
    const emotion = items.find((i) => i.type === "emotion")
    assert.ok(emotion)
    assert.strictEqual(emotion.value, "愉悦")
  })

  it("extracts emotion from 累", () => {
    const items = parseUserInputCapture("好累啊，不想动了")
    const emotion = items.find((i) => i.type === "emotion")
    assert.ok(emotion)
    assert.strictEqual(emotion.value, "疲惫")
  })

  it("extracts fact: name", () => {
    const items = parseUserInputCapture("我叫小明")
    const fact = items.find((i) => i.type === "fact")
    assert.ok(fact)
    assert.strictEqual(fact.label, "姓名")
    assert.strictEqual(fact.value, "小明")
  })

  it("extracts fact: grade", () => {
    const items = parseUserInputCapture("我现在上高二")
    const fact = items.find((i) => i.type === "fact")
    assert.ok(fact)
    assert.strictEqual(fact.label, "年级")
    assert.strictEqual(fact.value, "高二")
  })

  it("extracts fact: school", () => {
    const items = parseUserInputCapture("我在北京大学读书")
    const fact = items.find((i) => i.type === "fact")
    assert.ok(fact)
    assert.strictEqual(fact.label, "学校")
    assert.strictEqual(fact.value, "北京大学")
  })

  it("extracts file_intent when mentioning images", () => {
    const items = parseUserInputCapture("看看这张截图")
    const file = items.find((i) => i.type === "file_intent")
    assert.ok(file)
    assert.strictEqual(file.value, "提及文件")
  })

  it("returns empty for blank text", () => {
    const items = parseUserInputCapture("")
    assert.strictEqual(items.length, 0)
  })

  it("returns empty for unrelated text", () => {
    const items = parseUserInputCapture("随便聊聊")
    assert.strictEqual(items.length, 0)
  })

  it("extracts multiple items from complex input", () => {
    const items = parseUserInputCapture("我叫小红，今天很开心，帮我整理一下这些错题")
    assert.ok(items.some((i) => i.type === "fact" && i.value === "小红"))
    assert.ok(items.some((i) => i.type === "emotion" && i.value === "愉悦"))
    assert.ok(items.some((i) => i.type === "task_progress" && i.value === "文件整理"))
  })
})
