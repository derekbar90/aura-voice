// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('../components/VoiceCloneModal', () => ({
  VoiceCloneModal: () => null,
}))

vi.mock('../hooks/useAudioVisualizer', () => ({
  useAudioVisualizer: () => new Uint8Array(0),
}))

describe('App', () => {
  beforeEach(() => {
    window.appBridge = { ready: true }
    window.tts = {
      generate: vi.fn(),
      listVoices: vi.fn().mockResolvedValue([]),
      onStatus: vi.fn().mockReturnValue(() => undefined),
      onModelDownloadStatus: vi.fn((callback) => {
        callback({
          status: 'idle',
          progressPercent: 0,
          downloadedBytes: 0,
          totalBytes: 0,
        })
        return () => undefined
      }),
      startModelDownload: vi.fn(),
      cancelModelDownload: vi.fn(),
      retryModelDownload: vi.fn(),
      openFile: vi.fn(),
      saveVoice: vi.fn(),
      saveRecording: vi.fn(),
      deleteVoice: vi.fn(),
    }
  })

  it('renders footer actions and model download status', async () => {
    const { default: App } = await import('../App')
    render(<App />)

    expect(screen.getByRole('button', { name: /Speak Selection/i })).toBeTruthy()
    expect(window.tts.startModelDownload).toHaveBeenCalled()
  })
})
