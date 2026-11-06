'use strict'

/**
 * settings.js — Preferencias locales en <userData>/turtune-settings.json.
 * Puro Node (sin Electron): main.js inyecta la ruta con init().
 */

const fs = require('node:fs')
const path = require('node:path')

/** @type {string | null} */
let userDataDir = null

function init(dir) {
  userDataDir = dir
}

function file() {
  return path.join(userDataDir ?? require('node:os').tmpdir(), 'turtune-settings.json')
}

/** @returns {Record<string, unknown>} */
function getAll() {
  try {
    return JSON.parse(fs.readFileSync(file(), 'utf8'))
  } catch {
    return {}
  }
}

/** @template T */
function get(key, fallback) {
  const v = getAll()[key]
  return v === undefined ? fallback : v
}

function set(key, value) {
  const data = getAll()
  data[key] = value
  fs.writeFileSync(file(), JSON.stringify(data, null, 2), { mode: 0o600 })
  return getAll()
}

const VALID_BROWSERS = ['none', 'edge', 'chrome', 'firefox']

function getCookieBrowser() {
  const b = get('cookieBrowser', 'none')
  return VALID_BROWSERS.includes(b) ? b : 'none'
}

module.exports = { init, get, set, getCookieBrowser, VALID_BROWSERS }
