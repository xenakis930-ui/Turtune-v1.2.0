'use strict'

/**
 * ytdlp.js — Wrapper seguro para invocar el binario yt-dlp.
 *
 * Seguridad:
 *  - `spawn` con array de argumentos (sin shell) → sin inyección de comandos.
 *  - Timeout estricto con kill del proceso hijo.
 *  - Tope de bytes capturados en stdout para evitar consumo de memoria.
 */

const { spawn } = require('node:child_process')
const path = require('node:path')
const { getCookieBrowser } = require('./settings')

// En producción el binario vive fuera del .asar (no se puede ejecutar dentro)
const BASE = path.join(__dirname, '..', '..', 'tools', process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp')
const BINARY = process.env.OCTAVE_YTDLP || BASE.replace('app.asar', 'app.asar.unpacked')

class YtDlpTimeoutError extends Error {
  constructor(timeoutMs) {
    super(`yt-dlp superó el timeout de ${timeoutMs} ms`)
    this.code = 'ETOLTIMEOUT'
  }
}

/** Pre-pone --cookies-from-browser si el usuario activó su sesión del navegador. */
function withBrowserCookies(args) {
  const browser = getCookieBrowser()
  return browser && browser !== 'none' ? ['--cookies-from-browser', browser, ...args] : args
}

/**
 * Ejecuta yt-dlp y devuelve stdout como string.
 * @param {string[]} args
 * @param {{ timeoutMs?: number, maxBytes?: number }} opts
 * @returns {Promise<string>}
 */
function runYtDlp(args, { timeoutMs = 15000, maxBytes = 32 * 1024 * 1024 } = {}) {
  return new Promise((resolve, reject) => {
    let child
    try {
      child = spawn(BINARY, args, {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, PYTHONIOENCODING: 'utf-8', NO_COLOR: '1' },
      })
    } catch (err) {
      reject(err)
      return
    }

    const outChunks = []
    const errChunks = []
    let bytes = 0
    let settled = false

    const finish = (fn, value) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      fn(value)
    }

    const timer = setTimeout(() => {
      try {
        child.kill('SIGKILL')
      } catch {
        /* proceso ya terminó */
      }
      finish(reject, new YtDlpTimeoutError(timeoutMs))
    }, timeoutMs)

    child.stdout.on('data', (d) => {
      bytes += d.length
      if (bytes <= maxBytes) outChunks.push(d) // descarta excedente sin romper
    })
    child.stderr.on('data', (d) => {
      if (Buffer.concat(errChunks).length < 8192) errChunks.push(d)
    })

    child.on('error', (err) => finish(reject, err))
    child.on('close', (code) => {
      if (code === 0) {
        finish(resolve, Buffer.concat(outChunks).toString('utf8'))
      } else {
        const stderr = Buffer.concat(errChunks).toString('utf8').trim().slice(-400)
        const err = new Error(`yt-dlp salió con código ${code}${stderr ? `: ${stderr}` : ''}`)
        err.code = 'EYTDLP'
        finish(reject, err)
      }
    })
  })
}

module.exports = { runYtDlp, BINARY, YtDlpTimeoutError, withBrowserCookies }
