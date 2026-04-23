export const SOURCE_CHANNELS = [
  { label: "微信", tone: "emerald" },
  { label: "QQ", tone: "sky" },
  { label: "钉钉", tone: "blue" },
  { label: "飞书", tone: "indigo" },
  { label: "学校平台", tone: "amber" },
  { label: "相册拍照", tone: "rose" },
  { label: "网盘收藏", tone: "violet" },
] as const

export type SourceChannelLabel = (typeof SOURCE_CHANNELS)[number]["label"]

type DemoSourceFile = {
  id?: string | null
  fileName?: string | null
}

function hashText(text: string) {
  let hash = 0
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0
  }
  return hash
}

export function getDemoSourceChannel(params: { id?: string; fileName?: string }): SourceChannelLabel {
  const seed = `${params.id || ""}:${params.fileName || ""}`.trim()
  if (seed === ":") return "微信"
  return SOURCE_CHANNELS[hashText(seed) % SOURCE_CHANNELS.length].label
}

export function assignDemoSourceChannels(files: readonly DemoSourceFile[]): SourceChannelLabel[] {
  const ranked = files.map((file, index) => ({
    index,
    rank: hashText(`${file.id || ""}:${file.fileName || ""}`),
  }))

  ranked.sort((a, b) => a.rank - b.rank || a.index - b.index)

  const channels = new Array<SourceChannelLabel>(files.length)
  ranked.forEach((item, assignmentIndex) => {
    channels[item.index] = SOURCE_CHANNELS[assignmentIndex % SOURCE_CHANNELS.length].label
  })

  return channels
}
