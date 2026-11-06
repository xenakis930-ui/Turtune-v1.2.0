# Turtune 🐢 — YouTube audio-only, minimalista en azul turquesa · by Xenakis165

Cliente de escritorio nativo y ligero que **reproduce exclusivamente el flujo de
audio de YouTube** (formatos `m4a`/AAC ~128 kbps u `opus` ~160 kbps). Jamás se
descarga ni decodifica el vídeo: menor consumo de red, RAM y CPU.

- **Desktop:** Electron 33 (main process Node.js, `contextIsolation` + `sandbox`)
- **Frontend:** React 18 + Vite 6 + Tailwind CSS 3 + Lucide Icons
- **Diseño:** tema oscuro minimalista (`#10161C`) con acento turquesa (`#22D3EE`)
- **Extracción:** `yt-dlp` local (`tools/yt-dlp.exe`)
- **Audio:** HTML5 `Audio` + **proxy HTTP local** (`127.0.0.1:puerto_efímero`) con `Range` (seek real)
- **Estado:** zustand (+ `persist`)
- **Tests:** `node --test` (núcleo sin red) · **CI:** GitHub Actions (Windows)

> La reproducción usa el índice público de YouTube vía `yt-dlp`. Uso personal;
> respeta los Términos del Servicio y los derechos de autor.

---

## Estructura del proyecto

```
octave/
├─ tools/yt-dlp.exe            ← binario oficial (búsqueda y streams)
├─ electron/
│  ├─ main.js                  ← ventana, IPC (incl. account:* para OAuth)
│  ├─ preload.js               ← contextBridge → window.turtune (sandbox)
│  ├─ google.js                ← OAuth loopback + tokens (opcional, avanzado)
│  ├─ browserSession.js        ← detección de sesión Edge/Chrome/Firefox (vía sencilla)
│  ├─ youtube.js               ← YouTube Data API v3 (listas, items, duraciones)
│  └─ core/                    ← Node puro, testeable
│     ├─ ytdlp.js              ← spawn seguro + timeout + ruta asar.unpacked
│     ├─ search.js             ← ytsearch → { id, title, artist, thumbnail, duration, channelTitle }
│     ├─ resolver.js           ← yt-dlp -g, TIMEOUT 4000 ms + caché por `expire`
│     ├─ proxy.js              ← proxy local Range; 403 → re-resolver 1 vez
│     ├─ playlist.js           ← importar playlists públicas (--flat-playlist -J)
│     └─ selftest.js           ← npm run selftest
├─ src/
│  ├─ audio/engine.js          ← singleton <audio>; LOADING→PLAYING/ERROR; auto-next
│  ├─ audio/mediaSession.js    ← teclas multimedia + metadatos (Media Session API)
│  ├─ store/usePlayerStore.js  ← current/queue/playbackState + persistencia de cola
│  ├─ components/              ← TopBar, Sidebar, HomeView, SearchView, LibraryView,
│  │                             PlayerBar, QueuePanel, ImportPlaylistModal, ShortcutsOverlay…
│  ├─ hooks/useKeyboardShortcuts.js
│  └─ demo/                    ← modo demo sin Electron (preview en navegador)
├─ test/core.test.js           ← 8 tests de humo (sin red)
├─ test/youtube.test.js        ← 5 tests de la Data API (parser + normalizadores)
├─ .github/workflows/ci.yml    ← install → test → build (windows-latest)
├─ build/icon.ico|png          ← icono generado (círculo turquesa + waveform)
└─ package.json                ← scripts: dev / build / test / dist (NSIS)
```

## Requisitos

- Windows 10/11 x64
- Node.js ≥ 20 LTS (instalado vía `winget install OpenJS.NodeJS.LTS`)

## Puesta en marcha

```powershell
cd "C:\Users\USER\Documents\Proyecto predeterminado\octave"

# 1) Instalar dependencias
npm.cmd install
# Si los scripts de install de Electron quedan bloqueados por allowScripts:
cd node_modules\electron; node install.js; cd ..\..

# 2) Desarrollo (Vite :5173 + Electron con HMR)
npm.cmd run dev

# 3) Build de producción + arranque
npm.cmd run build
npm.cmd start
```

