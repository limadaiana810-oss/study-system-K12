import { NextRequest, NextResponse } from "next/server"
import { deleteFile, getFileById } from "@/lib/server/sqlite"
import { removeUploadFile } from "@/lib/server/storage"
import { removeFileIndexEntry } from "@/lib/server/fileIndex"

export const runtime = "nodejs"

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    if (!id) {
      return NextResponse.json({ error: "missing id" }, { status: 400 })
    }

    const row = getFileById(id)
    if (!row) {
      return NextResponse.json({ error: "not found" }, { status: 404 })
    }

    // 1) 删磁盘文件
    removeUploadFile(row.filePath)

    // 2) 删 SQLite 记录
    deleteFile(id)

    // 3) 删 file-index.json 条目
    removeFileIndexEntry(id)

    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "delete failed"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
