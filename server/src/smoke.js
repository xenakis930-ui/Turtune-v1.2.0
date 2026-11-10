'use strict'

/**
 * smoke.js — arranca la API, prueba /health y /search (sin red pesada) y cierra.
 * Uso: npm run test:smoke
 */

const { spawn } = require('node:child_process')
const http = require('node:http')

const PORT = 8799
const child = spawn(process.execPath, ['src/index.js'], {
  env: { ...process.env, PORT: String(PORT), HOST: '127.0.0.1' },
  stdio: ['ignore', 'inherit', 'inherit'],
  cwd: process.cwd(),
})

let exitCode = 1
function done(code) { exitCode = code; child.kill(); setTimeout(() => process.exit(exitCode), 200) }

setTimeout(() => {
  const req = http.get(`http://127.0.0.1:${PORT}/health`, (res) => {
    let body = ''
    res.on('data', (d) => (body += d))
    res.on('end', () => {
      console.log('[smoke] /health →', res.statusCode, body)
      if (res.statusCode === 200 && body.includes('"ok":true')) {
        done(0)
      } else {
        done(1)
      }
    })
  })
  req.on('error', (err) => { console.error('[smoke] error:', err); done(1) })
}, 1500)

setTimeout(() => { console.error('[smoke] timeout global'); done(1) }, 10000)
