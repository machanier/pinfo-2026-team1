import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const axiosCreate = vi.hoisted(() => vi.fn())
let requestInterceptor

vi.mock('axios', () => ({
  default: {
    create: axiosCreate,
  },
}))

async function loadApiClient({ baseUrl, devToken } = {}) {
  vi.resetModules()
  requestInterceptor = undefined
  vi.unstubAllEnvs()

  if (typeof baseUrl !== 'undefined') {
    vi.stubEnv('VITE_API_BASE_URL', baseUrl)
  }

  if (typeof devToken !== 'undefined') {
    vi.stubEnv('VITE_DEV_JWT_TOKEN', devToken)
  }

  const mockClient = {
    interceptors: {
      request: {
        use: vi.fn((handler) => {
          requestInterceptor = handler
          return 0
        }),
      },
    },
  }

  axiosCreate.mockReturnValueOnce(mockClient)
  const module = await import('./apiClient')
  return { apiClient: module.default }
}

beforeEach(() => {
  window.localStorage.clear()
  window.sessionStorage.clear()
})

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('apiClient', () => {
  it('uses VITE_API_BASE_URL when provided', async () => {
    await loadApiClient({ baseUrl: 'https://api.example.test' })

    expect(axiosCreate).toHaveBeenCalledWith({
      baseURL: 'https://api.example.test',
    })
  })

  it('falls back to root baseURL when env is missing or blank', async () => {
    await loadApiClient({ baseUrl: '   ' })

    expect(axiosCreate).toHaveBeenCalledWith({
      baseURL: '/',
    })
  })

  it('adds authorization header from localStorage auth_token', async () => {
    await loadApiClient()
    window.localStorage.setItem('auth_token', 'token-auth')

    const result = requestInterceptor({ headers: {} })

    expect(result.headers.Authorization).toBe('Bearer token-auth')
  })

  it('uses fallback token sources in order', async () => {
    await loadApiClient()

    window.localStorage.setItem('access_token', 'token-access')
    let result = requestInterceptor({ headers: {} })
    expect(result.headers.Authorization).toBe('Bearer token-access')

    window.localStorage.clear()
    window.sessionStorage.setItem('auth_token', 'token-session-auth')
    result = requestInterceptor({ headers: {} })
    expect(result.headers.Authorization).toBe('Bearer token-session-auth')

    window.sessionStorage.clear()
    window.sessionStorage.setItem('access_token', 'token-session-access')
    result = requestInterceptor({ headers: {} })
    expect(result.headers.Authorization).toBe('Bearer token-session-access')
  })

  it('uses DEV token when no stored token exists', async () => {
    await loadApiClient({ devToken: 'dev-token-123' })

    const result = requestInterceptor({ headers: {} })

    expect(result.headers.Authorization).toBe('Bearer dev-token-123')
  })

  it('creates headers object when token exists and config.headers is missing', async () => {
    await loadApiClient()
    window.localStorage.setItem('auth_token', 'token-auth')

    const result = requestInterceptor({})

    expect(result.headers.Authorization).toBe('Bearer token-auth')
  })

  it('does not add auth header when window is undefined', async () => {
    await loadApiClient()
    vi.stubGlobal('window', undefined)

    const result = requestInterceptor({ headers: {} })

    expect(result.headers.Authorization).toBeUndefined()
  })

  it('keeps config unchanged when no token is available', async () => {
    await loadApiClient({ devToken: '' })

    const config = { headers: { Existing: 'yes' } }
    const result = requestInterceptor(config)

    expect(result).toEqual({ headers: { Existing: 'yes' } })
    expect(result.headers.Authorization).toBeUndefined()
  })
})
