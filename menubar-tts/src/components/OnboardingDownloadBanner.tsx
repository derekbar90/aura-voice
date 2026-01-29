type DownloadStatus = 'idle' | 'downloading' | 'completed' | 'failed' | 'canceled'

type Props = {
  status: DownloadStatus
  progressPercent: number
  downloadedBytes: number
  totalBytes: number
  etaSeconds?: number
  currentFile?: string
  currentFileBytes?: number
  currentFileTotal?: number
  onDismiss: () => void
  onCancel: () => void
  onRetry?: () => void
  errorMessage?: string
}

const formatBytes = (bytes: number) => {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, index)
  const decimals = index === 0 ? 0 : value < 10 ? 2 : 1
  return `${value.toFixed(decimals)} ${units[index]}`
}

const formatEta = (seconds?: number) => {
  if (!seconds || seconds <= 0) return 'ETA calculating...'
  const minutes = Math.floor(seconds / 60)
  const remaining = Math.floor(seconds % 60)
  return `ETA ${minutes}:${remaining.toString().padStart(2, '0')}`
}

export const OnboardingDownloadBanner = ({
  status,
  progressPercent,
  downloadedBytes,
  totalBytes,
  etaSeconds,
  currentFile,
  currentFileBytes,
  currentFileTotal,
  onDismiss,
  onCancel,
  onRetry,
  errorMessage,
}: Props) => {
  const isFailed = status === 'failed'
  const pct = Math.min(Math.max(progressPercent, 0), 100)
  const subtitle = errorMessage || 'Download failed. Please retry.'
  const fileLabel = currentFile ? currentFile.split('/').pop() : null
  const fileBytes = currentFileBytes ?? 0
  const fileTotal = currentFileTotal ?? 0
  const filePct = fileTotal ? Math.min(100, Math.round((fileBytes / fileTotal) * 100)) : null

  return (
    <div className="w-full max-w-4xl px-6">
      <div
        className={`rounded-2xl border ${isFailed ? 'border-red-400/40' : 'border-white/10'} bg-[#222226]/90 backdrop-blur-xl shadow-[0_18px_40px_-20px_rgba(0,0,0,0.7)] px-5 py-4`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.3em] text-gray-500">
              First-time setup
            </div>
            <div className="mt-2 text-sm font-semibold">
              {isFailed ? 'Download failed' : 'Preparing local voice model'}
            </div>
            <div className="mt-1 text-xs text-gray-400">
              {isFailed
                ? subtitle
                : 'We download the local model once so your voices stay private and fast.'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isFailed ? (
              <>
                <button
                  type="button"
                  onClick={onRetry}
                  className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-[#4A90E2]/20 text-[#9dc0ff] hover:bg-[#4A90E2]/30 transition"
                >
                  Retry
                </button>
                <button
                  type="button"
                  onClick={onDismiss}
                  className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-white/10 hover:bg-white/20 transition"
                >
                  Dismiss
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onDismiss}
                  className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-white/10 hover:bg-white/20 transition"
                >
                  Hide
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-3 py-1.5 rounded-full text-[11px] font-semibold text-red-200 bg-red-500/10 hover:bg-red-500/20 transition"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] text-gray-400">
            <span>
              {formatBytes(downloadedBytes)} / {formatBytes(totalBytes)}
            </span>
            <span>{formatEta(etaSeconds)}</span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full transition-all ${isFailed ? 'bg-red-400/60' : 'bg-gradient-to-r from-[#4A90E2] via-[#6A9CEB] to-[#88B2FF]'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-gray-500">
            <span className="uppercase tracking-[0.2em]">{status}</span>
            {fileLabel ? (
              <span className="truncate max-w-[60%]" title={currentFile}>
                {fileLabel}
              </span>
            ) : (
              <span>{pct}%</span>
            )}
          </div>
          {fileLabel && (
            <div className="mt-2 flex items-center justify-between text-[10px] text-gray-500">
              <span>
                {formatBytes(fileBytes)} / {formatBytes(fileTotal || 0)}
              </span>
              {filePct !== null ? <span>{filePct}%</span> : <span>...</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
