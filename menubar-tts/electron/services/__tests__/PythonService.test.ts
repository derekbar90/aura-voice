import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PythonService } from '../PythonService'
import fs from 'node:fs'
import path from 'node:path'

vi.mock('node:fs')

describe('PythonService', () => {
  const appRoot = '/mock/app/menubar-tts'
  
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should resolve to venv python in development', () => {
    const pythonService = new PythonService(appRoot, false)
    vi.mocked(fs.existsSync).mockReturnValue(true)
    
    const pythonPath = pythonService.resolvePath()
    expect(pythonPath).toBe(path.join(appRoot, '..', '.venv', 'bin', 'python'))
  })

  it('should resolve to extraResources path when packaged', () => {
    const resourcesPath = '/Applications/MyApp.app/Contents/Resources'
    const pythonService = new PythonService(appRoot, true, resourcesPath)
    vi.mocked(fs.existsSync).mockReturnValue(true)
    
    const engineRoot = pythonService.getRepoRoot()
    expect(engineRoot).toBe(path.join(resourcesPath, 'python-engine'))
    
    const pythonPath = pythonService.resolvePath()
    expect(pythonPath).toBe(path.join(resourcesPath, 'python-engine', '.venv', 'bin', 'python'))
  })

  it('should return correct repo root in dev', () => {
    const pythonService = new PythonService(appRoot, false)
    const repoRoot = pythonService.getRepoRoot()
    expect(repoRoot).toBe(path.join(appRoot, '..'))
  })
})