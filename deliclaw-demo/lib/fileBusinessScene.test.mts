import test from "node:test"
import assert from "node:assert/strict"

import { BUSINESS_SCENES, getDemoBusinessScenes, groupFilesByBusinessScene } from "./fileBusinessScene.ts"

test("defines parent-facing business scenes instead of source channels", () => {
  assert.deepEqual(BUSINESS_SCENES, [
    "最近错题",
    "本周作业",
    "考试资料",
    "学校通知",
    "旅游照片",
    "成长记录",
    "复习资料",
  ])
})

test("maps study files to mistake and review scenes with simple demo rules", () => {
  const scenes = getDemoBusinessScenes({
    id: "math-1",
    fileName: "数学错题-方程组.jpg",
    mimeType: "image/jpeg",
    sourceChannel: "相册拍照",
    description: "今天拍下来的错题",
    subject: "数学",
    questionType: "错题",
    knowledgePoints: ["方程组"],
  })

  assert.deepEqual(scenes, ["最近错题", "复习资料"])
})

test("maps school platform files to school notice and homework scenes", () => {
  const scenes = getDemoBusinessScenes({
    id: "notice-1",
    fileName: "周三作业通知.pdf",
    mimeType: "application/pdf",
    sourceChannel: "学校平台",
    description: "老师发的本周作业通知",
    knowledgePoints: [],
  })

  assert.deepEqual(scenes, ["本周作业", "学校通知"])
})

test("maps travel photos to a life scene without needing source lookup", () => {
  const scenes = getDemoBusinessScenes({
    id: "trip-1",
    fileName: "草原旅行照片.jpg",
    mimeType: "image/jpeg",
    sourceChannel: "微信",
    description: "有天空和草地",
    knowledgePoints: [],
  })

  assert.deepEqual(scenes, ["旅游照片", "成长记录"])
})

test("groups files by business scene for the file center view", () => {
  const grouped = groupFilesByBusinessScene([
    {
      id: "math-1",
      fileName: "数学错题.jpg",
      mimeType: "image/jpeg",
      sourceChannel: "相册拍照",
      subject: "数学",
      questionType: "错题",
      knowledgePoints: [],
    },
    {
      id: "trip-1",
      fileName: "草原旅行照片.jpg",
      mimeType: "image/jpeg",
      sourceChannel: "微信",
      knowledgePoints: [],
    },
  ])

  assert.equal(grouped.get("最近错题")?.length, 1)
  assert.equal(grouped.get("旅游照片")?.length, 1)
  assert.equal(grouped.get("复习资料")?.length, 1)
})
