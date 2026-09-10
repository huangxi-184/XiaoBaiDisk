const fs = require("fs")
const path = require("path")

const projectDir = __dirname
const startupDir = path.join(
  process.env.APPDATA,
  "Microsoft",
  "Windows",
  "Start Menu",
  "Programs",
  "Startup"
)
const vbsDest = path.join(startupDir, "XiaoBaiDisk.vbs")

// Startup folder copies can't use ScriptFullName for the project path — bake it in.
const vbsBody = `Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c cd /d ""${projectDir.replace(/"/g, '""')}"" && node app.js", 0, False
`

fs.writeFileSync(vbsDest, vbsBody)
console.log("✅ 已添加到开机启动项")
console.log(`   ${vbsDest}`)
console.log(`   启动目录: ${projectDir}`)
console.log("")
console.log("📌 若想取消开机自启，直接删除该文件即可")
