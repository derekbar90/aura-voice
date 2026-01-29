import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },

  // You can expose other APTs you need here.
  // ...
})

contextBridge.exposeInMainWorld('tts', {
  generate(payload: {
    text: string
    voice?: string
    gender?: string
    speed?: number
    pitch?: number
    instruct?: string
    refAudioPath?: string
    refText?: string
    exaggeration?: number
    cfgScale?: number
    ddpmSteps?: number
  }) {
    return ipcRenderer.invoke('tts:generate', payload)
  },
  generateStream(payload: any) {
    return ipcRenderer.invoke('tts:generateStream', payload)
  },
  onChunk(callback: (chunk: string) => void) {
    const subscription = (_event: any, chunk: string) => callback(chunk)
    ipcRenderer.on('tts:chunk', subscription)
    return () => ipcRenderer.off('tts:chunk', subscription)
  },
  onStatus(callback: (status: string) => void) {
    const subscription = (_event: any, status: string) => callback(status)
    ipcRenderer.on('tts:status', subscription)
    return () => ipcRenderer.off('tts:status', subscription)
  },
  openFile() {
    return ipcRenderer.invoke('dialog:openFile')
  },
  saveVoice(name: string, filePath: string) {
    return ipcRenderer.invoke('voices:save', { name, filePath })
  },
  saveRecording(name: string, buffer: ArrayBuffer, transcript?: string) {
    return ipcRenderer.invoke('voices:saveRecording', { name, buffer, transcript })
  },
  listVoices() {
    return ipcRenderer.invoke('voices:list')
  },
  deleteVoice(id: string) {
    return ipcRenderer.invoke('voices:delete', id)
  },
})

contextBridge.exposeInMainWorld('appBridge', {
  ready: true,
})

ipcRenderer.send('preload:ready')
