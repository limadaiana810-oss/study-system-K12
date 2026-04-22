import { NextResponse } from "next/server"
import { listFiles, getDb } from "@/lib/server/sqlite"
import { removeUploadFile } from "@/lib/server/storage"
import { readFileIndex } from "@/lib/server/fileIndex"
import fs from "node:fs"
import path from "node:path"

export const runtime = "nodejs"

export async function POST() {
  try {
    const rows = listFiles()
    // 1) 删除所有磁盘文件
    for (const row of rows) {
      removeUploadFile(row.filePath)
    }

    // 2) 清空 SQLite
    const db = getDb()
    db.exec("DELETE FROM files")

    // 3) 清空 file-index.json
    const dataDir = path.join(process.cwd(), "data")
    const indexPath = path.join(dataDir, "file-index.json")
    fs.writeFileSync(indexPath, JSON.stringify({ version: 1, files: [] }, null, 2) + "\n", "utf8")

    return NextResponse.json({ ok: true, deleted: rows.length })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "clear failed"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
