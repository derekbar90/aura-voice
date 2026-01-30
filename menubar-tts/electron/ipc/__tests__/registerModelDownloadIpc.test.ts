import { describe, it, expect, vi } from 'vitest'
import { ModelDownloadService } from '../../services/ModelDownloadService'
import { registerModelDownloadIpc } from '../registerModelDownloadIpc'

describe('registerModelDownloadIpc', () => {
  it('registers download control handlers', () => {
    const ipcMain = { handle: vi.fn() }
    const sender = { send: vi.fn() }
    const service = new ModelDownloadService()

    registerModelDownloadIpc(ipcMain as any, sender as any, service, () => ({
      pythonPath: '/mock/python',
      scriptPath: '/mock/script.py',
      modelId: 'mlx-community/Qwen3-TTS-12Hz-1.7B-VoiceDesign-bf16',
      cwd: '/mock/repo',
    }))

    const channels = ipcMain.handle.mock.calls.map((call) => call[0])
    expect(channels).toEqual(
      expect.arrayContaining([
        'model:download:start',
        'model:download:cancel',
        'model:download:retry',
      ])
    )
  })

  it('forwards status updates to the renderer', () => {
    const ipcMain = { handle: vi.fn() }
    const sender = { send: vi.fn() }
    const service = new ModelDownloadService()

    registerModelDownloadIpc(ipcMain as any, sender as any, service, () => ({
      pythonPath: '/mock/python',
      scriptPath: '/mock/script.py',
      modelId: 'mlx-community/Qwen3-TTS-12Hz-1.7B-VoiceDesign-bf16',
      cwd: '/mock/repo',
    }))

    service.start()

    expect(sender.send).toHaveBeenCalledWith(
      'model:download:status',
      expect.objectContaining({ status: 'downloading' })
    )
  })

  it('invokes download start with generated options', async () => {
    const ipcMain = { handle: vi.fn() }
    const sender = { send: vi.fn() }
    const service = new ModelDownloadService()
    const getOptions = vi.fn().mockReturnValue({
      pythonPath: '/mock/python',
      scriptPath: '/mock/script.py',
      modelId: 'mlx-community/Qwen3-TTS-12Hz-1.7B-VoiceDesign-bf16',
      cwd: '/mock/repo',
    })
    const spy = vi.spyOn(service, 'startDownload').mockImplementation(() => undefined)

    registerModelDownloadIpc(ipcMain as any, sender as any, service, getOptions)

    const startHandler = ipcMain.handle.mock.calls.find((call) => call[0] === 'model:download:start')?.[1]
    await startHandler()

    expect(getOptions).toHaveBeenCalled()
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ scriptPath: '/mock/script.py' }))
  })
})
