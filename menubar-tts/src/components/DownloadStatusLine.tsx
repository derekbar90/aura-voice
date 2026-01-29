type DownloadState = {
  status: 'idle' | 'downloading' | 'completed' | 'failed' | 'canceled'
  progressPercent: number
  downloadedBytes: number
  totalBytes: number
  etaSeconds?: number
  error?: string
}

const formatEta = (seconds?: number) => {
  if (!seconds || seconds <= 0) return ''
  const minutes = Math.floor(seconds / 60)
  const remaining = Math.floor(seconds % 60)
  return `${minutes}:${remaining.toString().padStart(2, '0')}`
}

export const DownloadStatusLine = ({ state }: { state: DownloadState | null }) => {
  if (!state || state.status === 'idle') return null

  if (state.status === 'completed') {
    return <span>Model ready</span>
  }

  if (state.status === 'failed') {
    return <span>Model download failed</span>
  }

  if (state.status === 'canceled') {
    return <span>Model download canceled</span>
  }

  const eta = formatEta(state.etaSeconds)
  return (
    <span>
      Model download {state.progressPercent}%{eta ? ` · ETA ${eta}` : ''}
    </span>
  )
}
