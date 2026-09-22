# 小白网盘 — 局域网文件分享工具

同一局域网内的设备（手机、电脑、平板）可通过浏览器上传和下载文件。

## 快速开始

### Docker（推荐）

```bash
docker compose up -d --build
```

浏览器打开 <http://localhost:3000> 即可。局域网其他设备用 Windows 主机的 IPv4 访问：

```powershell
ipconfig   # 找到「IPv4 地址」，例如 192.168.x.x
```

手机/电脑打开 `http://192.168.x.x:3000`。

### 本地运行

```bash
npm install
npm start
```

## 使用方法

| 操作 | 说明 |
|------|------|
| 上传文件 | 点击上传区域选择文件，或拖拽文件到上传区域 |
| 下载文件 | 点击文件旁的「下载」按钮 |
| 查看文件 | 页面自动列出所有已上传文件，含大小和时间 |

- 上传后局域网其他设备刷新页面即可看到新文件
- 下载支持 HTTP Range，大文件可断点续传
- 单文件上限 10GB

## 文件存储位置

```
C:\Users\18421\Documents\xiaobaiDisk
```

Docker 部署时通过 bind mount 映射到容器内 `/data`，和本地运行是**同一个目录**。资源管理器里可以直接增删文件，页面刷新即可看到。

## 配置

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

Docker 部署改存储目录或端口，直接编辑 `docker-compose.yml`：

```yaml
    volumes:
      - "D:/XiaoBaiDisk:/data"        # 换主机目录
    ports:
      - "8080:3000"                    # 换访问端口
```

然后 `docker compose up -d` 生效。修改后需重启服务。

## Docker 常用命令

| 操作 | 命令 |
|------|------|
| 启动 | `docker compose up -d` |
| 停止 | `docker compose down` |
| 重启 | `docker compose restart` |
| 看日志 | `docker compose logs -f` |
| 重新构建（代码改了之后） | `docker compose up -d --build` |
| 进容器排查 | `docker compose exec xiaobaidisk sh` |

停止/删除容器不影响已上传的文件——文件在 Windows 目录里，不在容器里。

## 开机自启（Docker）

两步都做完，重启电脑后网盘会自己回来：

1. **Docker Desktop 随系统启动**：托盘图标 → Settings → General → 勾选 **Start Docker Desktop when you sign in**
2. **容器随 Docker 启动**：`docker-compose.yml` 里已配置 `restart: unless-stopped`，无需额外操作

## 故障排查

**上传报错 / 502**

```bash
docker compose logs
```

最常见的是 `/data` 权限问题（EACCES）。确认目录存在：

```powershell
mkdir C:\Users\18421\Documents\xiaobaiDisk
```

**端口 3000 被占用**

```powershell
netstat -ano | findstr :3000
```

按 PID 停掉占用进程，或把 `docker-compose.yml` 的端口改掉。

**局域网设备打不开**

1. 确认容器在跑：`docker compose ps`
2. 确认 Windows 防火墙放行了 3000 端口
3. 确认手机和电脑在同一个局域网（访客 Wi-Fi 常常是隔离的）
4. 用 Windows 的 IPv4 访问，不要用 `localhost`

## 从旧版本迁移

老版本会往 Windows 启动项里写 `XiaoBaiDisk.vbs` 实现开机自启。如果还留着，删掉即可：

```bat
del "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\XiaoBaiDisk.vbs"
```

老的后台进程用下面命令停掉（只杀跑 `app.js` 的 node）：

```powershell
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -match 'app\.js' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
```

## 技术说明

- 基于 Koa 3 框架
- 文件上传通过 XHR 异步提交，有进度条
- 支持所有文件类型，单文件上限 10GB
- 下载支持 HTTP Range，大文件可断点续传
- Docker 镜像：`node:20-alpine`，非 root 运行
