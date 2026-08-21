const Koa = require("koa")
const Router = require("@koa/router")
const serve = require("koa-static")
const { koaBody } = require("koa-body")
const fs = require("fs").promises
const { createReadStream, mkdirSync, readdirSync, renameSync, statSync } = require("fs")
const path = require("path")
const os = require("os")
const notifier = require("node-notifier")

const app = new Koa()
const router = new Router()

const UPLOAD_DIR = "C:\\Users\\18421\\Documents\\xiaobaiDisk"

mkdirSync(UPLOAD_DIR, { recursive: true })

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

// Serve uploaded files
router.get("/files/:name", async (ctx) => {
  const name = decodeURIComponent(ctx.params.name)
  const filePath = path.join(UPLOAD_DIR, name)

  if (!filePath.startsWith(UPLOAD_DIR)) {
    ctx.status = 403
    return
  }

  try {
    statSync(filePath)
  } catch {
    ctx.status = 404
    ctx.body = { error: "文件不存在" }
    return
  }

  ctx.type = path.extname(name)
  ctx.attachment(name)
  ctx.body = createReadStream(filePath)
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

const PORT = 3000
const HOST = "0.0.0.0"

app.listen(PORT, HOST, () => {
  const localIPs = getLocalIPs()

  console.log("🎉 局域网网盘已启动：")

  if (localIPs.length) {
    localIPs.forEach((ip) => {
      console.log(`  http://${ip}:${PORT}`)
    })
  } else {
    console.log(`  http://localhost:${PORT}`)
  }
})
