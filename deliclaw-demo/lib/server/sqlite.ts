import path from "path"
import fs from "fs"
import { createRequire } from "module"
import { execFileSync, spawnSync } from "child_process"

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
const requireFromHere = createRequire(import.meta.url)
const SQLITE_BIN = "sqlite3"

function hasSqliteCli() {
  const result = spawnSync(SQLITE_BIN, ["-version"], { stdio: "ignore" })
  return result.status === 0
}

function sqlLiteral(value: unknown) {
  if (value === null || value === undefined) return "NULL"
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL"
  if (typeof value === "boolean") return value ? "1" : "0"
  return `'${String(value).replace(/'/g, "''")}'`
}

function renderSql(sql: string, params?: unknown) {
  if (!params) return sql

  if (Array.isArray(params)) {
    let i = 0
    return sql.replace(/\?/g, () => sqlLiteral(params[i++]))
  }

  if (typeof params === "object") {
    const record = params as Record<string, unknown>
    return sql.replace(/[@:$][A-Za-z_][A-Za-z0-9_]*/g, (token) => {
      const key = token.slice(1)
      return sqlLiteral(record[key] ?? record[token])
    })
  }

  return sql.replace(/\?/, sqlLiteral(params))
}

class SqliteCliStatement {
  private dbPath: string
  private sql: string

  constructor(dbPath: string, sql: string) {
    this.dbPath = dbPath
    this.sql = sql
  }

  run(params?: unknown) {
    execFileSync(SQLITE_BIN, [this.dbPath, renderSql(this.sql, params)], { encoding: "utf8" })
  }

  all(...params: unknown[]) {
    const normalizedParams = params.length <= 1 ? params[0] : params
    const out = execFileSync(SQLITE_BIN, ["-json", this.dbPath, renderSql(this.sql, normalizedParams)], {
      encoding: "utf8",
    }).trim()
    return out ? JSON.parse(out) : []
  }

  get(...params: unknown[]) {
    return this.all(...params)[0]
  }
}

class SqliteCliCompat {
  private dbPath: string

  constructor(dbPath: string) {
    this.dbPath = dbPath
  }

  pragma(sql: string) {
    this.exec(`PRAGMA ${sql}`)
  }

  exec(sql: string) {
    return execFileSync(SQLITE_BIN, [this.dbPath, sql], { encoding: "utf8" })
  }

  prepare(sql: string) {
    return new SqliteCliStatement(this.dbPath, sql)
  }
}

function getSqliteBackend(): BetterSqlite3 {
  if (hasSqliteCli()) return SqliteCliCompat

  try {
    const optionalPackage = ["better", "sqlite3"].join("-")
    return requireFromHere(optionalPackage)
  } catch {
    throw new Error("未找到可用 SQLite 后端：请确认系统 sqlite3 命令可用，或在 deliclaw-demo 下执行 `npm i better-sqlite3`")
  }
}

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })
}

export function getDb() {
  if (_db) return _db
  const BetterSqlite3Ctor = getSqliteBackend()

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

export function tryUpsertFile(record: StoredFile): { ok: true } | { ok: false; error: string } {
  try {
    upsertFile(record)
    return { ok: true }
  } catch (e) {
    const error = e instanceof Error ? e.message : "SQLite write failed"
    return { ok: false, error }
  }
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

export function deleteFile(id: string): boolean {
  const db = getDb()
  try {
    db.prepare("DELETE FROM files WHERE id = ?").run(id)
    return true
  } catch {
    return false
  }
}
