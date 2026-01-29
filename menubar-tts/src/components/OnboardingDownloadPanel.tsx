type DownloadStatus = 'idle' | 'downloading' | 'paused' | 'completed' | 'failed' | 'canceled'

type Props = {
  status: DownloadStatus
  progressPercent: number
  downloadedBytes: number
  totalBytes: number
  etaSeconds?: number
  onPause: () => void
  onCancel: () => void
  onRetry?: () => void
  errorMessage?: string
}

const formatBytes = (bytes: number) => {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, index)
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

const formatEta = (seconds?: number) => {
  if (!seconds || seconds <= 0) return 'ETA calculating...'
  const minutes = Math.floor(seconds / 60)
  const remaining = Math.floor(seconds % 60)
  return `ETA ${minutes}:${remaining.toString().padStart(2, '0')}`
}

export const OnboardingDownloadPanel = ({
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
  const isPaused = status === 'paused'
  const isFailed = status === 'failed'
  const pct = Math.min(Math.max(progressPercent, 0), 100)
  const message = errorMessage || 'Download failed. Please retry.'

  return (
    <div className="w-full max-w-xl rounded-2xl bg-[#1F1F22]/90 border border-white/10 shadow-2xl p-6 text-white">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gray-400">First-time setup</p>
          <h2 className="text-lg font-semibold mt-2">
            {isFailed ? 'Download failed' : 'Downloading model'}
          </h2>
          <p className="text-sm text-gray-400 mt-2">
            {isFailed
              ? message
              : 'We download the local model once so your voices stay private and fast.'}
          </p>
        </div>
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#4A4B5A] to-[#2B2C34] flex items-center justify-center text-xs font-semibold">
          {pct}%
        </div>
      </div>

      <div className="mt-6">
        <div className="h-2 w-full rounded-full bg-[#2E2E36] overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#4A90E2] via-[#6A9CEB] to-[#88B2FF] transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
          <span>
            {formatBytes(downloadedBytes)} / {formatBytes(totalBytes)}
          </span>
          <span>{formatEta(etaSeconds)}</span>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        {isFailed ? (
          <button
            type="button"
            onClick={onRetry}
            className="px-4 py-2 rounded-full text-xs font-medium bg-[#4A90E2]/20 text-[#88B2FF] hover:bg-[#4A90E2]/30 transition"
          >
            Retry
          </button>
        ) : (
          <button
            type="button"
            onClick={onPause}
            className="px-4 py-2 rounded-full text-xs font-medium bg-white/10 hover:bg-white/20 transition"
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-full text-xs font-medium text-red-300 bg-red-500/10 hover:bg-red-500/20 transition"
        >
          Cancel
        </button>
        <div
          className="ml-auto text-[10px] uppercase tracking-widest text-gray-500"
          aria-live="polite"
        >
          {status === 'paused' ? 'Paused' : status}
        </div>
      </div>
    </div>
  )
}
