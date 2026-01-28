import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PythonService } from '../PythonService'
import fs from 'node:fs'
import path from 'node:path'

vi.mock('node:fs')

describe('PythonService', () => {
  const appRoot = '/mock/app/menubar-tts'
  let pythonService: PythonService

  beforeEach(() => {
    vi.clearAllMocks()
    pythonService = new PythonService(appRoot)
  })

  it('should resolve to venv python if it exists', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    const pythonPath = pythonService.resolvePath()
    expect(pythonPath).toContain('.venv/bin/python')
    expect(fs.existsSync).toHaveBeenCalled()
  })

  it('should resolve to python3 if venv does not exist', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)
    const pythonPath = pythonService.resolvePath()
    expect(pythonPath).toBe('python3')
  })

  it('should return correct repo root', () => {
    const repoRoot = pythonService.getRepoRoot()
    expect(repoRoot).toBe(path.join(appRoot, '..'))
  })
})
