import path from 'node:path'
import { promises as fsp } from 'node:fs'
import { spawn } from 'node:child_process'
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

  constructor(pythonService: PythonService, userDataPath: string) {
    this.pythonService = pythonService
    this.userDataPath = userDataPath
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
    
    const modelId = 'mlx-community/Qwen3-TTS-12Hz-0.6B-Base-6bit'

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
}
