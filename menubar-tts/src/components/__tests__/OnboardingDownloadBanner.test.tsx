// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { OnboardingDownloadBanner } from '../OnboardingDownloadBanner'

afterEach(() => cleanup())

describe('OnboardingDownloadBanner', () => {
  it('renders progress and file label', () => {
    render(
      <OnboardingDownloadBanner
        status="downloading"
        progressPercent={32}
        downloadedBytes={320}
        totalBytes={1000}
        etaSeconds={120}
        currentFile="weights/model.safetensors"
        onDismiss={() => undefined}
        onCancel={() => undefined}
      />
    )

    expect(screen.getByText(/Preparing local voice model/i)).toBeTruthy()
    expect(screen.getByText(/model.safetensors/i)).toBeTruthy()
    expect(screen.getByText(/320 B/i)).toBeTruthy()
  })

  it('triggers dismiss handler', () => {
    const onDismiss = vi.fn()
    render(
      <OnboardingDownloadBanner
        status="downloading"
        progressPercent={10}
        downloadedBytes={100}
        totalBytes={1000}
        onDismiss={onDismiss}
        onCancel={() => undefined}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Hide/i }))
    expect(onDismiss).toHaveBeenCalled()
  })

  it('shows retry state when failed', () => {
    render(
      <OnboardingDownloadBanner
        status="failed"
        progressPercent={0}
        downloadedBytes={0}
        totalBytes={0}
        onDismiss={() => undefined}
        onCancel={() => undefined}
        onRetry={() => undefined}
        errorMessage="Network error"
      />
    )

    expect(screen.getByText(/Download failed/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /Retry/i })).toBeTruthy()
  })
})
