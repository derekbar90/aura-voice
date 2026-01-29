import { EventEmitter } from 'node:events'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'

export type DownloadStatus =
  | 'idle'
  | 'downloading'
  | 'completed'
  | 'failed'
  | 'canceled'

export type DownloadState = {
  status: DownloadStatus
  progressPercent: number
  downloadedBytes: number
  totalBytes: number
  etaSeconds?: number
  currentFile?: string
  currentFileBytes?: number
  currentFileTotal?: number
  error?: string
}

export class ModelDownloadService extends EventEmitter {
  public state: DownloadState
  private activeProcess?: ChildProcessWithoutNullStreams
  private lastOptions?: {
    pythonPath: string
    scriptPath: string
    modelId: string
    cwd: string
  }
  private stderrBuffer = ''
  private stdoutBuffer = ''

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
    if (this.lastOptions) {
      this.startDownload(this.lastOptions)
    } else {
      this.start()
    }
  }

  startDownload(options: {
    pythonPath: string
    scriptPath: string
    modelId: string
    cwd: string
  }) {
    if (this.activeProcess) return
    this.lastOptions = options
    this.stderrBuffer = ''
    this.stdoutBuffer = ''
    this.start()

    const child = spawn(
      options.pythonPath,
      [options.scriptPath, '--model', options.modelId],
      { cwd: options.cwd, env: process.env }
    )
    this.activeProcess = child

    child.stdout.on('data', (data) => this.handleOutput(data.toString()))
    child.stderr.on('data', (data) => {
      const text = data.toString()
      this.stderrBuffer += text
      console.error('[ModelDownload stderr]:', text)
      this.emit('stderr', text)
    })
    child.on('close', (code) => {
      this.activeProcess = undefined
      if (code === 0 && !['failed', 'canceled'].includes(this.state.status)) this.complete()
      if (code !== 0 && !['canceled', 'completed'].includes(this.state.status)) {
        const trimmed = this.stderrBuffer.trim()
        const detail = trimmed ? trimmed.split('\n').slice(-3).join('\n') : `code ${code}`
        this.fail(`Download failed: ${detail}`)
      }
    })
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
    currentFile?: string
    currentFileBytes?: number
    currentFileTotal?: number
  }) {
    this.setState({
      status: 'downloading',
      progressPercent: progress.percent,
      downloadedBytes: progress.downloadedBytes,
      totalBytes: progress.totalBytes,
      etaSeconds: progress.etaSeconds,
      currentFile: progress.currentFile,
      currentFileBytes: progress.currentFileBytes,
      currentFileTotal: progress.currentFileTotal,
    })
  }

  private handleOutput(output: string) {
    this.stdoutBuffer += output
    const lines = this.stdoutBuffer.split(/\r?\n/)
    this.stdoutBuffer = lines.pop() ?? ''
    const trimmedLines = lines.map((line) => line.trim())
    for (const line of trimmedLines) {
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
            currentFile: data.currentFile,
            currentFileBytes: data.currentFileBytes,
            currentFileTotal: data.currentFileTotal,
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
