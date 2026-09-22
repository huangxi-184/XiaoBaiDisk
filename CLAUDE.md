# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

局域网网盘 (LAN file sharing) — a lightweight Koa.js app that lets devices on the same LAN upload/download files. Single-page frontend served from Koa. Deployed via Docker.

## Commands

```sh
npm install                      # Install dependencies
npm start                        # Start server (foreground)

docker compose up -d --build     # Build image and start container
docker compose down              # Stop container
docker compose logs -f           # Tail logs
docker compose up -d --build     # Rebuild after code changes
```

- Server: http://localhost:3000
- Upload storage: `C:\Users\18421\Documents\xiaobaiDisk` (bind-mounted to `/data` in Docker)

## Architecture

```
app.js              # Koa server: upload, list, download with Range, static serve
public/index.html   # SPA frontend (upload via XHR with progress, drag-and-drop, file list)
Dockerfile          # node:20-alpine, non-root, production deps only
docker-compose.yml  # port 3000, bind mount, restart: unless-stopped
```

### Backend (app.js)

- **Koa 3** with `@koa/router`
- Routes:
  - `POST /upload` — multipart file upload, renames with timestamp
  - `GET /files` — list files with `name`, `url`, `size`, `mtime`, sorted newest first
  - `GET /files/:name` — stream file download with directory traversal protection and HTTP Range (resume)
- Static files served from `public/` via `koa-static`
- Error handling middleware wraps all routes
- Config: env vars (`XIAOBAI_UPLOAD_DIR`, `XIAOBAI_PORT`, `XIAOBAI_HOST`) override `config.json` override defaults
- Exports `{ app }`; listens only when run directly (`require.main === module`)
- Uses `fs.promises` + `readdirSync`/`renameSync` (sync calls for non-blocking-critical paths)

### Frontend (public/index.html)

- Vanilla JS SPA (no framework), XHR upload with progress bar
- Drag-and-drop support
- File list shows name, size, upload time
- Toast notifications for upload success/failure

### Platform Details

- Primary deploy: Docker Desktop on Windows (Linux container). `npm start` also works natively
- No tests, no build step, no TypeScript
- Storage path configurable via `XIAOBAI_UPLOAD_DIR` / `config.json` / default
