import { EventEmitter } from 'node:events'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'

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
  private activeProcess?: ChildProcessWithoutNullStreams

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

  retry() {
    if (this.activeProcess && !this.activeProcess.killed) {
      this.activeProcess.kill('SIGTERM')
      this.activeProcess = undefined
    }
    this.start()
  }

  startDownload(options: {
    pythonPath: string
    scriptPath: string
    modelId: string
    cwd: string
  }) {
    if (this.activeProcess) return
    this.start()

    const child = spawn(
      options.pythonPath,
      [options.scriptPath, '--model', options.modelId],
      { cwd: options.cwd, env: process.env }
    )
    this.activeProcess = child

    child.stdout.on('data', (data) => this.handleOutput(data.toString()))
    child.stderr.on('data', (data) => {
      this.emit('stderr', data.toString())
    })
    child.on('close', (code) => {
      this.activeProcess = undefined
      if (code === 0 && this.state.status !== 'failed') this.complete()
      if (code !== 0) this.fail(`Download process exited with code ${code}`)
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
    if (this.activeProcess && !this.activeProcess.killed) {
      this.activeProcess.kill('SIGTERM')
      this.activeProcess = undefined
    }
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

  private handleOutput(output: string) {
    const lines = output.split(/\r?\n/).map((line) => line.trim())
    for (const line of lines) {
      if (!line.startsWith('MODEL_DOWNLOAD ')) continue
      const payload = line.replace('MODEL_DOWNLOAD ', '')
      try {
        const data = JSON.parse(payload)
        if (data.event === 'start') {
          this.updateProgress({
            percent: 0,
            downloadedBytes: 0,
            totalBytes: data.totalBytes ?? 0,
          })
          continue
        }
        if (data.event === 'complete') {
          this.complete()
          continue
        }
        if (typeof data.percent === 'number') {
          this.updateProgress({
            percent: data.percent,
            downloadedBytes: data.downloadedBytes ?? 0,
            totalBytes: data.totalBytes ?? 0,
            etaSeconds: data.etaSeconds,
          })
        }
      } catch {
        this.emit('stderr', line)
      }
    }
  }

  private setState(next: Partial<DownloadState>) {
    this.state = { ...this.state, ...next }
    this.emit('state', this.state)
  }
}
