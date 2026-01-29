import type { IpcMain, WebContents } from 'electron'
import { ModelDownloadService } from '../services/ModelDownloadService'

type DownloadOptions = {
  pythonPath: string
  scriptPath: string
  modelId: string
  cwd: string
}

export const registerModelDownloadIpc = (
  ipcMain: IpcMain,
  sender: WebContents,
  service: ModelDownloadService,
  getOptions: () => DownloadOptions
) => {
  ipcMain.handle('model:download:start', () => service.startDownload(getOptions()))
  ipcMain.handle('model:download:pause', () => service.pause())
  ipcMain.handle('model:download:resume', () => service.resume())
  ipcMain.handle('model:download:cancel', () => service.cancel())
  ipcMain.handle('model:download:retry', () => service.retry())

  service.on('state', (state) => {
    sender.send('model:download:status', state)
  })
}
