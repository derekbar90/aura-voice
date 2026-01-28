import path from 'node:path'
import fs from 'node:fs'

export class PythonService {
  private appRoot: string
  private isPackaged: boolean
  private resourcesPath?: string

  constructor(appRoot: string, isPackaged: boolean = false, resourcesPath?: string) {
    this.appRoot = appRoot
    this.isPackaged = isPackaged
    this.resourcesPath = resourcesPath
  }

  public resolvePath(): string {
    const engineRoot = this.getRepoRoot()
    const venvPython = path.join(engineRoot, '.venv', 'bin', 'python')
    if (fs.existsSync(venvPython)) {
      return venvPython
    }
    return 'python3'
  }

  public getRepoRoot(): string {
    if (this.isPackaged && this.resourcesPath) {
      // In packaged app, we use extraResources 'python-engine' folder
      return path.join(this.resourcesPath, 'python-engine')
    }
    // In development
    return path.join(this.appRoot, '..')
  }
}
