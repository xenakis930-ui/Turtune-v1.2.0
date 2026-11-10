# Turtune API — backend Node para la app Android
FROM node:20-alpine

# yt-dlp (binario Linux estático) + ffmpeg (opcional, para convertir opus→m4a si se quiere)
RUN apk add --no-cache python3 py3-pip ffmpeg curl ca-certificates \
  && curl -L -o /usr/local/bin/yt-dlp https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
  && chmod +x /usr/local/bin/yt-dlp

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

ENV PORT=8787 HOST=0.0.0.0 TURTUNE_DATA_DIR=/data
VOLUME ["/data"]
EXPOSE 8787

# No correr como root
USER node
CMD ["node", "src/index.js"]
