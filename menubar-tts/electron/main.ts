import { app, BrowserWindow, Menu, Tray, ipcMain, nativeImage, screen, dialog, systemPreferences, session } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import { PythonService } from './services/PythonService'
import { VoiceService } from './services/VoiceService'
import { TtsService } from './services/TtsService'
import { ModelDownloadService } from './services/ModelDownloadService'
import { registerModelDownloadIpc } from './ipc/registerModelDownloadIpc'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

const IS_DEV = Boolean(VITE_DEV_SERVER_URL)

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null
let tray: Tray | null
let isQuitting = false

// Initialize Services
// We wait for app.ready usually, but we can instantiate them early
// However, getting userData requires app to be ready or at least initialized.
let pythonService: PythonService
let voiceService: VoiceService
let ttsService: TtsService
let modelDownloadService: ModelDownloadService | null = null

function initializeServices() {
  const userDataPath = app.getPath('userData')
  const appRoot = process.env.APP_ROOT || path.join(__dirname, '..') // Fallback if env missing
  
  pythonService = new PythonService(appRoot, app.isPackaged, process.resourcesPath)
  voiceService = new VoiceService(userDataPath)
  ttsService = new TtsService(pythonService, userDataPath)
  modelDownloadService = new ModelDownloadService()
}

function createWindow() {
  const preloadMjs = path.join(__dirname, 'preload.mjs')
  const preloadCjs = path.join(__dirname, 'preload.cjs')
  
  // Force sync preload.cjs from preload.mjs in development
  if (fs.existsSync(preloadMjs)) {
    try {
      fs.copyFileSync(preloadMjs, preloadCjs)
    } catch (error) {
      console.warn('Failed to copy preload.mjs to preload.cjs', error)
    }
  }

  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    width: 600,
    height: 500,
    show: false,
    resizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    frame: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
      preload: fs.existsSync(preloadCjs) ? preloadCjs : preloadMjs,
    },
  })

  if (modelDownloadService) {
    registerModelDownloadIpc(
      ipcMain,
      win.webContents,
      modelDownloadService,
      () => ({
        pythonPath: pythonService.resolvePath(),
        scriptPath: path.join(pythonService.getRepoRoot(), 'download_model.py'),
        modelId: 'mlx-community/Qwen3-TTS-12Hz-0.6B-Base-6bit',
        cwd: pythonService.getRepoRoot(),
      })
    )
  } else {
    console.warn('Model download service not initialized')
  }

  // Ensure app is treated as a foreground app during dev
  if (IS_DEV && process.platform === 'darwin') {
    app.dock.show()
  }

  const preloadPath = fs.existsSync(preloadCjs) ? preloadCjs : preloadMjs
  if (!fs.existsSync(preloadPath)) {
    console.warn('Preload script not found at', preloadPath)
  }

  win.once('ready-to-show', () => {
    if (IS_DEV) {
      win?.show()
    }
  })

  win.on('blur', () => {
    if (!IS_DEV && win && win.isVisible()) {
      win.hide()
    }
  })

  win.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      win?.hide()
    }
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }

  if (IS_DEV) {
    win.webContents.openDevTools({ mode: 'detach' })
  }

  // Handle permission requests (Microphone, etc.)
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    const allowed: string[] = ['media', 'audioCapture']
    if (allowed.includes(permission)) {
      return callback(true);
    }
    callback(false);
  });
}

function toggleWindow() {
  if (!win || !tray) return

  if (win.isVisible()) {
    win.hide()
    return
  }

  const trayBounds = tray.getBounds()
  const windowBounds = win.getBounds()
  const cursor = screen.getCursorScreenPoint()

  const x = Math.round(
    trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2,
  )
  const y = Math.round(trayBounds.y + trayBounds.height + 6)

  win.setPosition(x, y, false)
  win.show()
  win.focus()
  win.setAlwaysOnTop(true)
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  if (cursor.y < trayBounds.y) {
    win.setPosition(x, trayBounds.y + trayBounds.height + 6, false)
  }
}

function createTray() {
  const iconPath = path.join(process.env.VITE_PUBLIC, 'trayTemplate.svg')
  let image = nativeImage.createFromPath(iconPath)
  if (image.isEmpty()) {
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
        <path fill="black" d="M3 4h14v2H3zm0 5h14v2H3zm0 5h14v2H3z"/>
      </svg>`
    const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
    image = nativeImage.createFromDataURL(dataUrl)
  }
  image.setTemplateImage(true)

  tray = new Tray(image)
  tray.setToolTip('Qwen3 Voice Studio')
  tray.on('click', toggleWindow)
  console.info('Tray created')

  const menu = Menu.buildFromTemplate([
    {
      label: 'Show Qwen3 Voice Studio',
      click: () => toggleWindow(),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => app.quit(),
    },
  ])

  tray.setContextMenu(menu)
}

// IPC Handlers
ipcMain.handle('dialog:openFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    filters: [{ name: 'Audio', extensions: ['wav', 'mp3', 'm4a'] }],
    properties: ['openFile']
  })
  if (canceled) return null
  return filePaths[0]
})

ipcMain.handle('voices:save', async (_event, { name, filePath }) => {
  return voiceService.saveFromFile(name, filePath)
})

ipcMain.handle('voices:saveRecording', async (_event, { name, buffer, transcript }) => {
  // Buffer comes as Uint8Array from renderer, convert to Node Buffer
  return voiceService.saveFromBuffer(name, Buffer.from(buffer), transcript)
})

ipcMain.handle('voices:list', async () => {
  return voiceService.list()
})

ipcMain.handle('voices:delete', async (_event, id) => {
  return voiceService.delete(id)
})

  ipcMain.handle('tts:generate', async (_event, payload) => {
  const sendStatus = (status: string) => {
    if (!win || win.isDestroyed()) return
    win.webContents.send('tts:status', status)
  }

  try {
    const result = await ttsService.generate(payload, sendStatus)
    sendStatus('Audio ready')
    return result
  } catch (err) {
    sendStatus('TTS failed')
    throw err
  }
  })


ipcMain.on('preload:ready', () => {
  console.info('Preload bridge ready')
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
  toggleWindow()
})

app.on('before-quit', () => {
  isQuitting = true
})

app.whenReady().then(async () => {
  initializeServices()
  
  if (process.platform === 'darwin') {
    if (!IS_DEV) {
      app.dock.hide()
    }
    
    // Explicitly ask for microphone permission on macOS
    try {
      if (systemPreferences.askForMediaAccess) {
        await systemPreferences.askForMediaAccess('microphone')
      }
    } catch (err) {
      console.error('Failed to ask for microphone access:', err)
    }
  }
  
  createWindow()
  createTray()
})
