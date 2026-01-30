import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TtsService } from '../TtsService'
import { PythonService } from '../PythonService'
import { spawn } from 'node:child_process'
import { promises as fsp } from 'node:fs'

vi.mock('node:child_process')
vi.mock('node:fs', () => ({
  promises: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    readdir: vi.fn().mockImplementation(async () => {
      return ['qwen3_1700000000000.wav']
    }),
    readFile: vi.fn().mockResolvedValue(Buffer.from('fake audio data')),
  }
}))

describe('TtsService', () => {
  let ttsService: TtsService
  let mockPythonService: PythonService
  const MOCK_NOW = 1700000000000

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(MOCK_NOW))
    
    mockPythonService = {
      resolvePath: vi.fn().mockReturnValue('/mock/python'),
      getRepoRoot: vi.fn().mockReturnValue('/mock/repo'),
    } as any
    ttsService = new TtsService(mockPythonService, '/mock/user/data')
  })

  it('should generate audio with correct arguments and environment', async () => {
    const mockChild = {
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn((event, cb) => {
        if (event === 'close') cb(0)
      }),
    }
    vi.mocked(spawn).mockReturnValue(mockChild as any)

    const payload = {
      text: 'Hello world',
      voice: 'Chelsie',
      speed: 1.2
    }

    const result = await ttsService.generate(payload)

    expect(spawn).toHaveBeenCalledWith(
      '/mock/python',
      expect.arrayContaining([
        '-m',
        'mlx_audio.tts.generate',
        '--model',
        'mlx-community/Qwen3-TTS-12Hz-1.7B-VoiceDesign-bf16',
        '--text',
        'Hello world',
        '--voice',
        'Chelsie',
        '--speed',
        '1.2'
      ]),
      expect.objectContaining({
        env: expect.any(Object),
        cwd: '/mock/user/data/tts-output'
      })
    )

    expect(result.audioData).toBe(Buffer.from('fake audio data').toString('base64'))
  })

  it('reports status updates from stderr output', async () => {
    const stderrHandlers: Array<(data: Buffer) => void> = []
    const spawnHandlers: Record<string, () => void> = {}
    const closeHandlers: Array<(code: number) => void> = []
    const mockChild = {
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn((_event, handler) => stderrHandlers.push(handler)) },
      on: vi.fn((event, cb) => {
        if (event === 'spawn') spawnHandlers[event] = cb
        if (event === 'close') closeHandlers.push(cb)
      }),
    }
    vi.mocked(spawn).mockReturnValue(mockChild as any)

    const onStatus = vi.fn()

    const resultPromise = ttsService.generate({ text: 'Hello world' }, onStatus)

    await Promise.resolve()

    spawnHandlers.spawn?.()
    for (const handler of stderrHandlers) {
      handler(Buffer.from('Downloading 10%\n'))
    }
    for (const handler of closeHandlers) {
      handler(0)
    }

    await resultPromise

    expect(onStatus).toHaveBeenCalledWith('Preparing model...')
    expect(onStatus).toHaveBeenCalledWith('Generating audio...')
    expect(onStatus).toHaveBeenCalledWith('Downloading 10%')
  })

  it('throws if no audio file is generated', async () => {
    vi.mocked(fsp.readdir).mockResolvedValue([])

    const mockChild = {
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn((event, cb) => {
        if (event === 'close') cb(0)
      }),
    }
    vi.mocked(spawn).mockReturnValue(mockChild as any)

    await expect(ttsService.generate({ text: 'Hello world' })).rejects.toThrow(
      'No audio file was generated.'
    )
  })

  it('should throw error if text is empty', async () => {
    await expect(ttsService.generate({ text: '' })).rejects.toThrow('Text is required.')
  })
})
