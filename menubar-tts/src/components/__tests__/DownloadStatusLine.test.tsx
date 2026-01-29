// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DownloadStatusLine } from '../DownloadStatusLine'

describe('DownloadStatusLine', () => {
  it('renders progress while downloading', () => {
    render(
      <DownloadStatusLine
        state={{
          status: 'downloading',
          progressPercent: 42,
          etaSeconds: 90,
          downloadedBytes: 420,
          totalBytes: 1000,
        }}
      />
    )

    expect(screen.getByText(/Model download/i)).toBeTruthy()
    expect(screen.getByText(/42%/i)).toBeTruthy()
  })

  it('renders ready state when completed', () => {
    render(
      <DownloadStatusLine
        state={{
          status: 'completed',
          progressPercent: 100,
          downloadedBytes: 1000,
          totalBytes: 1000,
        }}
      />
    )

    expect(screen.getByText(/Model ready/i)).toBeTruthy()
  })
})
