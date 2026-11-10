# Turtune API (backend Node para Android)

Backend HTTP que **reutiliza al 100%** `electron/core/` (search, resolver, proxy, playlist, settings). Es lo que la app Android consume.

## Arranque local

```bash
cd server
npm install
npm start
# → http://localhost:8787/health
# → http://localhost:8787/search?q=pop%20hits
# → http://localhost:8787/stream/4VR-6AS0-l4
```

Emulador Android → el PC se alcanza en `http://10.0.2.2:8787`.

## Smoke test (sin red)

```bash
npm run test:smoke
```

## Despliegue (VPS / Docker)

```bash
docker build -t turtune-api .
docker run -d --name turtune-api -p 8787:8787 -v turtune-data:/data turtune-api
# Pon un reverse proxy (Caddy/Nginx) para HTTPS delante.
```

## Variables de entorno

| Var | Default | Uso |
|---|---|---|
| `PORT` | 8787 | Puerto |
| `HOST` | 0.0.0.0 | Bind |
| `TURTUNE_DATA_DIR` | `./data` | settings + cookies persistentes |
| `TURTUNE_API_TOKEN` | (vacío) | Si se define, todos los endpoints exigen `Authorization: Bearer <token>` |

**Activa siempre el token** si el backend sale a internet: el token es el único control de acceso.

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | `{ ok, version, node }` |
| GET | `/search?q=…&limit=15` | Búsqueda (ytsearch) |
| GET | `/stream/:id` | Proxy de audio (Range, timeout 8s headers, 403→retry) |
| POST | `/playlist/import` | `{ url }` → `{ title, items }` (públicas y privadas) |
| GET | `/settings/cookie-browser` | Navegador configurado |
| POST | `/settings/cookie-browser` | `{ cookieBrowser: 'edge'|'chrome'|'firefox'|'none' }` |

## Nota honesta sobre Android

- El backend **no** puede usar las cookies del navegador del teléfono (yt-dlp --cookies-from-browser no funciona en Android). Las playlists privadas requieren la **vía OAuth** (Ajustes → API oficial) — por eso la app Android incluirá el flujo «Vincular cuenta» completo.
- Para uso personal, el backend puede correr en el mismo PC que la app de escritorio y el teléfono lo consume por la red local (o por HTTPS con tunnel tipo Cloudflare).
- yt-dlp necesita actualizarse periódicamente (cambios de YouTube); el Dockerfile fija la versión `latest` en cada build.
