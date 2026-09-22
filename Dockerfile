FROM node:20-alpine

WORKDIR /app

# Install production deps first so the layer caches across source changes
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

# Bind mounts replace /data at runtime; ownership here covers the non-mount case
RUN mkdir -p /data && chown node:node /data

USER node

ENV XIAOBAI_UPLOAD_DIR=/data \
    XIAOBAI_PORT=3000 \
    XIAOBAI_HOST=0.0.0.0

EXPOSE 3000

CMD ["node", "app.js"]
