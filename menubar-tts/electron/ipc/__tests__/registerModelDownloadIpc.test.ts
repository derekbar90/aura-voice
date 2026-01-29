import { describe, it, expect, vi } from 'vitest'
import { ModelDownloadService } from '../../services/ModelDownloadService'
import { registerModelDownloadIpc } from '../registerModelDownloadIpc'

describe('registerModelDownloadIpc', () => {
  it('registers download control handlers', () => {
    const ipcMain = { handle: vi.fn() }
    const sender = { send: vi.fn() }
    const service = new ModelDownloadService()

    registerModelDownloadIpc(ipcMain as any, sender as any, service)

    const channels = ipcMain.handle.mock.calls.map((call) => call[0])
    expect(channels).toEqual(
      expect.arrayContaining([
        'model:download:start',
        'model:download:pause',
        'model:download:cancel',
        'model:download:retry',
      ])
    )
  })

  it('forwards status updates to the renderer', () => {
    const ipcMain = { handle: vi.fn() }
    const sender = { send: vi.fn() }
    const service = new ModelDownloadService()

    registerModelDownloadIpc(ipcMain as any, sender as any, service)

    service.start()

    expect(sender.send).toHaveBeenCalledWith(
      'model:download:status',
      expect.objectContaining({ status: 'downloading' })
    )
  })
})
