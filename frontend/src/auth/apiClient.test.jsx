/**
 * @vitest-environment jsdom
 */
import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Hoist a fake getAccessTokenSilently the test can drive — Vitest hoists
// vi.mock declarations above all imports, so we can't reference outer
// variables inside the factory directly. Use vi.hoisted() to share.
const { getAccessTokenSilently } = vi.hoisted(() => ({
  getAccessTokenSilently: vi.fn(),
}))

vi.mock('@auth0/auth0-react', () => ({
  useAuth0: () => ({ getAccessTokenSilently }),
}))

// Capture the request interceptor that apiClient registers, so the test
// can fire it directly without spinning up axios.
const interceptorUse = vi.fn()
vi.mock('axios', () => ({
  default: {
    create: () => ({
      interceptors: { request: { use: interceptorUse } },
    }),
  },
}))

import { useApiClient } from './apiClient'

describe('useApiClient request interceptor', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('attaches Authorization: Bearer <token> on every request', async () => {
    getAccessTokenSilently.mockResolvedValue('test-access-token')
    renderHook(() => useApiClient())
    // The interceptor function is the first arg of the first .use() call.
    const interceptor = interceptorUse.mock.calls[0][0]
    const config = await interceptor({ headers: {} })
    expect(config.headers.Authorization).toBe('Bearer test-access-token')
  })

  it('lets the request go through unauthenticated when getAccessTokenSilently fails', async () => {
    // e.g. user cleared cookies, refresh token revoked. We deliberately
    // don't reject — the backend will reply 401 and the caller decides.
    getAccessTokenSilently.mockRejectedValue(new Error('login_required'))
    renderHook(() => useApiClient())
    const interceptor = interceptorUse.mock.calls[0][0]
    const config = await interceptor({ headers: {} })
    expect(config.headers.Authorization).toBeUndefined()
  })
})
