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
  onRetry?: () => void
  errorMessage?: string
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
  onRetry,
  errorMessage,
}: Props) => {
  const isFailed = status === 'failed'

  const panel = (
    <OnboardingDownloadPanel
      status={status}
      progressPercent={progressPercent}
      downloadedBytes={downloadedBytes}
      totalBytes={totalBytes}
      etaSeconds={etaSeconds}
      onPause={onPause}
      onCancel={onCancel}
      onRetry={onRetry}
      errorMessage={errorMessage}
    />
  )

  if (isFailed) {
    return (
      <div className="relative h-full w-full">
        {children}
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="pointer-events-auto">
            {panel}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full">
      {children}
      <div className="pointer-events-none absolute inset-0 flex items-start justify-end p-6">
        <div className="pointer-events-auto">
          {panel}
          <p className="mt-3 text-xs text-gray-400 text-right">
            Keep exploring while the model finishes downloading.
          </p>
        </div>
      </div>
    </div>
  )
}
