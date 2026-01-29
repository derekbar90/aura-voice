import { describe, it, expect, vi } from 'vitest'
import { ModelDownloadService } from '../ModelDownloadService'
import { spawn } from 'node:child_process'

vi.mock('node:child_process')

describe('ModelDownloadService', () => {
  it('transitions through core lifecycle states', () => {
    const service = new ModelDownloadService()

    expect(service.state.status).toBe('idle')

    service.start()
    expect(service.state.status).toBe('downloading')

    service.cancel()
    expect(service.state.status).toBe('canceled')
  })

  it('marks failures and success with terminal states', () => {
    const service = new ModelDownloadService()

    service.start()
    service.fail('network error')
    expect(service.state.status).toBe('failed')
    expect(service.state.error).toBe('network error')

    const next = new ModelDownloadService()
    next.start()
    next.complete()
    expect(next.state.status).toBe('completed')
  })

  it('retries after failure by returning to downloading', () => {
    const service = new ModelDownloadService()

    service.start()
    service.fail('network error')
    expect(service.state.status).toBe('failed')

    service.retry()
    expect(service.state.status).toBe('downloading')
    expect(service.state.error).toBeUndefined()
  })

  it('spawns the model download helper and updates progress', () => {
    const stdoutHandlers: Array<(data: Buffer) => void> = []
    const mockChild = {
      stdout: { on: vi.fn((_event, handler) => stdoutHandlers.push(handler)) },
      stderr: { on: vi.fn() },
      on: vi.fn(),
    }
    vi.mocked(spawn).mockReturnValue(mockChild as any)

    const service = new ModelDownloadService()
    service.startDownload({
      pythonPath: '/mock/python',
      scriptPath: '/mock/script.py',
      modelId: 'mlx-community/Qwen3-TTS-12Hz-0.6B-Base-6bit',
      cwd: '/mock/repo',
    })

    const payload = {
      percent: 40,
      downloadedBytes: 400,
      totalBytes: 1000,
      etaSeconds: 12,
    }
    for (const handler of stdoutHandlers) {
      handler(Buffer.from(`MODEL_DOWNLOAD ${JSON.stringify(payload)}\n`))
    }

    expect(spawn).toHaveBeenCalledWith(
      '/mock/python',
      ['/mock/script.py', '--model', 'mlx-community/Qwen3-TTS-12Hz-0.6B-Base-6bit'],
      expect.objectContaining({ cwd: '/mock/repo', env: expect.any(Object) })
    )
    expect(service.state.progressPercent).toBe(40)
    expect(service.state.totalBytes).toBe(1000)
  })

  it('handles start and complete events from download output', () => {
    const stdoutHandlers: Array<(data: Buffer) => void> = []
    const mockChild = {
      stdout: { on: vi.fn((_event, handler) => stdoutHandlers.push(handler)) },
      stderr: { on: vi.fn() },
      on: vi.fn(),
    }
    vi.mocked(spawn).mockReturnValue(mockChild as any)

    const service = new ModelDownloadService()
    service.startDownload({
      pythonPath: '/mock/python',
      scriptPath: '/mock/script.py',
      modelId: 'mlx-community/Qwen3-TTS-12Hz-0.6B-Base-6bit',
      cwd: '/mock/repo',
    })

    const startPayload = { event: 'start', totalBytes: 2048 }
    const completePayload = { event: 'complete' }

    for (const handler of stdoutHandlers) {
      handler(Buffer.from(`MODEL_DOWNLOAD ${JSON.stringify(startPayload)}\n`))
      handler(Buffer.from(`MODEL_DOWNLOAD ${JSON.stringify(completePayload)}\n`))
    }

    expect(service.state.totalBytes).toBe(2048)
    expect(service.state.status).toBe('completed')
  })

  it('ignores cancel when already completed', () => {
    const service = new ModelDownloadService()
    service.complete()
    service.cancel()
    expect(service.state.status).toBe('completed')
  })
})
