import { useEffect, useState } from 'react'
import {
  Settings, Youtube, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff, Trash2,
  ExternalLink, ShieldCheck, Plug, Unplug, Library, ChevronDown, Globe,
  RefreshCw, Rocket,
} from 'lucide-react'
import { account, isDesktop, updater, getAppVersion, getBackendUrl, setBackendUrl, hasBackend, backendFetch } from '../lib/api'
import { usePlayerStore } from '../store/usePlayerStore'

const LINKS = {
  console: 'https://console.cloud.google.com',
  library: 'https://console.cloud.google.com/apis/library/youtube.googleapis.com',
  consent: 'https://console.cloud.google.com/apis/credentials/consent',
  credentials: 'https://console.cloud.google.com/apis/credentials',
}

const BROWSER_NAMES = { edge: 'Microsoft Edge', chrome: 'Google Chrome', firefox: 'Firefox' }

/** Ajustes → Cuenta de YouTube (sesión del navegador · OAuth avanzado). */
export default function SettingsView() {
  const pushToast = usePlayerStore((s) => s.pushToast)
  const setView = usePlayerStore((s) => s.setView)

  const [status, setStatus] = useState(null) // { configured, connected, clientId, cookieBrowser }
  const [channel, setChannel] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [busy, setBusy] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [error, setError] = useState('')
  const [sessionError, setSessionError] = useState('')
  const [appVersion, setAppVersion] = useState('')
  const [update, setUpdate] = useState({ phase: 'idle' }) // idle | checking | available | downloaded | current | error
  const [backendUrlInput, setBackendUrlInput] = useState(getBackendUrl())
  const [backendStatus, setBackendStatus] = useState(null) // null | 'testing' | 'ok' | 'error'
  const [backendMessage, setBackendMessage] = useState('')

  const refresh = async () => {
    const st = await account.status()
    setStatus(st)
    usePlayerStore.getState().setCookieBrowser(st?.cookieBrowser ?? 'none')
    if (st?.connected) {
      const res = await account.playlists().catch(() => null)
      setChannel(res?.channel ?? null)
    } else {
      setChannel(null)
    }
    return st
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Versión instalada + suscripción a eventos de actualización
  useEffect(() => {
    getAppVersion().then(setAppVersion).catch(() => {})
    const detach = updater.onStatus(({ type, payload }) => {
      if (type === 'available') setUpdate({ phase: 'available', version: payload })
      else if (type === 'downloaded') setUpdate({ phase: 'downloaded', version: payload })
      else if (type === 'not-available') setUpdate({ phase: 'current' })
      else if (type === 'error') setUpdate({ phase: 'error', message: payload })
    })
    return detach
  }, [])

  const onCheckUpdate = async () => {
    if (!updater.available) return
    setUpdate({ phase: 'checking' })
    const res = await updater.check()
    if (!res?.ok) setUpdate({ phase: 'error', message: res?.error ?? 'Sin canal de actualización configurado' })
    else if (res.version) setUpdate({ phase: 'available', version: res.version })
    else setUpdate({ phase: 'current' })
  }

  const onInstallNow = () => updater.quitAndInstall()

  /* ---------- Sesión del navegador ---------- */

  const onDetect = async () => {
    setDetecting(true)
    setSessionError('')
    const res = await account.detectBrowser()
    setDetecting(false)
    if (!res?.ok) {
      setSessionError(res?.error ?? 'No se detectó sesión.')
      return
    }
    await refresh()
    pushToast('info', `Sesión detectada en ${BROWSER_NAMES[res.browser] ?? res.browser}.`)
  }

  const onDisableBrowser = async () => {
    await account.setCookieBrowser('none')
    await refresh()
    pushToast('info', 'Sesión del navegador desactivada.')
  }

  /* ---------- OAuth (avanzado) ---------- */

  const onSave = async () => {
    setBusy(true)
    setError('')
    const res = await account.saveConfig({ clientId, clientSecret })
    if (!res?.ok) {
      setError(res?.error ?? 'No se pudieron guardar las credenciales.')
      setBusy(false)
      return
    }
    const conn = await account.connect()
    setBusy(false)
    if (!conn?.ok) {
      setError(conn?.error ?? 'No se pudo completar la vinculación.')
      await refresh()
      return
    }
    setClientSecret('')
    setEditMode(false)
    await refresh()
    pushToast('info', 'Cuenta de YouTube vinculada (solo lectura).')
  }

  const onConnect = async () => {
    setBusy(true)
    setError('')
    const conn = await account.connect()
    setBusy(false)
    if (!conn?.ok) {
      setError(conn?.error ?? 'No se pudo completar la vinculación.')
      return
    }
    await refresh()
    pushToast('info', 'Cuenta vinculada (solo lectura).')
  }

  const onDisconnect = async () => {
    const res = await account.disconnect()
    if (res?.ok) {
      setChannel(null)
      await refresh()
      pushToast('info', 'Cuenta desvinculada. El token se ha eliminado.')
    }
  }

  const onDeleteConfig = async () => {
    await account.deleteConfig()
    setEditMode(false)
    setChannel(null)
    await refresh()
    pushToast('info', 'Credenciales eliminadas de este equipo.')
  }

  const configured = !!status?.configured
  const connected = !!status?.connected
  const cookieBrowser = status?.cookieBrowser ?? 'none'
  const showForm = !configured || editMode

  return (
    <div className="scroll-area h-full overflow-y-auto px-6 pb-10 pt-5">
      {/* Cabecera */}
      <header className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#15d3a2]/12">
          <Settings size={21} className="text-[#15d3a2]" aria-hidden />
        </span>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">Ajustes</h1>
          <p className="text-[12px] text-[#8ca0af]">Cuenta y preferencias de Turtune</p>
        </div>
      </header>

      {/* ---------- Vía recomendada: sesión del navegador ---------- */}
      <section
        aria-label="Sesión del navegador"
        className="mt-6 overflow-hidden rounded-2xl border border-[#15d3a2]/20 bg-[#141f22] shadow-[0_0_0_1px_rgba(21,211,162,0.08)]"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#15d3a2]/12">
              <Globe size={21} className="text-[#15d3a2]" aria-hidden />
            </span>
            <div>
              <h2 className="text-[17px] font-extrabold tracking-tight text-white">
                Sesión del navegador
                <span className="ml-2 rounded-full bg-[#15d3a2]/15 px-2 py-0.5 align-middle text-[9.5px] font-black uppercase tracking-wider text-[#15d3a2]">
                  Recomendado
                </span>
              </h2>
              <p className="text-[11.5px] text-[#8ca0af]">Un clic · sin proyectos ni claves de Google</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          {status === null ? (
            <div aria-busy="true" className="flex items-center gap-3 text-sm text-[#8ca0af]">
              <Loader2 size={17} className="animate-spin text-[#15d3a2]" /> Cargando estado…
            </div>
          ) : !isDesktop ? (
            <Notice>
              La detección de sesión solo está disponible en la <strong>app de escritorio</strong>{' '}
              (Turtune.exe / <code>npm start</code>).
            </Notice>
          ) : cookieBrowser !== 'none' ? (
            <div>
              <p className="flex flex-wrap items-center gap-2 text-[15px] font-extrabold text-white">
                <CheckCircle2 size={18} className="text-[#15d3a2]" aria-hidden />
                Sesión activa en {BROWSER_NAMES[cookieBrowser] ?? cookieBrowser}
              </p>
              <p className="mt-2 max-w-lg text-[12px] leading-relaxed text-[#8ca0af]">
                Turtune ya puede <strong className="text-[#b9d8de]">reproducir e importar tus playlists
                privadas</strong> usando tu sesión iniciada. Importa una URL y se guardará para siempre
                en <strong className="text-[#b9d8de]">Tu biblioteca → Mis playlists</strong>.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setView('library')}
                  className="flex h-11 items-center gap-2 rounded-full bg-[#15d3a2] px-5 text-[12px] font-extrabold uppercase tracking-wider text-[#06262b] transition hover:bg-[#4fe3b7]"
                >
                  <Library size={15} strokeWidth={2.5} /> Ir a Mis playlists
                </button>
                <button
                  type="button"
                  onClick={onDisableBrowser}
                  className="text-[12px] font-bold text-[#8ca0af] transition hover:text-white"
                >
                  Desactivar sesión
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="max-w-lg text-[12.5px] leading-relaxed text-[#b9d8de]">
                Turtune usa las cookies que tu navegador ya tiene de YouTube para ver y reproducir
                <strong> tus playlists privadas</strong>. <strong>No vemos tu contraseña</strong>: yt-dlp
                lee la sesión cifrada localmente.
              </p>
              <ul className="mt-3 list-none space-y-1.5 text-[11.5px] text-[#8ca0af]">
                <li>✓ Edge, Chrome o Firefox con YouTube abierto y sesión iniciada</li>
                <li>✓ Importa una playlist privada por URL: se guarda en <em>Mis playlists</em></li>
                <li>✓ También para reproducir vídeos que no son públicos</li>
              </ul>

              {sessionError && (
                <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg bg-[#2a1215] px-3 py-2 text-[12px] leading-snug text-[#fecaca]">
                  <AlertCircle size={15} className="mt-0.5 shrink-0 text-[#f87171]" /> {sessionError}
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onDetect}
                  disabled={detecting}
                  className="flex h-12 items-center gap-2 rounded-full bg-[#15d3a2] px-6 text-[12.5px] font-extrabold uppercase tracking-wider text-[#06262b] transition hover:bg-[#4fe3b7] disabled:cursor-wait disabled:opacity-70"
                >
                  {detecting ? <Loader2 size={17} className="animate-spin" /> : <Plug size={17} strokeWidth={2.5} />}
                  {detecting ? 'Detectando…' : 'Detectar sesión del navegador'}
                </button>
                <p className="text-[10.5px] text-[#72868f]">
                  Prueba Edge → Chrome → Firefox (10 s)
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ---------- Backend (Android / red local) ---------- */}
      <section
        aria-label="Backend"
        className="mt-4 overflow-hidden rounded-2xl border border-white/[0.06] bg-[#141f22]"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#15d3a2]/12">
              <Globe size={18} className="text-[#15d3a2]" aria-hidden />
            </span>
            <div>
              <h2 className="text-[15px] font-extrabold tracking-tight text-white">Backend (Android / red local)</h2>
              <p className="text-[11px] text-[#8ca0ab]">URL del servidor Turtune API (búsqueda y audio)</p>
            </div>
          </div>
          {hasBackend() && (
            <span className="flex items-center gap-1.5 rounded-full bg-[#15d3a2]/10 px-3 py-1 text-[10.5px] font-bold uppercase tracking-wider text-[#15d3a2]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#15d3a2]" aria-hidden /> Activo
            </span>
          )}
        </div>

        <div className="px-6 py-5">
          <label htmlFor="backend-url" className="text-[12px] font-bold uppercase tracking-wider text-[#8ca0ab]">
            URL del backend
          </label>
          <input
            id="backend-url"
            type="url"
            value={backendUrlInput}
            onChange={(e) => setBackendUrlInput(e.target.value)}
            placeholder="http://10.0.2.2:8787 (emulador) o https://tu-vps.example.com"
            spellCheck={false}
            autoComplete="off"
            className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#101a1b] px-4 text-[12.5px] text-white placeholder-[#4a5a68] outline-none transition focus:border-[#15d3a2]/50"
          />
          <p className="mt-2 text-[10.5px] leading-snug text-[#66798a]">
            Emulador Android → <code>http://10.0.2.2:8787</code> (tu PC). Teléfono físico → la IP de tu PC en la red local
            o un VPS con HTTPS. En la app de escritorio esta URL se ignora (usa IPC).
          </p>

          {backendStatus && backendStatus !== 'testing' && (
            <p
              role={backendStatus === 'error' ? 'alert' : 'status'}
              className={`mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-[12px] leading-snug ${
                backendStatus === 'ok'
                  ? 'bg-[#15d3a2]/[0.08] text-[#b9d8de]'
                  : 'bg-[#2a1215] text-[#fecaca]'
              }`}
            >
              {backendStatus === 'ok' ? (
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[#15d3a2]" aria-hidden />
              ) : (
                <AlertCircle size={15} className="mt-0.5 shrink-0 text-[#f87171]" aria-hidden />
              )}
              {backendMessage}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={backendStatus === 'testing'}
              onClick={async () => {
                setBackendStatus('testing')
                setBackendMessage('')
                const url = setBackendUrl(backendUrlInput)
                if (!url) {
                  setBackendStatus('error')
                  setBackendMessage('Ingresa una URL válida.')
                  return
                }
                try {
                  const res = await backendFetch('/health')
                  setBackendStatus('ok')
                  setBackendMessage(`Conectado · v${res?.version ?? '?'} · Node ${res?.node ?? '?'}`)
                } catch (err) {
                  setBackendStatus('error')
                  setBackendMessage(`No se pudo conectar: ${String(err?.message ?? err)}`)
                }
              }}
              className="flex h-11 items-center gap-2 rounded-full bg-[#15d3a2] px-5 text-[12px] font-extrabold uppercase tracking-wider text-[#062a1d] transition hover:bg-[#4fe3b7] disabled:cursor-wait disabled:opacity-70"
            >
              {backendStatus === 'testing' ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Probando…
                </>
              ) : (
                <>
                  <Plug size={15} strokeWidth={2.5} /> Probar y guardar
                </>
              )}
            </button>
            {hasBackend() && (
              <button
                type="button"
                onClick={() => { setBackendUrl(''); setBackendUrlInput(''); setBackendStatus(null); setBackendMessage('') }}
                className="text-[12px] font-bold text-[#8ca0ab] transition hover:text-white"
              >
                Desactivar backend
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ---------- Avanzado: API oficial (opcional) ---------- */}
      <details className="group mt-4 overflow-hidden rounded-2xl border border-white/[0.06] bg-[#141f22]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-6 py-4 text-[13px] font-bold text-[#8ca0af] transition hover:text-white">
          <span className="flex items-center gap-2">
            <Youtube size={16} className="text-[#ff5f5f]" aria-hidden />
            Avanzado · vincular la API oficial de YouTube (Google Cloud)
          </span>
          <ChevronDown size={17} className="shrink-0 transition-transform group-open:rotate-180" aria-hidden />
        </summary>

        <div className="border-t border-white/5 px-6 py-5">
          {!isDesktop ? (
            <Notice>Solo disponible en la app de escritorio.</Notice>
          ) : connected ? (
            <ConnectedPanel
              channel={channel}
              onDisconnect={onDisconnect}
              onViewLibrary={() => setView('library')}
            />
          ) : showForm ? (
            <ConfigForm
              clientId={clientId}
              clientSecret={clientSecret}
              showSecret={showSecret}
              setClientId={setClientId}
              setClientSecret={setClientSecret}
              toggleSecret={() => setShowSecret((v) => !v)}
              busy={busy}
              error={error}
              onSave={onSave}
              onCancel={configured ? () => { setEditMode(false); setError('') } : null}
            />
          ) : (
            <ReadyToConnect
              clientId={status.clientId}
              busy={busy}
              error={error}
              onConnect={onConnect}
              onEdit={() => setEditMode(true)}
              onDelete={onDeleteConfig}
            />
          )}
        </div>
      </details>

      {/* ---------- Actualizaciones automáticas ---------- */}
      <section
        aria-label="Actualizaciones"
        className="mt-4 overflow-hidden rounded-2xl border border-white/[0.06] bg-[#141f22]"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#15d3a2]/12">
              <Rocket size={18} className="text-[#15d3a2]" aria-hidden />
            </span>
            <div>
              <h2 className="text-[15px] font-extrabold tracking-tight text-white">Actualizaciones</h2>
              <p className="text-[11px] text-[#8ca0ab]">Canal: GitHub Releases · descarga en segundo plano</p>
            </div>
          </div>
          {appVersion && (
            <span className="rounded-full bg-white/[0.06] px-3 py-1 text-[11px] font-bold tabular-nums text-[#b9d8de]">
              v{appVersion}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <UpdateStatus update={update} />
          {update.phase === 'downloaded' ? (
            <button
              type="button"
              onClick={onInstallNow}
              className="flex h-11 items-center gap-2 rounded-full bg-[#15d3a2] px-5 text-[12px] font-extrabold uppercase tracking-wider text-[#062a1d] transition hover:bg-[#4fe3b7]"
            >
              <Rocket size={15} strokeWidth={2.5} /> Reiniciar e instalar
            </button>
          ) : (
            <button
              type="button"
              onClick={onCheckUpdate}
              disabled={!updater.available || update.phase === 'checking'}
              className="flex h-11 items-center gap-2 rounded-full border border-white/12 px-5 text-[12px] font-bold text-[#b9d8de] transition hover:border-[#15d3a2]/50 hover:text-[#15d3a2] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {update.phase === 'checking' ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Buscando…
                </>
              ) : (
                <>
                  <RefreshCw size={15} /> Buscar ahora
                </>
              )}
            </button>
          )}
        </div>
      </section>

      {/* Nota de seguridad */}
      <footer className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-[#72868f]">
        <ShieldCheck size={14} className="mt-0.5 shrink-0 text-[#15d3a2]" aria-hidden />
        Nada sale de tu equipo. La sesión del navegador se lee localmente; el token OAuth (si lo usas)
        vive en <code>userData/google-oauth.json</code> con permisos 0600. En ambos casos Turtune
        <strong> solo lee</strong>: nunca sube, modifica ni borra nada tuyo.
      </footer>

      {/* Firma del autor */}
      <p className="mt-6 select-none border-t border-white/5 pt-4 text-center text-[9px] font-bold uppercase tracking-[0.42em] text-[#54646a]">
        Turtune · by <span className="text-[#15d3a2]/60">Xenakis165</span>
      </p>
    </div>
  )
}

/* ---------- Subcomponentes ---------- */

function Notice({ children }) {
  return (
    <p className="rounded-xl border border-[#15d3a2]/15 bg-[#15d3a2]/[0.06] px-4 py-3 text-[13px] leading-relaxed text-[#b9d8de]">
      {children}
    </p>
  )
}

function SectionTitle({ children }) {
  return (
    <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#15d3a2]">{children}</h3>
  )
}

const STEPS = [
  {
    title: 'Crea un proyecto en Google Cloud',
    body: 'gratis · cualquier nombre, p. ej. «Turtune»',
    href: LINKS.console,
    linkLabel: 'console.cloud.google.com',
  },
  {
    title: 'Habilita «YouTube Data API v3»',
    body: 'APIs y servicios → Biblioteca → busca YouTube Data API v3 → Habilitar',
    href: LINKS.library,
    linkLabel: 'biblioteca de APIs',
  },
  {
    title: 'Configura la pantalla de consentimiento',
    body: 'Tipo «Externo» · nombre «Turtune» · modo «Prueba» · añade TU Gmail como «Usuario de prueba»',
    href: LINKS.consent,
    linkLabel: 'pantalla de consentimiento',
  },
  {
    title: 'Crea la credencial OAuth',
    body: 'Credenciales → «Crear credenciales» → «ID de cliente de OAuth» → Tipo de aplicación: «Aplicación de escritorio»',
    href: LINKS.credentials,
    linkLabel: 'crear credencial',
  },
  {
    title: 'Pega Client ID y Client Secret abajo',
    body: 'Solo se guardan en tu equipo; el flujo se abre en tu navegador',
    href: null,
  },
]

function ConfigForm({
  clientId, clientSecret, showSecret, setClientId, setClientSecret,
  toggleSecret, busy, error, onSave, onCancel,
}) {
  return (
    <div>
      <SectionTitle>Cómo conseguir las credenciales (5 min, una vez)</SectionTitle>

      <details className="group mt-2 rounded-xl border border-white/[0.06] bg-[#101a1b]" open>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[13px] font-bold text-white/90 transition hover:text-white">
          Ver pasos en Google Cloud
          <ChevronDown size={16} className="shrink-0 transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <ol className="space-y-3 border-t border-white/5 px-4 py-4">
          {STEPS.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#15d3a2]/12 text-[11px] font-black text-[#15d3a2]">
                {i + 1}
              </span>
              <span className="text-[12.5px] leading-snug text-[#b9d8de]">
                <span className="font-semibold text-white/95">{s.title}</span>
                <br />
                {s.body}
                {s.href && (
                  <>
                    {' '}
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-[#15d3a2] transition hover:text-[#4fe3b7]"
                    >
                      {s.linkLabel} <ExternalLink size={11} aria-hidden />
                    </a>
                  </>
                )}
              </span>
            </li>
          ))}
        </ol>
      </details>

      {/* Formulario */}
      <div className="mt-4 grid gap-3">
        <label className="text-[12px] font-bold uppercase tracking-wider text-[#8ca0af]" htmlFor="client-id">
          Client ID
        </label>
        <input
          id="client-id"
          type="text"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          placeholder="1234567890-abc…apps.googleusercontent.com"
          spellCheck={false}
          autoComplete="off"
          className="h-11 rounded-xl border border-white/10 bg-[#101a1b] px-4 font-mono text-[12px] text-white placeholder-[#4a5a68] outline-none transition focus:border-[#15d3a2]/50"
        />

        <label className="text-[12px] font-bold uppercase tracking-wider text-[#8ca0af]" htmlFor="client-secret">
          Client Secret
        </label>
        <div className="relative">
          <input
            id="client-secret"
            type={showSecret ? 'text' : 'password'}
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            placeholder="GOCSPX-…"
            spellCheck={false}
            autoComplete="off"
            className="h-11 w-full rounded-xl border border-white/10 bg-[#101a1b] px-4 pr-12 font-mono text-[12px] text-white placeholder-[#4a5a68] outline-none transition focus:border-[#15d3a2]/50"
          />
          <button
            type="button"
            onClick={toggleSecret}
            aria-label={showSecret ? 'Ocultar secreto' : 'Mostrar secreto'}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[#8ca0af] transition hover:text-white"
          >
            {showSecret ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg bg-[#2a1215] px-3 py-2 text-[12px] leading-snug text-[#fecaca]">
          <AlertCircle size={15} className="mt-0.5 shrink-0 text-[#f87171]" /> {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={busy}
          className="flex h-12 items-center gap-2 rounded-full bg-[#15d3a2] px-6 text-[12.5px] font-extrabold uppercase tracking-wider text-[#06262b] transition hover:bg-[#4fe3b7] disabled:cursor-wait disabled:opacity-70"
        >
          {busy ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Vinculando…
            </>
          ) : (
            <>
              <Plug size={16} strokeWidth={2.5} /> Guardar y vincular
            </>
          )}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-[12.5px] font-bold text-[#8ca0af] transition hover:text-white"
          >
            Cancelar
          </button>
        )}
        <p className="w-full text-[10.5px] text-[#72868f]">
          Al pulsar «Guardar y vincular» se abrirá tu navegador para autorizar el acceso de solo lectura.
        </p>
      </div>

      <p className="mt-3 rounded-lg bg-white/[0.03] px-3 py-2 text-[10.5px] leading-snug text-[#72868f]">
        <strong className="text-[#8ca0af]">Modo Prueba:</strong> Google caduca el permiso cada 7 días en apps
        sin publicar — basta pulsar «Conectar» de nuevo (10 segundos). Para uso permanente, publica el
        proyecto («In production»); verás el aviso de app no verificada que puedes aceptar como propietario.
      </p>
    </div>
  )
}

function ReadyToConnect({ clientId, busy, error, onConnect, onEdit, onDelete }) {
  return (
    <div>
      <SectionTitle>Credenciales guardadas</SectionTitle>
      <p className="mt-2 truncate rounded-lg bg-[#101a1b] px-3 py-2 font-mono text-[11.5px] text-[#b9d8de]" title={clientId}>
        {clientId}
      </p>

      {error && (
        <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg bg-[#2a1215] px-3 py-2 text-[12px] leading-snug text-[#fecaca]">
          <AlertCircle size={15} className="mt-0.5 shrink-0 text-[#f87171]" /> {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onConnect}
          disabled={busy}
          className="flex h-12 items-center gap-2 rounded-full bg-[#15d3a2] px-6 text-[12.5px] font-extrabold uppercase tracking-wider text-[#06262b] transition hover:bg-[#4fe3b7] disabled:cursor-wait disabled:opacity-70"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Plug size={16} strokeWidth={2.5} />}
          {busy ? 'Abriendo navegador…' : 'Conectar con Google'}
        </button>
        <button type="button" onClick={onEdit} className="text-[12.5px] font-bold text-[#8ca0af] transition hover:text-white">
          Editar credenciales
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="flex items-center gap-1.5 text-[12.5px] font-bold text-[#f87171]/80 transition hover:text-[#f87171]"
        >
          <Trash2 size={13} /> Eliminar credenciales
        </button>
      </div>
      <p className="mt-3 text-[10.5px] text-[#72868f]">
        Se abrirá el navegador con la pantalla de consentimiento de Google. Autoriza el acceso y vuelve a Turtune.
      </p>
    </div>
  )
}

function ConnectedPanel({ channel, onDisconnect, onViewLibrary }) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-4">
        {channel?.thumbnail ? (
          <img
            src={channel.thumbnail}
            alt={`Avatar de ${channel.title}`}
            className="h-16 w-16 rounded-full border border-[#15d3a2]/30"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="grid h-16 w-16 place-items-center rounded-full border border-[#15d3a2]/30 bg-[#15d3a2]/10">
            <Youtube size={26} className="text-[#15d3a2]" aria-hidden />
          </span>
        )}
        <div>
          <p className="flex items-center gap-2 text-[15px] font-extrabold text-white">
            {channel?.title ?? 'Cuenta vinculada'}
            <CheckCircle2 size={17} className="text-[#15d3a2]" aria-hidden />
          </p>
          <p className="mt-0.5 text-[11.5px] text-[#8ca0af]">Scope: youtube.readonly · datos en tu equipo</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onViewLibrary}
          className="flex h-12 items-center gap-2 rounded-full bg-[#15d3a2] px-6 text-[12.5px] font-extrabold uppercase tracking-wider text-[#06262b] transition hover:bg-[#4fe3b7]"
        >
          <Library size={16} strokeWidth={2.5} /> Ver mis playlists
        </button>
        <button
          type="button"
          onClick={onDisconnect}
          className="flex h-12 items-center gap-2 rounded-full border border-white/15 px-5 text-[12px] font-bold text-[#b9d8de] transition hover:border-[#f87171]/50 hover:text-[#f87171]"
        >
          <Unplug size={15} /> Desvincular
        </button>
      </div>
    </div>
  )
}

function UpdateStatus({ update }) {
  const base = 'flex items-center gap-2 text-[12.5px] leading-snug'
  switch (update.phase) {
    case 'checking':
      return <p className={`${base} text-[#8ca0ab]`}><Loader2 size={15} className="animate-spin text-[#15d3a2]" aria-hidden /> Buscando actualizaciones en GitHub…</p>
    case 'available':
      return <p className={`${base} text-[#15d3a2] font-semibold`}><CheckCircle2 size={15} aria-hidden /> Versión {update.version} disponible — descargando en segundo plano…</p>
    case 'downloaded':
      return <p className={`${base} text-[#15d3a2] font-semibold`}><CheckCircle2 size={15} aria-hidden /> Versión {update.version} descargada y lista.</p>
    case 'current':
      return <p className={`${base} text-[#b9d8de]`}><CheckCircle2 size={15} className="text-[#15d3a2]" aria-hidden /> Estás en la última versión publicada.</p>
    case 'error':
      return (
        <p role="alert" className="flex max-w-md items-start gap-2 text-[12px] leading-snug text-[#fecaca]">
          <AlertCircle size={15} className="mt-0.5 shrink-0 text-[#f87171]" aria-hidden />
          {update.message || 'No se pudo consultar el canal de actualización.'}
        </p>
      )
    default:
      return <p className={`${base} text-[#8ca0ab]`}>Comprobación automática al arrancar. El paquete nuevo se instala al cerrar — o al pulsar «Reiniciar».</p>
  }
}