## Actualizaciones automáticas (electron-updater + GitHub Releases)

Al arrancar, Turtune comprueba si hay una versión nueva publicada en **GitHub Releases** (`appId: app.turtune.desktop`):

1. **En segundo plano** descarga el nuevo `Turtune-Setup-x.y.z.exe`.
2. Muestra un toast / el panel **Ajustes → Actualizaciones** te avisa.
3. Al cerrar la app (o pulsar «Reiniciar e instalar») se instala sola.
4. También puedes comprobarlo manualmente en **Ajustes → Actualizaciones → Buscar ahora**.

**Para publicar un release:**
1. Crea un repo público `turtune` en GitHub (o ajusta `build.publish` en `package.json` a tu fork).
2. Haz push del código y crea un tag: `git tag v1.2.0 && git push origin v1.2.0`.
3. El workflow **Release** (`.github/workflows/release.yml`) compila en `windows-latest`, corre tests y publica instalador + `latest.yml` en la página de Releases (`GH_TOKEN` lo inyecta Actions).
4. Los usuarios en x.y.z verán el aviso automáticamente.

> Si hoy prefieres no usar GitHub todavía, la app funciona igual sin releases publicados: el botón «Buscar ahora» mostrará «sin canal de actualización» (no rompe nada).

## Instalador .exe (NSIS)

```powershell
npm.cmd run dist
# → release\Turtune-Setup-1.2.0.exe   (instalación por usuario, con atajo y
#   desinstalador; sin firma de código → Windows SmartScreen mostrará aviso)
```

`npm run pack` genera la carpeta desembalada en `release/` para pruebas sin instalar.
El `.asar` incluye `dist/` y `electron/`; `tools/yt-dlp.exe` viaja **fuera del asar**
(`asarUnpack`) porque un proceso hijo no puede ejecutarse desde dentro.

## Ver tus playlists — la vía sencilla (sesión del navegador)

**Sin proyectos de Google Cloud ni claves.** Un clic y listo:

1. **Ajustes → Sesión del navegador → «Detectar sesión»** (Turtune prueba Edge → Chrome → Firefox, ~10 s).
2. Turtune lee las **cookies que tu navegador ya tiene de YouTube** para reproducir e importar **tus playlists privadas**. Tu contraseña jamás se ve ni se transmite.
3. **Tu biblioteca → «Mis playlists» → «Importar URL»** → pega cualquier lista tuya (privada incluida) → se reproduce, se añade a la cola o a Me gusta, y **queda guardada** en la colección local (✕ la quita; YouTube no se toca).
4. ¿Tienes la API vinculada? Pulsa **«Sincronizar»** en Mis playlists y se importan **los nombres de todas tus listas** del canal de golpe.

> Requiere YouTube abierto con sesión iniciada en Edge, Chrome o Firefox. En Linux/otros navegadores, usa la opción avanzada.

## Vincular tu cuenta vía API oficial (avanzado · opcional)

Solo si prefieres no usar las cookies del navegador. Requiere configuración única (~5 min, gratis):

