/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * The built directory structure
     *
     * ```tree
     * ├─┬─┬ dist
     * │ │ └── index.html
     * │ │
     * │ ├─┬ dist-electron
     * │ │ ├── main.js
     * │ │ └── preload.js
     * │
     * ```
     */
    APP_ROOT: string
    /** /dist/ or /public/ */
    VITE_PUBLIC: string
  }
}

// Used in Renderer process, expose in `preload.ts`
interface Window {
  ipcRenderer: import('electron').IpcRenderer
  tts: {
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
    }): Promise<{ audioPath: string; audioData: string; mimeType: string }>
  }
  appBridge: {
    ready: boolean
  }
}
