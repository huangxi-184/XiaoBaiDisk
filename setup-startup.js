const fs = require("fs")
const path = require("path")

const vbsSrc = path.join(__dirname, "start.vbs")
const startupDir = path.join(
  process.env.APPDATA,
  "Microsoft",
  "Windows",
  "Start Menu",
  "Programs",
  "Startup"
)
const vbsDest = path.join(startupDir, "XiaoBaiDisk.vbs")

if (!fs.existsSync(vbsSrc)) {
  console.error("❌ 找不到 start.vbs")
  process.exit(1)
}

fs.copyFileSync(vbsSrc, vbsDest)
console.log("✅ 已添加到开机启动项")
console.log(`   ${vbsDest}`)
console.log("")
console.log("📌 若想取消开机自启，直接删除该文件即可")
