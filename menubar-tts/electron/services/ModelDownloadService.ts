import { EventEmitter } from 'node:events'

export type DownloadStatus =
  | 'idle'
  | 'downloading'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'canceled'

export type DownloadState = {
  status: DownloadStatus
  progressPercent: number
  downloadedBytes: number
  totalBytes: number
  etaSeconds?: number
  error?: string
}

export class ModelDownloadService extends EventEmitter {
  public state: DownloadState

  constructor() {
    super()
    this.state = {
      status: 'idle',
      progressPercent: 0,
      downloadedBytes: 0,
      totalBytes: 0,
    }
  }

  start() {
    this.setState({
      status: 'downloading',
      error: undefined,
    })
  }

  pause() {
    if (this.state.status !== 'downloading') return
    this.setState({ status: 'paused' })
  }

  resume() {
    if (this.state.status !== 'paused') return
    this.setState({ status: 'downloading' })
  }

  cancel() {
    if (this.state.status === 'completed') return
    this.setState({ status: 'canceled' })
  }

  fail(message: string) {
    this.setState({ status: 'failed', error: message })
  }

  complete() {
    this.setState({ status: 'completed', progressPercent: 100 })
  }

  updateProgress(progress: {
    percent: number
    downloadedBytes: number
    totalBytes: number
    etaSeconds?: number
  }) {
    this.setState({
      status: 'downloading',
      progressPercent: progress.percent,
      downloadedBytes: progress.downloadedBytes,
      totalBytes: progress.totalBytes,
      etaSeconds: progress.etaSeconds,
    })
  }

  private setState(next: Partial<DownloadState>) {
    this.state = { ...this.state, ...next }
    this.emit('state', this.state)
  }
}
