import type { IpcMain, WebContents } from 'electron'
import { ModelDownloadService } from '../services/ModelDownloadService'

export const registerModelDownloadIpc = (
  ipcMain: IpcMain,
  sender: WebContents,
  service: ModelDownloadService
) => {
  ipcMain.handle('model:download:start', () => service.start())
  ipcMain.handle('model:download:pause', () => service.pause())
  ipcMain.handle('model:download:cancel', () => service.cancel())
  ipcMain.handle('model:download:retry', () => service.start())

  service.on('state', (state) => {
    sender.send('model:download:status', state)
  })
}
