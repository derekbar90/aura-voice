// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { OnboardingDownloadPanel } from '../OnboardingDownloadPanel'

afterEach(() => cleanup())

describe('OnboardingDownloadPanel', () => {
  it('renders progress, eta, and controls', () => {
    render(
      <OnboardingDownloadPanel
        status="downloading"
        progressPercent={42}
        downloadedBytes={420}
        totalBytes={1000}
        etaSeconds={120}
        onPause={() => undefined}
        onCancel={() => undefined}
      />
    )

    expect(screen.getByText(/Downloading model/i)).toBeTruthy()
    expect(screen.getByText(/42%/i)).toBeTruthy()
    expect(screen.getByText(/ETA/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /Pause/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeTruthy()
  })

  it('shows why copy for first-time download', () => {
    render(
      <OnboardingDownloadPanel
        status="downloading"
        progressPercent={5}
        downloadedBytes={50}
        totalBytes={1000}
        etaSeconds={300}
        onPause={() => undefined}
        onCancel={() => undefined}
      />
    )

    expect(screen.getAllByText(/local model/i).length).toBeGreaterThan(0)
  })

  it('shows a friendly paused label', () => {
    render(
      <OnboardingDownloadPanel
        status="paused"
        progressPercent={50}
        downloadedBytes={500}
        totalBytes={1000}
        onPause={() => undefined}
        onCancel={() => undefined}
      />
    )

    const label = screen.getByText('Paused')
    expect(label).toBeTruthy()
    expect(label.getAttribute('aria-live')).toBe('polite')
  })

  it('invokes pause handler when clicking Pause', () => {
    const onPause = vi.fn()
    const { getByRole } = render(
      <OnboardingDownloadPanel
        status="downloading"
        progressPercent={20}
        downloadedBytes={200}
        totalBytes={1000}
        onPause={onPause}
        onCancel={() => undefined}
      />
    )

    fireEvent.click(getByRole('button', { name: /Pause/i }))
    expect(onPause).toHaveBeenCalled()
  })
})
