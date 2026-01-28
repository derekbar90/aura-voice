/// <reference types="vite/client" />

interface Window {
  ipcRenderer: import('electron').IpcRenderer
  appBridge: {
    ready: boolean
  }
  tts: {
    generate: (payload: {
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
    }) => Promise<{
      audioPath: string
      audioData: string
      mimeType: string
    }>
    openFile: () => Promise<string | null>
    saveVoice: (name: string, filePath: string) => Promise<{ id: string; name: string; path: string }>
    saveRecording: (name: string, buffer: ArrayBuffer, transcript?: string) => Promise<{ id: string; name: string; path: string; transcript?: string }>
    listVoices: () => Promise<Array<{ id: string; name: string; path: string }>>
    deleteVoice: (id: string) => Promise<Array<{ id: string; name: string; path: string }>>
  }
}