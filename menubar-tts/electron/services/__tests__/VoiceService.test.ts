import { describe, it, expect, vi, beforeEach } from 'vitest'
import { VoiceService } from '../VoiceService'
import { promises as fsp } from 'node:fs'

vi.mock('node:fs', () => ({
  promises: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    copyFile: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn(),
    unlink: vi.fn().mockResolvedValue(undefined),
  }
}))

describe('VoiceService', () => {
  const userDataPath = '/mock/user/data'
  let voiceService: VoiceService
  const MOCK_NOW = 1700000000000

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(MOCK_NOW))
    voiceService = new VoiceService(userDataPath)
  })

  it('should initialize and save from file', async () => {
    vi.mocked(fsp.readFile).mockRejectedValue(new Error('File not found'))
    
    const result = await voiceService.saveFromFile('Test Voice', '/path/to/original.wav')
    
    expect(fsp.mkdir).toHaveBeenCalledWith(expect.stringContaining('custom_voices'), { recursive: true })
    expect(fsp.copyFile).toHaveBeenCalled()
    expect(result.name).toBe('Test Voice')
    expect(result.id).toBe(MOCK_NOW.toString())
    expect(result.path).toContain(`${MOCK_NOW}_original.wav`)
  })

  it('should list voices from registry', async () => {
    const mockVoices = [{ id: '1', name: 'Existing', path: '/p' }]
    vi.mocked(fsp.readFile).mockResolvedValue(JSON.stringify(mockVoices))
    
    const list = await voiceService.list()
    expect(list).toEqual(mockVoices)
  })

  it('returns empty list when registry is missing', async () => {
    vi.mocked(fsp.readFile).mockRejectedValue(new Error('Missing'))

    const list = await voiceService.list()
    expect(list).toEqual([])
  })

  it('saves recordings with transcript metadata', async () => {
    vi.mocked(fsp.readFile).mockRejectedValue(new Error('File not found'))

    const result = await voiceService.saveFromBuffer(
      'Recorded Voice',
      Buffer.from('audio'),
      'hello world'
    )

    expect(fsp.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('_recording.wav'),
      expect.any(Buffer)
    )
    expect(result.transcript).toBe('hello world')
  })

  it('should delete voice and its file', async () => {
    const mockVoices = [{ id: '1', name: 'To Delete', path: '/path/to/delete.wav' }]
    vi.mocked(fsp.readFile).mockResolvedValue(JSON.stringify(mockVoices))
    
    const result = await voiceService.delete('1')
    
    expect(fsp.unlink).toHaveBeenCalledWith('/path/to/delete.wav')
    expect(result).toHaveLength(0)
  })

  it('continues delete when file removal fails', async () => {
    const mockVoices = [{ id: '1', name: 'To Delete', path: '/path/to/delete.wav' }]
    vi.mocked(fsp.readFile).mockResolvedValue(JSON.stringify(mockVoices))
    vi.mocked(fsp.unlink).mockRejectedValue(new Error('Missing file'))

    const result = await voiceService.delete('1')

    expect(result).toEqual([])
  })
})
