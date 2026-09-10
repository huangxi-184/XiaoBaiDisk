const Koa = require("koa")
const Router = require("@koa/router")
const serve = require("koa-static")
const { koaBody } = require("koa-body")
const fs = require("fs").promises
const { createReadStream, mkdirSync, readdirSync, renameSync, readFileSync } = require("fs")
const path = require("path")
const os = require("os")
const notifier = require("node-notifier")

const app = new Koa()
const router = new Router()

function loadUserConfig() {
  try {
    return JSON.parse(readFileSync(path.join(__dirname, "config.json"), "utf8"))
  } catch {
    return {}
  }
}

const userConfig = loadUserConfig()
const UPLOAD_DIR = path.resolve(
  process.env.XIAOBAI_UPLOAD_DIR || userConfig.uploadDir || path.join(os.homedir(), "Documents", "xiaobaiDisk")
)
const PORT = Number(process.env.XIAOBAI_PORT || userConfig.port || 3000)
const HOST = process.env.XIAOBAI_HOST || userConfig.host || "0.0.0.0"

mkdirSync(UPLOAD_DIR, { recursive: true })

/** Resolve name under UPLOAD_DIR; returns null if it escapes the root. */
function resolveUploadPath(name) {
  if (!name || name.includes("\0")) return null
  const root = path.resolve(UPLOAD_DIR)
  const target = path.resolve(root, name)
  const rel = path.relative(root, target)
  // Only block real escapes. Do not use startsWith("..") — that rejects "..foo".
  if (rel === "" || rel === ".." || rel.startsWith(".." + path.sep) || path.isAbsolute(rel)) {
    return null
  }
  return target
}

/**
 * Parse a Range header. Returns { start, end } | "full" | "invalid".
 * Multi-range / unknown unit → ignore and serve full body (RFC 7233).
 */
function parseRangeHeader(range, size) {
  if (!range) return "full"
  const raw = range.trim()
  if (raw.includes(",")) return "full"

  const m = /^bytes=(\d*)-(\d*)$/i.exec(raw)
  if (!m || (m[1] === "" && m[2] === "")) return "full"

  let start, end
  if (m[1] === "") {
    // suffix: last N bytes; if N > size, serve entire file (RFC 7233)
    const suffix = Number(m[2])
    if (!Number.isFinite(suffix) || suffix <= 0) return "invalid"
    start = Math.max(size - suffix, 0)
    end = size - 1
  } else {
    start = Number(m[1])
    end = m[2] === "" ? size - 1 : Number(m[2])
    if (!Number.isFinite(start) || !Number.isFinite(end)) return "invalid"
    if (end >= size) end = size - 1
  }

  if (size === 0 || start >= size || start > end || start < 0) return "invalid"
  return { start, end }
}

function getLocalIPs() {
  const interfaces = os.networkInterfaces()
  const result = []

  const isPrivateIPv4 = (ip) =>
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)

  for (const name of Object.keys(interfaces)) {
    if (/wsl|docker|vmware|vbox|hyper-v|virtual/i.test(name)) continue
    for (const iface of interfaces[name]) {
      if (
        iface.family === "IPv4" &&
        !iface.internal &&
        isPrivateIPv4(iface.address)
      ) {
        result.push(iface.address)
      }
    }
  }

  return [...new Set(result)]
}

// Static files
app.use(serve(path.join(__dirname, "public")))

// Error handling middleware
app.use(async (ctx, next) => {
  try {
    await next()
  } catch (err) {
    ctx.status = err.status || 500
    ctx.body = { error: err.message || "Internal Server Error" }
  }
})

// Upload file
router.post(
  "/upload",
  koaBody({
    multipart: true,
    formidable: {
      uploadDir: UPLOAD_DIR,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024 * 1024, // 10GB
    },
  }),
  async (ctx) => {
    const file = ctx.request.files?.file
    if (!file) {
      ctx.status = 400
      ctx.body = { error: "请选择文件" }
      return
    }

    const parsed = path.parse(file.originalFilename)
    const timestamp = Date.now()
    const newFilename = `${parsed.name}_${timestamp}${parsed.ext}`
    const targetPath = path.join(UPLOAD_DIR, newFilename)

    renameSync(file.filepath, targetPath)

    ctx.body = { success: true, name: newFilename }

    // Windows desktop notification
    notifier.notify({
      title: "小白网盘",
      message: `新文件已上传: ${newFilename}`,
      sound: true,
      wait: false,
    })
  }
)

// Serve uploaded files (supports HTTP Range for resume)
router.get("/files/:name", async (ctx) => {
  // @koa/router already URI-decodes params. Do not decode again — names with "%" break.
  const name = ctx.params.name
  const filePath = resolveUploadPath(name)

  if (!filePath) {
    ctx.status = 403
    ctx.body = { error: "非法路径" }
    return
  }

  let stat
  try {
    stat = await fs.stat(filePath)
  } catch {
    ctx.status = 404
    ctx.body = { error: "文件不存在" }
    return
  }

  if (!stat.isFile()) {
    ctx.status = 404
    ctx.body = { error: "文件不存在" }
    return
  }

  const size = stat.size
  ctx.set("Accept-Ranges", "bytes")
  ctx.type = path.extname(name)

  const range = parseRangeHeader(ctx.get("range"), size)

  if (range === "invalid") {
    ctx.status = 416
    ctx.set("Content-Range", `bytes */${size}`)
    return
  }

  if (range === "full") {
    ctx.attachment(name)
    ctx.length = size
    ctx.body = createReadStream(filePath)
    return
  }

  ctx.status = 206
  ctx.set("Content-Range", `bytes ${range.start}-${range.end}/${size}`)
  ctx.attachment(name)
  ctx.length = range.end - range.start + 1
  ctx.body = createReadStream(filePath, { start: range.start, end: range.end })
})

// List files
router.get("/files", async (ctx) => {
  const names = readdirSync(UPLOAD_DIR).filter((f) => !f.startsWith("."))

  const files = await Promise.all(
    names.map(async (name) => {
      const filePath = path.join(UPLOAD_DIR, name)
      try {
        const stat = await fs.stat(filePath)
        return {
          name,
          url: `/files/${encodeURIComponent(name)}`,
          size: stat.size,
          mtime: stat.mtimeMs,
        }
      } catch {
        return null
      }
    })
  )

  // Sort by mtime descending (newest first)
  ctx.body = files
    .filter(Boolean)
    .sort((a, b) => b.mtime - a.mtime)
})

app.use(router.routes()).use(router.allowedMethods())

app.listen(PORT, HOST, () => {
  const localIPs = getLocalIPs()

  console.log("🎉 局域网网盘已启动：")
  console.log(`  存储目录: ${UPLOAD_DIR}`)

  if (localIPs.length) {
    localIPs.forEach((ip) => {
      console.log(`  http://${ip}:${PORT}`)
    })
  } else {
    console.log(`  http://localhost:${PORT}`)
  }
})
