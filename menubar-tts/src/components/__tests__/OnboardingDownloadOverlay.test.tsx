// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OnboardingDownloadOverlay } from '../OnboardingDownloadOverlay'

describe('OnboardingDownloadOverlay', () => {
  it('renders panel without blocking main content', () => {
    render(
      <OnboardingDownloadOverlay
        status="downloading"
        progressPercent={12}
        downloadedBytes={120}
        totalBytes={1000}
        etaSeconds={90}
        onPause={() => undefined}
        onCancel={() => undefined}
      />
    )

    expect(screen.getByText(/keep exploring/i)).toBeTruthy()
  })

  it('shows a blocking retry state when download fails', () => {
    render(
      <OnboardingDownloadOverlay
        status="failed"
        progressPercent={0}
        downloadedBytes={0}
        totalBytes={0}
        onPause={() => undefined}
        onCancel={() => undefined}
        onRetry={() => undefined}
        errorMessage="Network error"
      />
    )

    expect(screen.getByRole('button', { name: /Retry/i })).toBeTruthy()
    expect(screen.getByText(/Network error/i)).toBeTruthy()
  })
})
