'use strict'

/**
 * google.js — OAuth 2.0 para "Aplicación de escritorio" (loopback) y gestión
 * de tokens contra Google (YouTube Data API, scope readonly).
 *
 * Cómo funciona:
 *  1. El usuario crea un cliente OAuth "Aplicación de escritorio" en Google Cloud
 *     y guarda Client ID + Secret vía `saveConfig`.
 *  2. `connect` abre el navegador con la URL de consentimiento; Google redirige a
 *     http://127.0.0.1:<puerto>/oauth2callback con el código.
 *  3. Se intercambia el código por tokens (access + refresh). El refresh token
 *     se guarda en <userData>/google-oauth.json (modo 0600).
 *  4. `getAccessToken` devuelve el access token vigente (auto-refresco).
 *
 * Nada sale de la máquina: Turtune ↔ Google directamente.
 */

const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { app, shell } = require('electron')

const SCOPE = 'https://www.googleapis.com/auth/youtube.readonly'
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const FLOW_TIMEOUT_MS = 3 * 60 * 1000

const file = () => path.join(app.getPath('userData'), 'google-oauth.json')

/** @returns {{ clientId?: string, clientSecret?: string, tokens?: object } | null} */
function readStore() {
  try {
    return JSON.parse(fs.readFileSync(file(), 'utf8'))
  } catch {
    return null
  }
}

function writeStore(data) {
  fs.writeFileSync(file(), JSON.stringify(data, null, 2), { mode: 0o600 })
}

/** Estado público para la UI (sin secretos). */
function status() {
  const s = readStore()
  return {
    configured: !!(s?.clientId && s?.clientSecret),
    connected: !!s?.tokens?.refresh_token,
    clientId: s?.clientId ?? '',
  }
}

/** Guarda credenciales; si cambia el clientId se descartan tokens antiguos. */
function saveConfig({ clientId, clientSecret }) {
  const id = String(clientId ?? '').trim()
  const secret = String(clientSecret ?? '').trim()
  if (!id || !secret) throw new Error('Client ID y Client Secret son obligatorios.')
  if (!/\.apps\.googleusercontent\.com$/.test(id) && !/^[A-Za-z0-9_-]{20,}$/.test(id)) {
    throw new Error('El Client ID no tiene el formato esperado (…apps.googleusercontent.com).')
  }
  const prev = readStore()
  const keepTokens = prev?.clientId === id ? prev?.tokens : undefined
  writeStore({ clientId: id, clientSecret: secret, tokens: keepTokens })
  return status()
}

function deleteConfig() {
  try { fs.unlinkSync(file()) } catch { /* ya no existe */ }
  return status()
}

