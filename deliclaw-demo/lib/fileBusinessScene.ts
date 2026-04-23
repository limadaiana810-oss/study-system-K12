export const BUSINESS_SCENES = [
  "最近错题",
  "本周作业",
  "考试资料",
  "学校通知",
  "旅游照片",
  "成长记录",
  "复习资料",
] as const

export type BusinessSceneLabel = (typeof BUSINESS_SCENES)[number]

type SceneFile = {
  id: string
  fileName?: string | null
  mimeType?: string | null
  sourceChannel?: string | null
  description?: string | null
  subject?: string | null
  questionType?: string | null
  knowledgePoints?: readonly string[] | null
}

function normalizeText(file: SceneFile) {
  return [
    file.fileName,
    file.mimeType,
    file.sourceChannel,
    file.description,
    file.subject,
    file.questionType,
    ...(file.knowledgePoints || []),
  ].filter(Boolean).join(" ").toLowerCase()
}

function pushUnique(out: BusinessSceneLabel[], label: BusinessSceneLabel) {
  if (!out.includes(label)) out.push(label)
}

export function getDemoBusinessScenes(file: SceneFile): BusinessSceneLabel[] {
  const text = normalizeText(file)
  const scenes: BusinessSceneLabel[] = []

  if (/错|错题|题|数学|英语|方程|试卷|练习/.test(text)) {
    pushUnique(scenes, "最近错题")
    pushUnique(scenes, "复习资料")
  }

  if (/作业|homework|本周|今天|周[一二三四五六日]/.test(text)) {
    pushUnique(scenes, "本周作业")
  }

  if (/考试|测验|期中|期末|成绩|卷/.test(text)) {
    pushUnique(scenes, "考试资料")
  }

  if (/通知|学校|老师|班级|家长会/.test(text) || file.sourceChannel === "学校平台") {
    pushUnique(scenes, "学校通知")
  }

  if (/草原|旅游|旅行|天空|草地|照片|photo|trip/.test(text)) {
    pushUnique(scenes, "旅游照片")
    pushUnique(scenes, "成长记录")
  }

  if (file.sourceChannel === "相册拍照" && scenes.length === 0) {
    pushUnique(scenes, "成长记录")
  }

  if (scenes.length === 0) {
    pushUnique(scenes, "复习资料")
  }

  return scenes.slice(0, 2)
}

export function groupFilesByBusinessScene<T extends SceneFile>(files: readonly T[]) {
  const grouped = new Map<BusinessSceneLabel, T[]>()
  for (const scene of BUSINESS_SCENES) grouped.set(scene, [])

  for (const file of files) {
    for (const scene of getDemoBusinessScenes(file)) {
      grouped.get(scene)?.push(file)
    }
  }

  return grouped
}
