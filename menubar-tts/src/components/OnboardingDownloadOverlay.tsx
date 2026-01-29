import { PropsWithChildren } from 'react'
import { OnboardingDownloadPanel } from './OnboardingDownloadPanel'

type Props = PropsWithChildren<{
  status: 'idle' | 'downloading' | 'paused' | 'completed' | 'failed' | 'canceled'
  progressPercent: number
  downloadedBytes: number
  totalBytes: number
  etaSeconds?: number
  onPause: () => void
  onCancel: () => void
}>

export const OnboardingDownloadOverlay = ({
  children,
  status,
  progressPercent,
  downloadedBytes,
  totalBytes,
  etaSeconds,
  onPause,
  onCancel,
}: Props) => {
  return (
    <div className="relative h-full w-full">
      {children}
      <div className="pointer-events-none absolute inset-0 flex items-start justify-end p-6">
        <div className="pointer-events-auto">
          <OnboardingDownloadPanel
            status={status}
            progressPercent={progressPercent}
            downloadedBytes={downloadedBytes}
            totalBytes={totalBytes}
            etaSeconds={etaSeconds}
            onPause={onPause}
            onCancel={onCancel}
          />
          <p className="mt-3 text-xs text-gray-400 text-right">
            Keep exploring while the model finishes downloading.
          </p>
        </div>
      </div>
    </div>
  )
}
