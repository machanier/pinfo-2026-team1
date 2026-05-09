/**
 * @vitest-environment jsdom
 */
import { renderHook, act, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getTokenMock, apiAuthClientMock } = vi.hoisted(() => ({
  getTokenMock: vi.fn(),
  apiAuthClientMock: vi.fn(),
}))

vi.mock('../contexts/useApp', () => ({
  useApp: () => ({
    getToken: getTokenMock,
  }),
}))

vi.mock('../lib/api', () => ({
  apiAuthClient: apiAuthClientMock,
}))

import { useApi } from './useApi'

describe('useApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('executes a GET request and stores the response data', async () => {
    getTokenMock.mockResolvedValue('token-123')
    apiAuthClientMock.mockResolvedValue({ data: { value: 'ok' } })

    const { result } = renderHook(() => useApi())

    await act(async () => {
      const response = await result.current.execute('GET', '/api/test')
      expect(response).toEqual({ value: 'ok' })
    })

    expect(apiAuthClientMock).toHaveBeenCalledTimes(1)
    const config = apiAuthClientMock.mock.calls[0][0]
    expect(config).toMatchObject({ method: 'GET', url: '/api/test' })
    expect(config.headers.Authorization).toBe('Bearer token-123')
    expect(result.current.data).toEqual({ value: 'ok' })
    expect(result.current.error).toBeNull()
  })

  it('attaches payload data for POST requests', async () => {
    getTokenMock.mockResolvedValue('token-456')
    apiAuthClientMock.mockResolvedValue({ data: { created: true } })

    const { result } = renderHook(() => useApi())

    await act(async () => {
      await result.current.execute(
        'POST',
        '/api/items',
        { name: 'Item' },
        { headers: { 'X-Test': '1' } },
      )
    })

    const config = apiAuthClientMock.mock.calls[0][0]
    expect(config.data).toEqual({ name: 'Item' })
    expect(config.headers.Authorization).toBe('Bearer token-456')
    expect(config.headers['X-Test']).toBe('1')
  })

  it('throws when no endpoint is provided', async () => {
    getTokenMock.mockResolvedValue('token-123')

    const { result } = renderHook(() => useApi())

    await expect(result.current.execute()).rejects.toThrow('[useApi] endpoint est requis')
  })

  it('stores an error when the token is missing', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    getTokenMock.mockResolvedValue(null)

    const { result } = renderHook(() => useApi())

    await expect(result.current.execute('GET', '/api/test')).rejects.toThrow(
      "Token d'authentification indisponible",
    )

    await waitFor(() => {
      expect(result.current.error?.message).toBe("Token d'authentification indisponible")
    })

    expect(apiAuthClientMock).not.toHaveBeenCalled()

    consoleSpy.mockRestore()
  })

  it('auto-fetches when configured with a default GET endpoint', async () => {
    getTokenMock.mockResolvedValue('token-789')
    apiAuthClientMock.mockResolvedValue({ data: { value: 'auto' } })

    renderHook(() => useApi({ autoFetch: true, endpoint: '/api/auto' }))

    await waitFor(() => {
      expect(apiAuthClientMock).toHaveBeenCalledTimes(1)
    })
  })

  it('reset clears data, error, and loading state', async () => {
    getTokenMock.mockResolvedValue('token-123')
    apiAuthClientMock.mockResolvedValue({ data: { value: 'ok' } })

    const { result } = renderHook(() => useApi())

    await act(async () => {
      await result.current.execute('GET', '/api/test')
    })

    act(() => {
      result.current.reset()
    })

    expect(result.current.data).toBeNull()
    expect(result.current.error).toBeNull()
    expect(result.current.isLoading).toBe(false)
  })
})
