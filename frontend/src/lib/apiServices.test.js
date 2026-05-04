/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { apiGetMock, apiPostMock, apiPutMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPostMock: vi.fn(),
  apiPutMock: vi.fn(),
}))

vi.mock('./api', () => ({
  apiGet: apiGetMock,
  apiPost: apiPostMock,
  apiPut: apiPutMock,
  apiDelete: vi.fn(),
}))

import {
  fetchUserProfile,
  updateUserProfile,
  fetchEvents,
  fetchEventDetail,
  createEvent,
  pingBackend,
  testAuthentication,
} from './apiServices'

describe('apiServices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('fetchUserProfile returns data on success', async () => {
    apiGetMock.mockResolvedValue({ id: 'user-1' })

    const profile = await fetchUserProfile()

    expect(profile).toEqual({ id: 'user-1' })
    expect(apiGetMock).toHaveBeenCalledWith('/api/users/profile')
  })

  it('fetchUserProfile surfaces 401 as a friendly error', async () => {
    apiGetMock.mockRejectedValue({ response: { status: 401 } })

    await expect(fetchUserProfile()).rejects.toThrow('Token invalide. Veuillez vous reconnecter.')
  })

  it('fetchUserProfile surfaces 403 as a friendly error', async () => {
    apiGetMock.mockRejectedValue({ response: { status: 403 } })

    await expect(fetchUserProfile()).rejects.toThrow('Accès refusé à votre profil.')
  })

  it('updateUserProfile returns null when no updates are provided', async () => {
    const result = await updateUserProfile()

    expect(result).toBeNull()
    expect(apiPutMock).not.toHaveBeenCalled()
  })

  it('updateUserProfile returns the updated profile', async () => {
    apiPutMock.mockResolvedValue({ displayName: 'Jane Doe' })

    const result = await updateUserProfile({ displayName: 'Jane Doe' })

    expect(result).toEqual({ displayName: 'Jane Doe' })
    expect(apiPutMock).toHaveBeenCalledWith('/api/users/profile', { displayName: 'Jane Doe' })
  })

  it('fetchEvents passes filters to apiGet', async () => {
    apiGetMock.mockResolvedValue([{ id: 'event-1' }])

    const result = await fetchEvents({ page: 2 })

    expect(result).toEqual([{ id: 'event-1' }])
    expect(apiGetMock).toHaveBeenCalledWith('/api/events', { params: { page: 2 } })
  })

  it('fetchEventDetail throws when eventId is missing', async () => {
    await expect(fetchEventDetail()).rejects.toThrow('eventId est requis')
  })

  it('fetchEventDetail maps 404 to a friendly error', async () => {
    apiGetMock.mockRejectedValue({ response: { status: 404 } })

    await expect(fetchEventDetail('evt-404')).rejects.toThrow('Événement non trouvé.')
  })

  it('createEvent throws when event data is missing', async () => {
    await expect(createEvent()).rejects.toThrow("Les données de l'événement sont requises")
  })

  it('createEvent returns the created event', async () => {
    apiPostMock.mockResolvedValue({ id: 'evt-1' })

    const result = await createEvent({ title: 'Test' })

    expect(result).toEqual({ id: 'evt-1' })
    expect(apiPostMock).toHaveBeenCalledWith('/api/events', { title: 'Test' })
  })

  it('pingBackend returns the first successful response', async () => {
    const fetchMock = vi.fn()
    vi.stubEnv('VITE_API_URL', 'https://api.test.local')
    vi.stubGlobal('fetch', fetchMock)

    fetchMock.mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({ status: 'ok' }),
    })

    const result = await pingBackend()

    expect(result.status).toBe('ok')
    expect(result.endpoint).toBe('/api/ping')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('pingBackend throws when no health endpoint responds', async () => {
    const fetchMock = vi.fn()
    vi.stubEnv('VITE_API_URL', 'https://api.test.local')
    vi.stubGlobal('fetch', fetchMock)

    fetchMock.mockResolvedValue({ ok: false })

    await expect(pingBackend()).rejects.toThrow("Le backend n'est pas accessible.")
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('testAuthentication returns data on success', async () => {
    apiGetMock.mockResolvedValue({ authenticated: true })

    const result = await testAuthentication()

    expect(result).toEqual({ authenticated: true })
    expect(apiGetMock).toHaveBeenCalledWith('/api/auth/test')
  })

  it('testAuthentication maps 401 to a friendly error', async () => {
    apiGetMock.mockRejectedValue({ response: { status: 401 } })

    await expect(testAuthentication()).rejects.toThrow('Token invalide. Veuillez vous reconnecter.')
  })

  it('testAuthentication maps other errors to a generic failure', async () => {
    apiGetMock.mockRejectedValue({ response: { status: 500 } })

    await expect(testAuthentication()).rejects.toThrow("L'authentification a échoué.")
  })
})