1. [Google Cloud Console](https://console.cloud.google.com) → **Crear proyecto** · 2. Habilita **«YouTube Data API v3»** ([enlace directo](https://console.cloud.google.com/apis/library/youtube.googleapis.com)) · 3. **Pantalla de consentimiento** → Externo → modo **«Prueba»** → añade **tu Gmail** como usuario de prueba · 4. **Credenciales → «ID de cliente de OAuth» → «Aplicación de escritorio»**.
5. **Ajustes → Avanzado → pega Client ID + Secret → Guardar y vincular** → autoriza en el navegador → vuelve a Turtune.
6. En **Tu biblioteca** pulsa **Sincronizar** (importa los nombres de todas tus playlists) y gestiona como arriba.

- *Modo Prueba* caduca el permiso **cada 7 días** (pulsa «Conectar» otra vez, 10 s); o publica el proyecto para uso permanente (aviso de app no verificada que puedes aceptar como propietario).
- Scope: `youtube.readonly` — Turtune **no** puede subir, borrar ni modificar nada tuyo.
- «Desvincular» borra el token al instante (`userData/google-oauth.json`, permisos 0600).
- Nada sale de tu equipo: sesión de navegador o token OAuth — ambos locales; Turtune solo **lee**.

## Verificación del motor

```powershell
npm.cmd run selftest -- "nuvole bianche"   # búsqueda + resolución (≈3 s)
npm.cmd test                                # 8 tests del núcleo (sin red)
```

## Atajos de teclado

| Atajo | Acción |
| --- | --- |
| `Espacio` / `K` | Play · Pausa |
| `N` / `P` | Siguiente / Anterior (reinicia si lleva >4 s) |
| `←` / `→` | Seek ±5 s · `↑`/`↓` volumen ±5 % |
| `M` silenciar · `Q` cola · `L` me gusta · `/` buscador · `?` overlay de ayuda · `Esc` cerrar |
| Media Session API | Teclas multimedia / centro de acciones de Windows |

## Funcionalidades

- **Búsqueda** con debounce 400 ms sobre `ytsearch`; rejilla o lista; "Mejor resultado".
- **Audio-only estricto**: `bestaudio[ext=m4a]/bestaudio[acodec=opus]/bestaudio`
  (AAC 128 / opus 160 kbps). Jamás vídeo. CSP bloquea iframes de YouTube.
- **Seek real** por proxy con `Range` (no descarga el archivo completo).
- **Cola persistente**: al cerrar y reabrir, la cola e índice se restauran en IDLE.
- **Cuenta de YouTube** (Ajustes → OAuth `youtube.readonly`): ver **tus** playlists en *Tu biblioteca* → **reproducir** desde la tarjeta · **+ cola** · **♥ Me gusta** (la playlist completa).
- **Importar playlist de YouTube** (modal en la barra lateral): URL →
  previsualización → *Reproducir ahora* · *Añadir a la cola* · *Guardar en Me gusta*.
- **Prefetch** del siguiente stream al empezar la pista actual.
- **Cola** lateral: eliminar ítems futuros, vaciar, click para saltar (cuenta en el badge).
- **Me gusta** e **historial** persistentes (localStorage).

## Solución de problemas

| Síntoma | Causa y arreglo |
| --- | --- |
| 403 / stream caducado | El proxy re-resuelve solo (1 reintento). Si persiste, actualiza `tools/yt-dlp.exe` desde <https://github.com/yt-dlp/yt-dlp/releases> o define `OCTAVE_YTDLP`. |
| "superó el timeout de 4000 ms" | Red/VPN/firewall. Reintenta o ajusta `RESOLVE_TIMEOUT_MS` en `resolver.js`. |
| La playlist no importa | Debe ser **pública** y la URL debe contener `list=`. Privadas/mixes de artista: no soportadas por yt-dlp en flat mode. |
| Sin audio pero hay portadas | Reinicia la app (el puerto del proxy cambia en cada arranque). DevTools en dev: `Ctrl+Shift+I`. |
| SmartScreen bloquea el instalador | Binario sin firma; "Más información → Ejecutar de todas formas" o firma con certificado real. |
| `npm` no reconocido | Usa `npm.cmd` (política de ejecución de PowerShell). |

## Límites conocidos / honestidad técnica

- Electron pesa ~90–130 MB RAM (no <60 MB: eso es Tauri+Rust, descartado aquí).
- Las URLs de Google caducan (≈6 h); la caché las renueva sola.
- Algunos vídeos sin stream m4a caen a opus (nunca a vídeo).
- La cola persistida se recorta a 100 pistas (límite de almacenamiento).
- Sin sincronización de cuentas: "Me gusta" es local, no se sube a YouTube Music.
