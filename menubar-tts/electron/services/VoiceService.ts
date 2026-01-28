import path from 'node:path'
import { promises as fsp } from 'node:fs'

const VOICES_FILE = 'voices.json'
const VOICES_DIR = 'custom_voices'

export interface Voice {
  id: string
  name: string
  path: string
  transcript?: string
}

export class VoiceService {
  private userDataPath: string

  constructor(userDataPath: string) {
    this.userDataPath = userDataPath
  }

  private get voicesDir(): string {
    return path.join(this.userDataPath, VOICES_DIR)
  }

  private get voicesFile(): string {
    return path.join(this.userDataPath, VOICES_FILE)
  }

  async initialize() {
    await fsp.mkdir(this.voicesDir, { recursive: true })
  }

  async saveFromFile(name: string, filePath: string): Promise<Voice> {
    await this.initialize()
    const newFileName = `${Date.now()}_${path.basename(filePath)}`
    const destPath = path.join(this.voicesDir, newFileName)
    await fsp.copyFile(filePath, destPath)
    return this.updateRegistry(name, destPath)
  }

  async saveFromBuffer(name: string, buffer: Buffer, transcript?: string): Promise<Voice> {
    await this.initialize()
    // Always save as wav now that frontend converts it
    const newFileName = `${Date.now()}_recording.wav`
    const destPath = path.join(this.voicesDir, newFileName)
    await fsp.writeFile(destPath, buffer)
    return this.updateRegistry(name, destPath, transcript)
  }

  private async updateRegistry(name: string, filePath: string, transcript?: string): Promise<Voice> {
    let voices: Voice[] = []
    try {
      const data = await fsp.readFile(this.voicesFile, 'utf-8')
      voices = JSON.parse(data)
    } catch {
      // ignore if file doesn't exist
    }

    const newVoice: Voice = { 
      id: Date.now().toString(), 
      name, 
      path: filePath,
      transcript
    }
    
    voices.push(newVoice)
    await fsp.writeFile(this.voicesFile, JSON.stringify(voices, null, 2))
    return newVoice
  }

  async list(): Promise<Voice[]> {
    try {
      const data = await fsp.readFile(this.voicesFile, 'utf-8')
      return JSON.parse(data)
    } catch {
      return []
    }
  }

  async delete(id: string): Promise<Voice[]> {
    let voices: Voice[] = await this.list()
    const voice = voices.find(v => v.id === id)
    
    if (voice) {
      try {
        await fsp.unlink(voice.path)
      } catch {
        // ignore missing file
      }
    }

    voices = voices.filter(v => v.id !== id)
    await fsp.writeFile(this.voicesFile, JSON.stringify(voices, null, 2))
    return voices
  }
}
