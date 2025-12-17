const Koa = require("koa")
const Router = require("@koa/router")
const serve = require("koa-static")
const { koaBody } = require("koa-body")
const fs = require("fs")
const path = require("path")
const os = require("os")

const app = new Koa()
const router = new Router()

const UPLOAD_DIR = path.join(__dirname, "public", "files")

fs.mkdirSync(UPLOAD_DIR, { recursive: true })

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

app.use(serve(path.join(__dirname, "public")))

router.post(
  "/upload",
  koaBody({
    multipart: true,
    formidable: {
      uploadDir: UPLOAD_DIR,
      keepExtensions: true,
    },
  }),
  async (ctx) => {
    const file = ctx.request.files.file

    const parsed = path.parse(file.originalFilename)
    const timestamp = Date.now()
    const newFilename = `${parsed.name}_${timestamp}${parsed.ext}`
    const targetPath = path.join(UPLOAD_DIR, newFilename)

    fs.renameSync(file.filepath, targetPath)

    ctx.redirect("/")
  }
)

router.get("/files", async (ctx) => {
  const files = fs
    .readdirSync(UPLOAD_DIR)
    .filter((f) => !f.startsWith("."))
    .map((name) => ({
      name,
      url: `/files/${encodeURIComponent(name)}`,
    }))

  ctx.body = files
})

app.use(router.routes()).use(router.allowedMethods())

const PORT = 3000
const HOST = "0.0.0.0"

app.listen(PORT, HOST, () => {
  const localIPs = getLocalIPs()

  console.log("🎉 局域网网盘已启动：")

  if (localIPs.length) {
    localIPs.forEach((ip) => {
      console.log(`🌐 http://${ip}:${PORT}`)
    })
  } else {
    console.log(`💻 http://localhost:${PORT}`)
  }
})
