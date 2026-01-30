import { describe, it, expect, vi } from 'vitest'

const exposeInMainWorld = vi.fn()

vi.mock('electron', () => ({
  contextBridge: { exposeInMainWorld },
  ipcRenderer: {
    on: vi.fn(),
    off: vi.fn(),
    send: vi.fn(),
    invoke: vi.fn(),
  },
}))

describe('preload', () => {
  it('exposes model download status listener', async () => {
    await import('../preload')

    const { ipcRenderer } = await import('electron')
    const ipc = ipcRenderer as any
    const ipcBridge = exposeInMainWorld.mock.calls.find((call) => call[0] === 'ipcRenderer')?.[1]
    const ttsBridge = exposeInMainWorld.mock.calls.find((call) => call[0] === 'tts')?.[1]
    expect(ttsBridge).toEqual(
      expect.objectContaining({
        onModelDownloadStatus: expect.any(Function),
      })
    )

    ipcBridge.on('test', () => undefined)
    ipcBridge.off('test', () => undefined)
    ipcBridge.send('test', 'payload')
    ipcBridge.invoke('test', { ok: true })

    ttsBridge.generate({ text: 'Hello' })
    ttsBridge.generateStream({ chunk: true })
    ttsBridge.openFile()
    ttsBridge.saveVoice('Name', '/path')
    ttsBridge.saveRecording('Name', new ArrayBuffer(1), 'text')
    ttsBridge.listVoices()
    ttsBridge.deleteVoice('id')
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('tts:generate', { text: 'Hello' })

    const unsubscribeStatus = ttsBridge.onStatus(() => undefined)
    const statusHandler = ipc.on.mock.calls.find((call: any[]) => call[0] === 'tts:status')?.[1]
    expect(statusHandler).toBeTypeOf('function')
    unsubscribeStatus()

    const unsubscribeChunk = ttsBridge.onChunk(() => undefined)
    const chunkHandler = ipc.on.mock.calls.find((call: any[]) => call[0] === 'tts:chunk')?.[1]
    expect(chunkHandler).toBeTypeOf('function')
    unsubscribeChunk()

    const unsubscribeStreamStart = ttsBridge.onStreamStart(() => undefined)
    const streamStartHandler = ipc.on.mock.calls.find((call: any[]) => call[0] === 'tts:stream-start')?.[1]
    expect(streamStartHandler).toBeTypeOf('function')
    unsubscribeStreamStart()

    const unsubscribeStreamEnd = ttsBridge.onStreamEnd(() => undefined)
    const streamEndHandler = ipc.on.mock.calls.find((call: any[]) => call[0] === 'tts:stream-end')?.[1]
    expect(streamEndHandler).toBeTypeOf('function')
    unsubscribeStreamEnd()

    const unsubscribeStreamError = ttsBridge.onStreamError(() => undefined)
    const streamErrorHandler = ipc.on.mock.calls.find((call: any[]) => call[0] === 'tts:stream-error')?.[1]
    expect(streamErrorHandler).toBeTypeOf('function')
    unsubscribeStreamError()

    const unsubscribeDownload = ttsBridge.onModelDownloadStatus(() => undefined)
    const downloadHandler = ipc.on.mock.calls.find((call: any[]) => call[0] === 'model:download:status')?.[1]
    expect(downloadHandler).toBeTypeOf('function')
    unsubscribeDownload()
  })
})
