import path from 'node:path'
import fs from 'node:fs'

export class PythonService {
  private appRoot: string

  constructor(appRoot: string) {
    this.appRoot = appRoot
  }

  public resolvePath(): string {
    const repoRoot = path.join(this.appRoot, '..')
    const venvPython = path.join(repoRoot, '.venv', 'bin', 'python')
    if (fs.existsSync(venvPython)) {
      return venvPython
    }
    return 'python3'
  }

  public getRepoRoot(): string {
    return path.join(this.appRoot, '..')
  }
}