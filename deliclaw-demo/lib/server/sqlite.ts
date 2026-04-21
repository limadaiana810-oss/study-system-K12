import path from "path"
import fs from "fs"

export type StoredFile = {
  id: string
  fileName: string
  title?: string
  mimeType: string
  filePath: string // 相对 data/ 目录的路径，如 "uploads/<uuid>.jpg"
  uploadedAt: string
  description: string
  tags: {
    subject?: string
    questionType?: string
    knowledgePoints?: string[]
    date?: string // YYYY-MM-DD
  }
  tagsRaw?: string[]
  embedding?: number[] // 归一化后的向量
  createdAt: string
  updatedAt: string
}

type BetterSqlite3 = any

let _db: any | null = null

function getBetterSqlite3(): BetterSqlite3 {
  try {
    // eslint-disable-next-line no-new-func
    const req = new Function("m", "return require(m)") as (m: string) => any
    return req("better-sqlite3")
  } catch {
    throw new Error('未安装 SQLite 依赖：请在 deliclaw-demo 下执行 `npm i better-sqlite3`')
  }
}

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })
}

export function getDb() {
  if (_db) return _db
  const BetterSqlite3Ctor = getBetterSqlite3()

  const dataDir = path.join(process.cwd(), "data")
  ensureDir(dataDir)
  const dbPath = path.join(dataDir, "deliclaw.sqlite")

  const db = new BetterSqlite3Ctor(dbPath)
  db.pragma("journal_mode = WAL")

  // 如果检测到旧 schema（有 base64 列但没有 file_path 列），直接 DROP —— 这是 demo，不做迁移
  const cols = db.prepare("PRAGMA table_info(files)").all() as Array<{ name: string }>
  const hasOldSchema =
    cols.length > 0 &&
    cols.some((c) => c.name === "base64") &&
    !cols.some((c) => c.name === "file_path")
  if (hasOldSchema) {
    db.exec("DROP TABLE files")
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      file_name TEXT NOT NULL,
      title TEXT,
      mime_type TEXT NOT NULL,
      file_path TEXT NOT NULL,
      uploaded_at TEXT NOT NULL,
      description TEXT NOT NULL,
      tags_json TEXT NOT NULL,
      tags_raw_json TEXT,
      embedding_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_files_file_name ON files(file_name);
    CREATE INDEX IF NOT EXISTS idx_files_title ON files(title);
    CREATE INDEX IF NOT EXISTS idx_files_uploaded_at ON files(uploaded_at);
  `)

  _db = db
  return db
}

export function upsertFile(record: StoredFile) {
  const db = getDb()
  const now = new Date().toISOString()

  const stmt = db.prepare(`
    INSERT INTO files (
      id, file_name, title, mime_type, file_path, uploaded_at,
      description, tags_json, tags_raw_json, embedding_json,
      created_at, updated_at
    ) VALUES (
      @id, @fileName, @title, @mimeType, @filePath, @uploadedAt,
      @description, @tagsJson, @tagsRawJson, @embeddingJson,
      @createdAt, @updatedAt
    )
    ON CONFLICT(id) DO UPDATE SET
      file_name=excluded.file_name,
      title=excluded.title,
      mime_type=excluded.mime_type,
      file_path=excluded.file_path,
      uploaded_at=excluded.uploaded_at,
      description=excluded.description,
      tags_json=excluded.tags_json,
      tags_raw_json=excluded.tags_raw_json,
      embedding_json=excluded.embedding_json,
      updated_at=excluded.updated_at
  `)

  stmt.run({
    id: record.id,
    fileName: record.fileName,
    title: record.title ?? null,
    mimeType: record.mimeType,
    filePath: record.filePath,
    uploadedAt: record.uploadedAt,
    description: record.description,
    tagsJson: JSON.stringify(record.tags || {}),
    tagsRawJson: record.tagsRaw ? JSON.stringify(record.tagsRaw) : null,
    embeddingJson: record.embedding ? JSON.stringify(record.embedding) : null,
    createdAt: record.createdAt || now,
    updatedAt: now,
  })
}

export function listFiles(): Array<{
  id: string
  fileName: string
  title: string | null
  mimeType: string
  filePath: string
  uploadedAt: string
  description: string
  tags_json: string
  tags_raw_json: string | null
  embedding_json: string | null
  createdAt: string
  updatedAt: string
}> {
  const db = getDb()
  const rows = db
    .prepare(
      `SELECT id, file_name as fileName, title, mime_type as mimeType, file_path as filePath,
              uploaded_at as uploadedAt, description, tags_json, tags_raw_json, embedding_json,
              created_at as createdAt, updated_at as updatedAt
       FROM files
       ORDER BY updated_at DESC`
    )
    .all()

  return rows
}

export function getFileById(id: string):
  | { id: string; fileName: string; title: string | null; mimeType: string; filePath: string }
  | undefined {
  const db = getDb()
  return db
    .prepare(
      `SELECT id, file_name as fileName, title, mime_type as mimeType, file_path as filePath
       FROM files
       WHERE id = ?`
    )
    .get(id)
}
