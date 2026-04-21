import path from "path"
import fs from "fs"

const UPLOAD_DIR_NAME = "uploads"

/**
 * 本地文件存储（方案 C 的“磁盘落盘”部分）：
 * - 原图存放到 data/uploads/<uuid>.<ext>
 * - SQLite 里只存 file_path（相对 data/ 的路径）
 * - 通过 /api/uploads/[name] 路由对外提供访问，受 middleware token 保护
 *
 * 这样做的好处：
 * 1. SQLite 文件不会被 base64 撑爆（几十 MB 级别即可）
 * 2. 查询时返回的是 URL，不需要传 base64，首屏更快
 * 3. 浏览器可以利用 HTTP 缓存
 */

function uploadsRoot() {
  const dir = path.join(process.cwd(), "data", UPLOAD_DIR_NAME)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

function extFromMime(mime: string, fileName?: string) {
  const lower = (mime || "").toLowerCase()
  if (lower === "image/jpeg" || lower === "image/jpg") return "jpg"
  if (lower === "image/png") return "png"
  if (lower === "image/webp") return "webp"
  if (lower === "image/gif") return "gif"
  if (lower === "image/heic") return "heic"
  if (lower === "image/heif") return "heif"
  if (fileName && fileName.includes(".")) {
    const e = fileName.split(".").pop()?.toLowerCase()
    if (e && e.length <= 5 && /^[a-z0-9]+$/.test(e)) return e
  }
  return "bin"
}

export function guessMimeTypeFromName(name: string) {
  const ext = (name.split(".").pop() || "").toLowerCase()
  return ext === "jpg" || ext === "jpeg"
    ? "image/jpeg"
    : ext === "png"
    ? "image/png"
    : ext === "webp"
    ? "image/webp"
    : ext === "gif"
    ? "image/gif"
    : ext === "heic"
    ? "image/heic"
    : ext === "heif"
    ? "image/heif"
    : "application/octet-stream"
}

export function saveBase64ToDisk(params: {
  id: string
  base64: string
  mimeType: string
  fileName?: string
}): { absPath: string; relPath: string; sizeBytes: number } {
  const { id, base64, mimeType, fileName } = params
  const ext = extFromMime(mimeType, fileName)
  const fileBaseName = `${id}.${ext}`
  const absPath = path.join(uploadsRoot(), fileBaseName)
  const buf = Buffer.from(base64, "base64")
  fs.writeFileSync(absPath, buf)
  return {
    absPath,
    relPath: path.posix.join(UPLOAD_DIR_NAME, fileBaseName),
    sizeBytes: buf.byteLength,
  }
}

/**
 * 读取 uploads/ 下的文件。做了路径穿越防御。
 * 传入的是类似 "uploads/xxx.jpg" 的相对路径（或仅文件名）。
 */
export function readUploadFile(nameOrRel: string): { buf: Buffer; mimeType: string } | null {
  if (!nameOrRel) return null
  const fileName = nameOrRel.startsWith("uploads/") ? nameOrRel.slice("uploads/".length) : nameOrRel
  if (!fileName || fileName.includes("/") || fileName.includes("\\") || fileName.includes("..")) return null

  const root = path.normalize(uploadsRoot())
  const abs = path.normalize(path.join(root, fileName))
  if (!abs.startsWith(root)) return null
  if (!fs.existsSync(abs)) return null

  return { buf: fs.readFileSync(abs), mimeType: guessMimeTypeFromName(fileName) }
}

export function uploadsUrlFromRelPath(relPath: string): string {
  const name = relPath.startsWith("uploads/") ? relPath.slice("uploads/".length) : relPath
  return `/api/uploads/${name}`
}
