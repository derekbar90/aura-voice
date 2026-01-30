import path from 'node:path'
import { promises as fsp } from 'node:fs'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import net from 'node:net'
import { PythonService } from './PythonService'

export interface TtsPayload {
  text: string
  voice?: string
  speed?: number
  pitch?: number
  gender?: string
  instruct?: string
  refAudioPath?: string
  refText?: string
  exaggeration?: number
  cfgScale?: number
  ddpmSteps?: number
}

export class TtsService {
  private pythonService: PythonService
  private userDataPath: string
  private serverProcess?: ChildProcessWithoutNullStreams
  private serverReady?: Promise<number>

  constructor(pythonService: PythonService, userDataPath: string) {
    this.pythonService = pythonService
    this.userDataPath = userDataPath
  }

  private async resolveAvailablePort(): Promise<number> {
    return new Promise((resolve, reject) => {
      const server = net.createServer()
      server.on('error', reject)
      server.listen(0, '127.0.0.1', () => {
        const address = server.address()
        if (!address || typeof address === 'string') {
          server.close()
          reject(new Error('Failed to resolve available port'))
          return
        }
        const { port } = address
        server.close(() => resolve(port))
      })
    })
  }

  private async waitForServerReady(port: number): Promise<void> {
    const maxAttempts = 25
    const delayMs = 200
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/health`)
        if (response.ok) return
      } catch {
        // ignore until ready
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
    throw new Error('TTS streaming server failed to start')
  }

  private ensureServer(): Promise<number> {
    if (this.serverReady) return this.serverReady

    this.serverReady = (async () => {
      const port = await this.resolveAvailablePort()
      const pythonPath = this.pythonService.resolvePath()
      const scriptPath = path.join(this.pythonService.getRepoRoot(), 'tts_server.py')
      const cwd = this.pythonService.getRepoRoot()

      this.serverProcess = spawn(pythonPath, [scriptPath], {
        env: { ...process.env, TTS_PORT: String(port) },
        cwd,
      })

      this.serverProcess.stdout.on('data', (data) => {
        console.log('[TTS server]:', data.toString().trim())
      })
      this.serverProcess.stderr.on('data', (data) => {
        console.error('[TTS server error]:', data.toString().trim())
      })
      this.serverProcess.on('close', (code) => {
        console.warn(`TTS server exited with code ${code}`)
        this.serverReady = undefined
        this.serverProcess = undefined
      })

      await this.waitForServerReady(port)
      return port
    })()

    return this.serverReady
  }

  async generate(
    payload: TtsPayload,
    onStatus?: (status: string) => void
  ): Promise<{ audioPath: string, audioData: string, mimeType: string }> {
    const { 
      text, voice, speed, pitch, gender, instruct, refAudioPath, refText, exaggeration, cfgScale, ddpmSteps 
    } = payload
    
    if (!text || !text.trim()) {
      throw new Error('Text is required.')
    }

    const outputDir = path.join(this.userDataPath, 'tts-output')
    await fsp.mkdir(outputDir, { recursive: true })

    const filePrefix = `qwen3_${Date.now()}`
    
    const pythonPath = this.pythonService.resolvePath()
    const cwd = outputDir
    
    const modelId = 'mlx-community/Qwen3-TTS-12Hz-1.7B-VoiceDesign-bf16'

    // Construct CLI arguments for mlx_audio.tts.generate
    const args = [
      '-m',
      'mlx_audio.tts.generate',
      '--model',
      modelId,
      '--text',
      text,
      '--file_prefix',
      filePrefix,
      '--audio_format',
      'wav',
    ]

    if (voice) args.push('--voice', voice)
    if (gender) args.push('--gender', gender)
    if (instruct) args.push('--instruct', instruct)
    if (typeof speed === 'number') args.push('--speed', String(speed))
    if (typeof pitch === 'number') args.push('--pitch', String(pitch))
    if (typeof exaggeration === 'number') args.push('--exaggeration', String(exaggeration))
    if (typeof cfgScale === 'number') args.push('--cfg_scale', String(cfgScale))
    if (typeof ddpmSteps === 'number') args.push('--ddpm_steps', String(ddpmSteps))
    if (refAudioPath) args.push('--ref_audio', refAudioPath)
    if (refText) args.push('--ref_text', refText)

    console.log('Running TTS Spawn:', pythonPath, args.join(' '))

    let lastStatus = ''
    const pushStatus = (status: string) => {
      const next = status.trim()
      if (!next || next === lastStatus) return
      lastStatus = next
      onStatus?.(next)
    }

    const parseStatusLines = (text: string) => {
      const lines = text.split(/[\r\n]+/).map((line) => line.trim()).filter(Boolean)
      for (const line of lines) {
        if (/\b(Downloading|Resolving|Fetching|Loading)\b/i.test(line)) {
          pushStatus(line)
          continue
        }
        if (/\b\d{1,3}%\b/.test(line)) {
          pushStatus(line)
        }
      }
    }

    pushStatus('Preparing model...')

    await new Promise<void>((resolve, reject) => {
      const child = spawn(pythonPath, args, { env: process.env, cwd })
      let stderr = ''

      child.stdout.on('data', (data) => console.log('[TTS stdout]:', data.toString()))
      child.stderr.on('data', (data) => {
        const str = data.toString()
        stderr += str
        parseStatusLines(str)
        console.error('[TTS stderr]:', str)
      })

      child.on('spawn', () => pushStatus('Generating audio...'))
      child.on('error', (err) => reject(err))
      child.on('close', (code) => {
        if (code === 0) resolve()
        else reject(new Error(`TTS process failed (code ${code}):\n${stderr}`))
      })
    })

    const files = await fsp.readdir(outputDir)
    const match = files
      .filter((file) => file.startsWith(filePrefix) && file.endsWith('.wav'))
      .sort()[0]

    if (!match) throw new Error('No audio file was generated.')

    const audioPath = path.join(outputDir, match)
    const audioBuffer = await fsp.readFile(audioPath)

    return {
      audioPath,
      audioData: audioBuffer.toString('base64'),
      mimeType: 'audio/wav',
    }
  }

  async generateStream(
    payload: TtsPayload,
    handlers: {
      onStatus?: (status: string) => void
      onChunk?: (chunk: Uint8Array) => void
      onStart?: (info: { sampleRate: number; channels: number }) => void
      onComplete?: () => void
      onError?: (error: Error) => void
    } = {}
  ): Promise<{ sampleRate: number; channels: number }> {
    if (!payload.text || !payload.text.trim()) {
      throw new Error('Text is required.')
    }
    const port = await this.ensureServer()
    handlers.onStatus?.('Connecting to streaming engine...')

    const outputDir = path.join(this.userDataPath, 'tts-output')
    await fsp.mkdir(outputDir, { recursive: true })

    const response = await fetch(`http://127.0.0.1:${port}/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: payload.text,
        output_path: outputDir,
        file_prefix: `stream_${Date.now()}`,
        voice: payload.voice,
        speed: payload.speed,
        pitch: payload.pitch,
        gender: payload.gender,
        instruct: payload.instruct,
        ref_audio: payload.refAudioPath,
        ref_text: payload.refText,
        exaggeration: payload.exaggeration,
        cfg_scale: payload.cfgScale,
        ddpm_steps: payload.ddpmSteps,
      }),
    })

    if (!response.ok) {
      const message = await response.text()
      const error = new Error(`Streaming failed: ${message}`)
      handlers.onError?.(error)
      throw error
    }

    const sampleRate = Number(response.headers.get('x-sample-rate')) || 24000
    const channels = Number(response.headers.get('x-channels')) || 1
    handlers.onStart?.({ sampleRate, channels })
    handlers.onStatus?.('Streaming audio...')

    const body = response.body
    if (!body) {
      const error = new Error('Streaming response has no body')
      handlers.onError?.(error)
      throw error
    }

    ;(async () => {
      try {
        for await (const chunk of body as any) {
          handlers.onChunk?.(chunk)
        }
        handlers.onComplete?.()
      } catch (err) {
        handlers.onError?.(err as Error)
      }
    })()

    return { sampleRate, channels }
  }
}
