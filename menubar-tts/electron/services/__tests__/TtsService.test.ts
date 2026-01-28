import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TtsService } from '../TtsService'
import { PythonService } from '../PythonService'
import { spawn } from 'node:child_process'
import { promises as fsp } from 'node:fs'
import path from 'node:path'

vi.mock('node:child_process')
vi.mock('node:fs', () => ({
  promises: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    readdir: vi.fn().mockImplementation(async (dir) => {
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
        'mlx-community/Qwen3-TTS-12Hz-0.6B-Base-6bit',
        '--text',
        'Hello world',
        '--voice',
        'Chelsie',
        '--speed',
        '1.2'
      ]),
      expect.objectContaining({
        env: expect.objectContaining({
          HF_HUB_OFFLINE: '1'
        }),
        cwd: '/mock/repo'
      })
    )

    expect(result.audioData).toBe(Buffer.from('fake audio data').toString('base64'))
  })

  it('should throw error if text is empty', async () => {
    await expect(ttsService.generate({ text: '' })).rejects.toThrow('Text is required.')
  })
})
