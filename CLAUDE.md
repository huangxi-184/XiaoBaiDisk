# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

局域网网盘 (LAN file sharing) — a lightweight Koa.js app that lets devices on the same LAN upload/download files. Single-page frontend served from Koa.

## Commands

```sh
npm install         # Install dependencies
npm start           # Start server (foreground with terminal)
npm run start-hidden  # Start server via VBS (no terminal window, Windows only)
npm run setup-startup # Install VBS launcher to Windows startup folder
```

- Server: http://localhost:3000
- Upload storage: `C:\Users\18421\Documents\xiaobaiDisk`

## Architecture

```
app.js              # Koa server: upload, list, download, static serve, Windows notifications
public/index.html   # SPA frontend (upload via XHR with progress, drag-and-drop, file list)
start.vbs           # VBScript to launch node.exe without a terminal window
setup-startup.js    # Copies start.vbs to Windows Startup folder for autostart
```

### Backend (app.js)

- **Koa 3** with `@koa/router`
- Routes:
  - `POST /upload` — multipart file upload, renames with timestamp, fires Windows notification via `node-notifier`
  - `GET /files` — list files with `name`, `url`, `size`, `mtime`, sorted newest first
  - `GET /files/:name` — stream file download with directory traversal protection
- Static files served from `public/` via `koa-static`
- Error handling middleware wraps all routes
- Uses `fs.promises` + `readdirSync`/`renameSync` (sync calls for non-blocking-critical paths)

### Frontend (public/index.html)

- Vanilla JS SPA (no framework), XHR upload with progress bar
- Drag-and-drop support
- File list shows name, size, upload time
- Toast notifications for upload success/failure

### Platform Details

- **Windows-only** (VBS launcher, `node-notifier` Windows notifications)
- No tests, no build step, no TypeScript
- Storage path is a fixed absolute path configured in `app.js`
