import type { FileIndexEntry, UploadedFile, FileCard } from "@/types"

/**
 * 本地语义检索（方案 C）：
 * - 浏览器端用 transformers.js 做 embedding（特征抽取 + mean pooling + normalize）
 * - 将每个文件的 embedding 存到 IndexedDB（key = fileName）
 * - 查询时对 query 做 embedding，和所有文件向量做归一化点积（≈余弦相似度）召回
 *
 * 注意：
 * - 模型与权重需要首次网络下载（浏览器缓存后会变快）
 * - 如果加载失败/未就绪，应回退到规则/模糊匹配方案
 */

type Embedding = Float32Array

type EmbeddingRecord = {
  fileName: string
  vector: Embedding
  updatedAt: string
}

const DB_NAME = "deliclaw_semantic"
const STORE = "embeddings"
const DB_VERSION = 1

let _extractor: any | null = null
let _extractorPromise: Promise<any> | null = null

async function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") throw new Error("IndexedDB 不可用（可能在服务端或禁用环境）")

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "fileName" })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error("openDb failed"))
  })
}

async function idbPut(record: EmbeddingRecord): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite")
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error("idbPut tx failed"))
    tx.objectStore(STORE).put(record)
  })
  db.close()
}

async function idbGetAll(): Promise<EmbeddingRecord[]> {
  const db = await openDb()
  const res = await new Promise<EmbeddingRecord[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly")
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => resolve((req.result ?? []) as EmbeddingRecord[])
    req.onerror = () => reject(req.error ?? new Error("idbGetAll failed"))
  })
  db.close()
  return res
}

async function idbGet(fileName: string): Promise<EmbeddingRecord | undefined> {
  const db = await openDb()
  const res = await new Promise<EmbeddingRecord | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly")
    const req = tx.objectStore(STORE).get(fileName)
    req.onsuccess = () => resolve(req.result as EmbeddingRecord | undefined)
    req.onerror = () => reject(req.error ?? new Error("idbGet failed"))
  })
  db.close()
  return res
}

function dot(a: Embedding, b: Embedding): number {
  const n = Math.min(a.length, b.length)
  let s = 0
  for (let i = 0; i < n; i++) s += a[i] * b[i]
  return s
}

function buildDocText(entry: Pick<FileIndexEntry, "fileName" | "tags" | "description">): string {
  const parts = [
    `文件名：${entry.fileName}`,
    entry.tags?.length ? `标签：${entry.tags.join("，")}` : "",
    entry.description ? `内容：${entry.description}` : "",
  ].filter(Boolean)
  return parts.join("\n")
}

export async function warmupSemanticModel(): Promise<void> {
  await getExtractor()
}

async function getExtractor(): Promise<any> {
  if (_extractor) return _extractor
  if (_extractorPromise) return _extractorPromise

  _extractorPromise = (async () => {
    if (typeof window === "undefined") throw new Error("semantic extractor 只能在浏览器端使用")

    // 重要：这里不能用 `import("@xenova/transformers")` 直接写死，
    // 否则在依赖未安装时 Next/Webpack 会在构建阶段直接报 “Module not found”。
    // 用 Function 包一层，让构建能通过；运行时若未安装/加载失败，则回退到规则检索。
    let pipeline: any
    try {
      // eslint-disable-next-line no-new-func
      const dynamicImport = new Function('m', 'return import(m)') as (m: string) => Promise<any>
      const mod = await dynamicImport("@xenova/transformers")
      pipeline = mod.pipeline
    } catch (e) {
      throw new Error("语义检索依赖未安装：请执行 `npm install @xenova/transformers` 后重试")
    }

    // 多语言模型（含中文），体积与效果在 demo 场景比较平衡
    // 你也可以替换为更偏中文的模型（取决于部署网络与体积预算）：
    // - Xenova/bge-small-zh-v1.5
    // - Xenova/text2vec-base-chinese
    const model = "Xenova/paraphrase-multilingual-MiniLM-L12-v2"

    const extractor = await pipeline("feature-extraction", model, {
      // 量化可明显减小体积/加速（但首次下载仍可能较慢）
      quantized: true,
    })

    _extractor = extractor
    return extractor
  })().finally(() => {
    // 允许失败后重试
    _extractorPromise = null
  })

  return _extractorPromise
}

async function embedText(text: string): Promise<Embedding> {
  const extractor = await getExtractor()
  const out = await extractor(text, { pooling: "mean", normalize: true })
  // transformers.js: out.data is Float32Array
  if (!out?.data || !(out.data instanceof Float32Array)) {
    throw new Error("embedding 输出格式异常")
  }
  return out.data as Float32Array
}

export async function upsertFileEmbedding(entry: Pick<FileIndexEntry, "fileName" | "tags" | "description">): Promise<void> {
  if (!entry?.fileName) return
  const vec = await embedText(buildDocText(entry))
  await idbPut({ fileName: entry.fileName, vector: vec, updatedAt: new Date().toISOString() })
}

export async function ensureEmbeddingsForIndex(fileIndex: FileIndexEntry[]): Promise<void> {
  // 只对缺失的文件做补齐，避免每次重复算向量
  const tasks = fileIndex.map(async (f) => {
    if (!f?.fileName) return
    const existing = await idbGet(f.fileName)
    if (existing?.vector?.length) return
    await upsertFileEmbedding(f)
  })
  await Promise.allSettled(tasks)
}

export async function semanticRetrieve(params: {
  query: string
  fileIndex: FileIndexEntry[]
  uploadedFiles: UploadedFile[]
  topK?: number
  threshold?: number
}): Promise<{ fileCards: FileCard[]; hits: Array<{ fileName: string; score: number }> }> {
  const { query, fileIndex, uploadedFiles, topK = 6, threshold = 0.35 } = params
  if (!query?.trim() || !fileIndex?.length) return { fileCards: [], hits: [] }

  // 先尽量补齐 embedding（异步并行，失败不抛出）
  await ensureEmbeddingsForIndex(fileIndex)

  const q = await embedText(query.trim())
  const all = await idbGetAll()

  const allow = new Set(fileIndex.map((f) => f.fileName))
  const scored = all
    .filter((r) => allow.has(r.fileName) && r.vector?.length)
    .map((r) => ({ fileName: r.fileName, score: dot(q, r.vector) }))
    .filter((x) => x.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)

  const fileCards: FileCard[] = scored
    .map((s) => {
      const found = uploadedFiles.find((f) => f.name === s.fileName)
      if (!found) return null
      const idx = fileIndex.find((x) => x.fileName === s.fileName)
      return {
        name: found.name,
        base64: found.base64,
        mimeType: found.mimeType,
        tags: idx?.tags || [],
        uploadedAt: new Date(found.uploadedAt),
      }
    })
    .filter(Boolean) as FileCard[]

  return { fileCards, hits: scored }
}
