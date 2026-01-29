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
      >
        <div>Main content</div>
      </OnboardingDownloadOverlay>
    )

    expect(screen.getByText('Main content')).toBeTruthy()
    expect(screen.getByText(/keep exploring/i)).toBeTruthy()
  })
})
