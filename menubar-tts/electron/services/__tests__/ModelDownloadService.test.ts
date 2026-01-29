import { describe, it, expect } from 'vitest'
import { ModelDownloadService } from '../ModelDownloadService'

describe('ModelDownloadService', () => {
  it('transitions through core lifecycle states', () => {
    const service = new ModelDownloadService()

    expect(service.state.status).toBe('idle')

    service.start()
    expect(service.state.status).toBe('downloading')

    service.pause()
    expect(service.state.status).toBe('paused')

    service.resume()
    expect(service.state.status).toBe('downloading')

    service.cancel()
    expect(service.state.status).toBe('canceled')
  })

  it('marks failures and success with terminal states', () => {
    const service = new ModelDownloadService()

    service.start()
    service.fail('network error')
    expect(service.state.status).toBe('failed')
    expect(service.state.error).toBe('network error')

    const next = new ModelDownloadService()
    next.start()
    next.complete()
    expect(next.state.status).toBe('completed')
  })
})
