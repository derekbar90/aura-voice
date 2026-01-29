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
          status: 'downloading',
          progressPercent: 10,
          downloadedBytes: 100,
          totalBytes: 1000,
          etaSeconds: 120,
        })
        return () => undefined
      }),
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
    expect(await screen.findByText(/Model download 10%/i)).toBeTruthy()
  })
})
