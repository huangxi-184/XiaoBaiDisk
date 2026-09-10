# 小白网盘 — 局域网文件分享工具

同一局域网内的设备（手机、电脑、平板）可通过浏览器上传和下载文件。

## 快速启动

```bash
# 安装依赖（首次使用）
npm install

# 启动服务
npm start
```

启动后终端会显示访问地址，例如 `http://192.168.x.x:3000`，局域网内任意设备打开浏览器访问即可。

## 后台运行（无终端窗口）

双击 `start.vbs`，或运行：

```bash
npm run start-hidden
```

服务会在后台静默运行，不会显示终端窗口。

## 开机自启

**设置（只需一次）：**

```bash
npm run setup-startup
```

**取消：** 打开以下目录，删除 `XiaoBaiDisk.vbs`：

```
%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\
```

## 使用方法

| 操作 | 说明 |
|------|------|
| 上传文件 | 点击上传区域选择文件，或拖拽文件到上传区域 |
| 下载文件 | 点击文件旁的"下载"按钮 |
| 查看文件 | 页面自动列出所有已上传文件，含大小和时间 |

- 上传后局域网其他设备刷新页面即可看到新文件
- 文件存储位置默认：`%USERPROFILE%\Documents\xiaobaiDisk`（可用下面方式改）

## 配置（可选）

优先级：环境变量 > 项目根目录 `config.json` > 默认值。

| 项 | 环境变量 | config.json 字段 | 默认值 |
|----|----------|------------------|--------|
| 存储目录 | `XIAOBAI_UPLOAD_DIR` | `uploadDir` | `%USERPROFILE%\Documents\xiaobaiDisk` |
| 端口 | `XIAOBAI_PORT` | `port` | `3000` |
| 监听地址 | `XIAOBAI_HOST` | `host` | `0.0.0.0` |

`config.json` 示例：

```json
{
  "uploadDir": "D:\\XiaoBaiDisk",
  "port": 3000
}
```

修改后需重启服务。

## 技术说明

- 基于 Koa 3 框架
- 文件上传通过 XHR 异步提交，有进度条
- 上传新文件时会触发 Windows 桌面通知
- 支持所有文件类型，无大小限制
- 下载支持 HTTP Range，大文件可断点续传
