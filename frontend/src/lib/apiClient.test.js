/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// We need to re-import the module per test to reset its singleton state.
async function freshClient() {
  vi.resetModules()
  return await import('./apiClient')
}

describe('lib/apiClient (PINFO-190 token-getter pattern)', () => {
  let client
  let setApiTokenGetter

  beforeEach(async () => {
    ;({ default: client, setApiTokenGetter } = await freshClient())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('attaches Authorization: Bearer <token> when a getter is registered', async () => {
    setApiTokenGetter(async () => 'tok-123')
    const interceptor = client.interceptors.request.handlers[0].fulfilled
    const config = await interceptor({ headers: {} })
    expect(config.headers.Authorization).toBe('Bearer tok-123')
  })

  it('lets the request through unauthenticated when no getter is registered', async () => {
    const interceptor = client.interceptors.request.handlers[0].fulfilled
    const config = await interceptor({ headers: {} })
    expect(config.headers.Authorization).toBeUndefined()
  })

  it('swallows getter errors and lets the request through', async () => {
    setApiTokenGetter(async () => {
      throw new Error('login_required')
    })
    const interceptor = client.interceptors.request.handlers[0].fulfilled
    const config = await interceptor({ headers: {} })
    expect(config.headers.Authorization).toBeUndefined()
  })

  it('skips header when getter returns null/empty token', async () => {
    setApiTokenGetter(async () => null)
    const interceptor = client.interceptors.request.handlers[0].fulfilled
    const config = await interceptor({ headers: {} })
    expect(config.headers.Authorization).toBeUndefined()
  })
})
