/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  instances,
  createMock,
  requestUseMock,
  responseUseMock,
  requestEjectMock,
  responseEjectMock,
} = vi.hoisted(() => {
  const instances = []
  const requestUseMock = vi.fn()
  const responseUseMock = vi.fn()
  const requestEjectMock = vi.fn()
  const responseEjectMock = vi.fn()
  const createMock = vi.fn(() => {
    const instance = {
      interceptors: {
        request: { use: requestUseMock, eject: requestEjectMock },
        response: { use: responseUseMock, eject: responseEjectMock },
      },
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    }
    instances.push(instance)
    return instance
  })

  return {
    instances,
    createMock,
    requestUseMock,
    responseUseMock,
    requestEjectMock,
    responseEjectMock,
  }
})

vi.mock('axios', () => ({
  default: {
    create: createMock,
  },
}))

import { apiGet, apiPost, apiPut, apiPatch, apiDelete, setupAuth0Interceptor } from './api'

describe('api utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('logs and returns when setupAuth0Interceptor lacks a token getter', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = setupAuth0Interceptor(undefined)

    expect(result).toBeUndefined()
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('attaches Authorization headers via the request interceptor', async () => {
    const tokenGetter = vi.fn().mockResolvedValue('token-1')
    setupAuth0Interceptor(tokenGetter)

    const interceptor = requestUseMock.mock.calls[0][0]
    const config = await interceptor({ headers: {}, method: 'get', url: '/api' })

    expect(config.headers.Authorization).toBe('Bearer token-1')
  })

  it('handles request interceptor failures gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const tokenGetter = vi.fn().mockRejectedValue(new Error('fail'))

    setupAuth0Interceptor(tokenGetter)

    const interceptor = requestUseMock.mock.calls[0][0]
    const config = await interceptor({ headers: {}, method: 'get', url: '/api' })

    expect(config.headers.Authorization).toBeUndefined()
    consoleSpy.mockRestore()
  })

  it('rejects and logs response errors', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    setupAuth0Interceptor(vi.fn().mockResolvedValue('token'))

    const responseError = responseUseMock.mock.calls[0][1]
    await expect(
      responseError({
        response: { status: 401, data: { message: 'bad' } },
        config: { url: '/api/test', method: 'get' },
        message: 'bad',
      }),
    ).rejects.toBeTruthy()

    consoleSpy.mockRestore()
  })

  it('ejects interceptors on cleanup', () => {
    requestUseMock.mockReturnValueOnce(12)
    responseUseMock.mockReturnValueOnce(24)

    const cleanup = setupAuth0Interceptor(vi.fn().mockResolvedValue('token'))

    cleanup()

    expect(requestEjectMock).toHaveBeenCalledWith(12)
    expect(responseEjectMock).toHaveBeenCalledWith(24)
  })

  it('apiGet/apiPost/apiPut/apiDelete forward data and surface errors', async () => {
    const apiAuthClient = instances[1]
    apiAuthClient.get.mockResolvedValue({ data: { ok: true } })
    apiAuthClient.post.mockResolvedValue({ data: { ok: true } })
    apiAuthClient.put.mockResolvedValue({ data: { ok: true } })
    apiAuthClient.delete.mockResolvedValue({ data: { ok: true } })

    await expect(apiGet('/api/ok')).resolves.toEqual({ ok: true })
    await expect(apiPost('/api/ok')).resolves.toEqual({ ok: true })
    await expect(apiPut('/api/ok')).resolves.toEqual({ ok: true })
    await expect(apiDelete('/api/ok')).resolves.toEqual({ ok: true })

    apiAuthClient.get.mockRejectedValueOnce(new Error('get-fail'))
    await expect(apiGet('/api/fail')).rejects.toThrow('get-fail')
  })

  it('apiPatch forwards data and surfaces errors', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const apiAuthClient = instances[1]
    apiAuthClient.patch.mockResolvedValue({ data: { patched: true } })

    await expect(apiPatch('/api/resource', { key: 'val' })).resolves.toEqual({ patched: true })

    apiAuthClient.patch.mockRejectedValueOnce(new Error('patch-fail'))
    await expect(apiPatch('/api/fail')).rejects.toThrow('patch-fail')
    consoleSpy.mockRestore()
  })

  it('response success interceptor passes the response through unchanged', () => {
    setupAuth0Interceptor(vi.fn().mockResolvedValue('token'))
    const responseSuccess = responseUseMock.mock.calls[0][0]
    const response = { status: 200, data: { ok: true } }
    expect(responseSuccess(response)).toBe(response)
  })

  it('logs console.warn for 401 response errors', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    setupAuth0Interceptor(vi.fn().mockResolvedValue('token'))

    const responseError = responseUseMock.mock.calls[0][1]
    await expect(
      responseError({
        response: { status: 401, data: {} },
        config: { url: '/api/test', method: 'get' },
        message: 'Unauthorized',
      }),
    ).rejects.toBeTruthy()

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('401'))
    warnSpy.mockRestore()
    consoleSpy.mockRestore()
  })

  it('logs console.warn for 403 response errors', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    setupAuth0Interceptor(vi.fn().mockResolvedValue('token'))

    const responseError = responseUseMock.mock.calls[0][1]
    await expect(
      responseError({
        response: { status: 403, data: {} },
        config: { url: '/api/test', method: 'get' },
        message: 'Forbidden',
      }),
    ).rejects.toBeTruthy()

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('403'))
    warnSpy.mockRestore()
    consoleSpy.mockRestore()
  })
})