function disconnect() {
  const s = readStore()
  if (s) writeStore({ clientId: s.clientId, clientSecret: s.clientSecret })
  return status()
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

const CALLBACK_HTML = (title, detail) => `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Turtune</title>
<style>body{background:#10161c;color:#e8f4f8;font:15px/1.6 system-ui;display:grid;place-items:center;height:100vh;margin:0}
main{max-width:420px;text-align:center;padding:24px}h1{font-size:22px;color:#22d3ee;margin:0 0 12px}code{background:#151c24;padding:2px 6px;border-radius:6px}</style></head>
<body><main><h1>${escapeHtml(title)}</h1><p>${escapeHtml(detail)}</p><p style="color:#8ca0af;font-size:12px">Puedes cerrar esta pestaña y volver a Turtune.</p></main></body></html>`

/** Inicia el flujo OAuth; resuelve { ok:true } o lanza Error con mensaje amigable. */
async function connect() {
  const store = readStore()
  if (!store?.clientId || !store?.clientSecret) {
    throw new Error('Primero guarda las credenciales de Google Cloud (Ajustes → Cuenta de YouTube).')
  }

  const state = crypto.randomBytes(16).toString('hex')
  let redirectUri = null // asignado cuando el servidor de callback está escuchando

  const result = await new Promise((resolve, reject) => {
    let settled = false
    const done = (fn, value) => { if (settled) return; settled = true; clearTimeout(timer); server.close(() => fn(value)) }
    const fail = (err) => done(reject, err)

    const server = http.createServer((req, res) => {
      try {
        const u = new URL(req.url, 'http://127.0.0.1')
        if (u.pathname !== '/oauth2callback') { res.writeHead(404).end(); return }
        const errParam = u.searchParams.get('error')
        const code = u.searchParams.get('code')
        const returnedState = u.searchParams.get('state')
        if (errParam) {
          res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
          res.end(CALLBACK_HTML('Autorización cancelada', `Google devolvió: ${errParam}`))
          fail(new Error(`Autorización denegada (${errParam}).`))
          return
        }
        if (!code || returnedState !== state) {
          res.writeHead(400, { 'content-type': 'text/html; charset=utf-8' })
          res.end(CALLBACK_HTML('Error', 'Respuesta de Google inválida (state).'))
          fail(new Error('Respuesta de OAuth inválida (state mismatch).'))
          return
        }
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
        res.end(CALLBACK_HTML('¡Cuenta vinculada!', 'Turtune ya puede leer tus playlists (solo lectura).'))
        done(resolve, { code })
      } catch (e) {
        fail(e)
      }
    })

    const timer = setTimeout(() => {
      fail(new Error('El flujo de autorización superó los 3 minutos. Inténtalo de nuevo.'))
    }, FLOW_TIMEOUT_MS)

    server.on('error', fail)
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port
      redirectUri = `http://127.0.0.1:${port}/oauth2callback`
      const params = new URLSearchParams({
        client_id: store.clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: SCOPE,
        access_type: 'offline',
        prompt: 'consent', // garantiza refresh_token
        state,
      })
      shell.openExternal(`${AUTH_URL}?${params}`)
    })
  })

  // Intercambio code → tokens
  return exchangeCode(store, result.code, redirectUri)
}

/** Intercambia el código por tokens y los persiste. */
async function exchangeCode(store, code, redirectUri) {
  const body = new URLSearchParams({
    client_id: store.clientId,
    client_secret: store.clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  })
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  })
  const data = await res.json().catch(() => null)
  if (!res.ok || !data?.refresh_token) {
    const msg = data?.error_description ?? data?.error ?? `HTTP ${res.status}`
    throw new Error(`No se pudo completar la autorización (${msg}).`)
  }
  writeStore({
    clientId: store.clientId,
    clientSecret: store.clientSecret,
    tokens: {
      refresh_token: data.refresh_token,
      access_token: data.access_token,
      expiry_date: Date.now() + (Number(data.expires_in) || 3600) * 1000 - 60_000,
    },
  })
  return status()
}

/** Access token vigente (auto-refresh si caducó). Lanza si no hay sesión. */
async function getAccessToken() {
  const store = readStore()
  const tokens = store?.tokens
  if (!tokens?.refresh_token) throw new Error('No hay una cuenta de YouTube vinculada.')

  if (tokens.access_token && Number(tokens.expiry_date) > Date.now()) {
    return tokens.access_token
  }

  const body = new URLSearchParams({
    client_id: store.clientId,
    client_secret: store.clientSecret,
    refresh_token: tokens.refresh_token,
    grant_type: 'refresh_token',
  })
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  })
  const data = await res.json().catch(() => null)
  if (!res.ok || !data?.access_token) {
    const msg = data?.error_description ?? data?.error ?? `HTTP ${res.status}`
    throw new Error(`No se pudo renovar la sesión de Google (${msg}). Vuelve a vincular la cuenta.`)
  }
  tokens.access_token = data.access_token
  tokens.expiry_date = Date.now() + (Number(data.expires_in) || 3600) * 1000 - 60_000
  writeStore({ clientId: store.clientId, clientSecret: store.clientSecret, tokens })
  return tokens.access_token
}

module.exports = { status, saveConfig, deleteConfig, disconnect, connect, getAccessToken }
