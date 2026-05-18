/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { apiGetMock, apiPostMock, apiPutMock, apiPatchMock, apiDeleteMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPostMock: vi.fn(),
  apiPutMock: vi.fn(),
  apiPatchMock: vi.fn(),
  apiDeleteMock: vi.fn(),
}))

vi.mock('./api', () => ({
  apiGet: apiGetMock,
  apiPost: apiPostMock,
  apiPut: apiPutMock,
  apiPatch: apiPatchMock,
  apiDelete: apiDeleteMock,
}))

import {
  fetchUserProfile,
  updateUserProfile,
  fetchEvents,
  fetchEventDetail,
  createEvent,
  updateEvent,
  deleteEvent,
  publishEvent,
  cancelEvent,
  fetchMyRegistrations,
  registerForEvent,
  cancelRegistration,
  fetchCalendarEvents,
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
    expect(apiGetMock).toHaveBeenCalledWith('/api/users/me')
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

    const result = await updateUserProfile('user-1', { displayName: 'Jane Doe' })

    expect(result).toEqual({ displayName: 'Jane Doe' })
    expect(apiPutMock).toHaveBeenCalledWith('/api/users/user-1', { displayName: 'Jane Doe' })
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

  it('fetchEventDetail maps non-404 errors to a generic message', async () => {
    apiGetMock.mockRejectedValue({ response: { status: 500 } })

    await expect(fetchEventDetail('evt-500')).rejects.toThrow(
      'Impossible de récupérer cet événement.',
    )
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

  it('createEvent throws on API failure', async () => {
    apiPostMock.mockRejectedValue(new Error('server error'))

    await expect(createEvent({ title: 'Test' })).rejects.toThrow(
      'Impossible de créer cet événement.',
    )
  })

  it('updateEvent throws when eventId is missing', async () => {
    await expect(updateEvent()).rejects.toThrow('eventId est requis')
  })

  it('updateEvent calls apiPut with correct path and data', async () => {
    apiPutMock.mockResolvedValue({ id: 'evt-1', title: 'Updated' })

    const result = await updateEvent('evt-1', { title: 'Updated' })

    expect(result).toEqual({ id: 'evt-1', title: 'Updated' })
    expect(apiPutMock).toHaveBeenCalledWith('/api/events/evt-1', { title: 'Updated' })
  })

  it('deleteEvent throws when eventId is missing', async () => {
    await expect(deleteEvent()).rejects.toThrow('eventId est requis')
  })

  it('deleteEvent calls apiDelete with correct path', async () => {
    apiDeleteMock.mockResolvedValue(undefined)

    await deleteEvent('evt-1')

    expect(apiDeleteMock).toHaveBeenCalledWith('/api/events/evt-1')
  })

  it('publishEvent throws when eventId is missing', async () => {
    await expect(publishEvent()).rejects.toThrow('eventId est requis')
  })

  it('publishEvent calls apiPatch with the correct path', async () => {
    apiPatchMock.mockResolvedValue({ status: 'PUBLISHED' })

    const result = await publishEvent('evt-1')

    expect(result).toEqual({ status: 'PUBLISHED' })
    expect(apiPatchMock).toHaveBeenCalledWith('/api/events/evt-1/publish')
  })

  it('cancelEvent throws when eventId is missing', async () => {
    await expect(cancelEvent()).rejects.toThrow('eventId est requis')
  })

  it('cancelEvent calls apiPatch with the correct path', async () => {
    apiPatchMock.mockResolvedValue({ status: 'CANCELLED' })

    const result = await cancelEvent('evt-1')

    expect(result).toEqual({ status: 'CANCELLED' })
    expect(apiPatchMock).toHaveBeenCalledWith('/api/events/evt-1/cancel', {})
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
    expect(result.endpoint).toBe('/api/health')
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
    expect(apiGetMock).toHaveBeenCalledWith('/api/users/me')
  })

  it('testAuthentication maps 401 to a friendly error', async () => {
    apiGetMock.mockRejectedValue({ response: { status: 401 } })

    await expect(testAuthentication()).rejects.toThrow('Token invalide. Veuillez vous reconnecter.')
  })

  it('testAuthentication maps other errors to a generic failure', async () => {
    apiGetMock.mockRejectedValue({ response: { status: 500 } })

    await expect(testAuthentication()).rejects.toThrow("L'authentification a échoué.")
  })

  // ── fetchMyRegistrations ────────────────────────────────────────────────

  it('fetchMyRegistrations returns data on success', async () => {
    apiGetMock.mockResolvedValue({ content: [{ registrationId: 'reg-1' }] })

    const result = await fetchMyRegistrations()

    expect(result).toEqual({ content: [{ registrationId: 'reg-1' }] })
    expect(apiGetMock).toHaveBeenCalledWith('/api/registrations/me', { params: {} })
  })

  it('fetchMyRegistrations passes filters to apiGet', async () => {
    apiGetMock.mockResolvedValue({ content: [] })

    await fetchMyRegistrations({ size: 50 })

    expect(apiGetMock).toHaveBeenCalledWith('/api/registrations/me', { params: { size: 50 } })
  })

  it('fetchMyRegistrations throws a friendly error on failure', async () => {
    apiGetMock.mockRejectedValue(new Error('network error'))

    await expect(fetchMyRegistrations()).rejects.toThrow(
      'Impossible de récupérer vos inscriptions.',
    )
  })

  // ── registerForEvent ─────────────────────────────────────────────────────

  it('registerForEvent returns data on success', async () => {
    apiPostMock.mockResolvedValue({ registrationId: 'reg-1', status: 'CONFIRMED' })

    const result = await registerForEvent('evt-1')

    expect(result).toEqual({ registrationId: 'reg-1', status: 'CONFIRMED' })
    expect(apiPostMock).toHaveBeenCalledWith('/api/registrations', { eventId: 'evt-1' })
  })

  it('registerForEvent maps 409 to a friendly error', async () => {
    apiPostMock.mockRejectedValue({ response: { status: 409 } })

    await expect(registerForEvent('evt-1')).rejects.toThrow(
      'Vous êtes déjà inscrit à cet événement.',
    )
  })

  it('registerForEvent maps 403 to an eligibility error', async () => {
    apiPostMock.mockRejectedValue({ response: { status: 403 } })

    await expect(registerForEvent('evt-1')).rejects.toThrow(
      "Vous ne remplissez pas les conditions d'accès à cet événement.",
    )
  })

  it('registerForEvent maps 400 to a wrong-state error', async () => {
    apiPostMock.mockRejectedValue({ response: { status: 400 } })

    await expect(registerForEvent('evt-1')).rejects.toThrow(
      'Impossible de vous inscrire à cet événement dans son état actuel.',
    )
  })

  it('registerForEvent maps generic errors to a fallback message', async () => {
    apiPostMock.mockRejectedValue({ response: { status: 500 } })

    await expect(registerForEvent('evt-1')).rejects.toThrow(
      'Impossible de vous inscrire à cet événement.',
    )
  })

  // ── cancelRegistration ───────────────────────────────────────────────────

  it('cancelRegistration calls apiDelete with correct path', async () => {
    apiDeleteMock.mockResolvedValue(undefined)

    await cancelRegistration('reg-1')

    expect(apiDeleteMock).toHaveBeenCalledWith('/api/registrations/reg-1')
  })

  it('cancelRegistration maps 409 to a past-event error', async () => {
    apiDeleteMock.mockRejectedValue({ response: { status: 409 } })

    await expect(cancelRegistration('reg-1')).rejects.toThrow(
      "Impossible d'annuler une inscription pour un événement passé.",
    )
  })

  it('cancelRegistration maps generic errors to a fallback message', async () => {
    apiDeleteMock.mockRejectedValue({ response: { status: 500 } })

    await expect(cancelRegistration('reg-1')).rejects.toThrow(
      "Impossible d'annuler votre inscription.",
    )
  })

  // ── fetchCalendarEvents ──────────────────────────────────────────────────

  it('fetchCalendarEvents returns data on success', async () => {
    apiGetMock.mockResolvedValue([{ eventId: 'evt-1' }])

    const result = await fetchCalendarEvents({ from: '2026-01-01', to: '2026-12-31' })

    expect(result).toEqual([{ eventId: 'evt-1' }])
    expect(apiGetMock).toHaveBeenCalledWith('/api/events/calendar', {
      params: { from: '2026-01-01', to: '2026-12-31' },
    })
  })

  it('fetchCalendarEvents includes organizerId when provided', async () => {
    apiGetMock.mockResolvedValue([])

    await fetchCalendarEvents({ from: '2026-01-01', to: '2026-12-31', organizerId: 'org-1' })

    expect(apiGetMock).toHaveBeenCalledWith('/api/events/calendar', {
      params: { from: '2026-01-01', to: '2026-12-31', organizerId: 'org-1' },
    })
  })

  it('fetchCalendarEvents omits organizerId when not provided', async () => {
    apiGetMock.mockResolvedValue([])

    await fetchCalendarEvents({ from: '2026-06-01', to: '2026-06-30' })

    const call = apiGetMock.mock.calls[0][1]
    expect(call.params).not.toHaveProperty('organizerId')
  })

  it('fetchCalendarEvents throws a friendly error on failure', async () => {
    apiGetMock.mockRejectedValue(new Error('network error'))

    await expect(fetchCalendarEvents()).rejects.toThrow(
      'Impossible de récupérer les événements du calendrier.',
    )
  })
})
