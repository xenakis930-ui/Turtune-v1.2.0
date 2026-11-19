'use strict'

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('mini', {
  onState: (cb) => {
    const listener = (_event, data) => { try { cb(data) } catch { /* noop */ } }
    ipcRenderer.on('mini:state', listener)
    return () => ipcRenderer.removeListener('mini:state', listener)
  },
  command: (action) => ipcRenderer.send('mini:command', String(action ?? '')),
})
EOF