/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { apiGetMock, apiPostMock, apiPutMock, apiPatchMock, apiDeleteMock, apiClientGetMock } =
  vi.hoisted(() => ({
    apiGetMock: vi.fn(),
    apiPostMock: vi.fn(),
    apiPutMock: vi.fn(),
    apiPatchMock: vi.fn(),
    apiDeleteMock: vi.fn(),
    apiClientGetMock: vi.fn(),
  }))

vi.mock('./api', () => ({
  apiGet: apiGetMock,
  apiPost: apiPostMock,
  apiPut: apiPutMock,
  apiPatch: apiPatchMock,
  apiDelete: apiDeleteMock,
  apiClient: { get: apiClientGetMock },
}))

import {
  fetchUserProfile,
  updateUserProfile,
  deleteUser,
  fetchEvents,
  fetchPublicEvents,
  fetchEventDetail,
  createEvent,
  updateEvent,
  deleteEvent,
  submitEvent,
  cancelEvent,
  fetchMyRegistrations,
  registerForEvent,
  cancelRegistration,
  fetchCalendarEvents,
  pingBackend,
  testAuthentication,
  fetchEventAnnouncements,
  createEventAnnouncement,
  deleteEventAnnouncement,
  fetchModerationQueue,
  fetchModerationCase,
  approveModerationCase,
  rejectModerationCase,
  deleteModerationCase,
  deleteEventBanner,
  searchEvents,
  fetchEventSuggestions,
  searchOrganizers,
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

  // ── deleteUser ────────────────────────────────────────────────────────────

  it('deleteUser throws when userId is missing', async () => {
    await expect(deleteUser()).rejects.toThrow('userId est requis')
    expect(apiDeleteMock).not.toHaveBeenCalled()
  })

  it('deleteUser calls apiDelete with correct path', async () => {
    apiDeleteMock.mockResolvedValue(undefined)

    await deleteUser('user-1')

    expect(apiDeleteMock).toHaveBeenCalledWith('/api/users/user-1')
  })

  it('deleteUser maps 403 to a friendly error', async () => {
    apiDeleteMock.mockRejectedValue({ response: { status: 403 } })

    await expect(deleteUser('user-1')).rejects.toThrow('Vous ne pouvez pas supprimer ce compte.')
  })

  it('deleteUser maps 404 to a friendly error', async () => {
    apiDeleteMock.mockRejectedValue({ response: { status: 404 } })

    await expect(deleteUser('user-1')).rejects.toThrow('Compte introuvable.')
  })

  it('deleteUser maps generic errors to a fallback message', async () => {
    apiDeleteMock.mockRejectedValue({ response: { status: 500 } })

    await expect(deleteUser('user-1')).rejects.toThrow('Impossible de supprimer le compte.')
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

  it('submitEvent throws when eventId is missing', async () => {
    await expect(submitEvent()).rejects.toThrow('eventId est requis')
  })

  it('submitEvent calls apiPatch with the correct path', async () => {
    apiPatchMock.mockResolvedValue({ status: 'PENDING_MODERATION' })

    const result = await submitEvent('evt-1')

    expect(result).toEqual({ status: 'PENDING_MODERATION' })
    expect(apiPatchMock).toHaveBeenCalledWith('/api/events/evt-1/submit')
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

  // ── fetchPublicEvents ──────────────────────────────────────────────────────

  it('fetchPublicEvents returns data on success', async () => {
    const events = [{ eventId: 'e1', title: 'Public Event' }]
    apiClientGetMock.mockResolvedValue({ data: { content: events, totalPages: 1 } })

    const result = await fetchPublicEvents({ status: 'PUBLISHED', page: 0 })

    expect(apiClientGetMock).toHaveBeenCalledWith('/api/events', {
      params: { status: 'PUBLISHED', page: 0 },
    })
    expect(result).toEqual({ content: events, totalPages: 1 })
  })

  it('fetchPublicEvents throws a friendly error on failure', async () => {
    apiClientGetMock.mockRejectedValue(new Error('network error'))

    await expect(fetchPublicEvents()).rejects.toThrow('Impossible de récupérer les événements.')
  })
})

// ── fetchEventAnnouncements ───────────────────────────────────────────────────

describe('fetchEventAnnouncements', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns data on success with default page/size', async () => {
    apiGetMock.mockResolvedValue({ content: [], totalPages: 0 })

    const result = await fetchEventAnnouncements('evt-1')

    expect(result).toEqual({ content: [], totalPages: 0 })
    expect(apiGetMock).toHaveBeenCalledWith('/api/events/evt-1/announcements', {
      params: { page: 0, size: 3 },
    })
  })

  it('passes custom page and size to apiGet', async () => {
    apiGetMock.mockResolvedValue({ content: [] })

    await fetchEventAnnouncements('evt-1', 2, 5)

    expect(apiGetMock).toHaveBeenCalledWith('/api/events/evt-1/announcements', {
      params: { page: 2, size: 5 },
    })
  })

  it('throws when eventId is missing', async () => {
    await expect(fetchEventAnnouncements()).rejects.toThrow('eventId est requis')
  })

  it('throws a friendly error on API failure', async () => {
    apiGetMock.mockRejectedValue(new Error('network error'))

    await expect(fetchEventAnnouncements('evt-1')).rejects.toThrow(
      'Impossible de récupérer les annonces.',
    )
  })
})

// ── createEventAnnouncement ───────────────────────────────────────────────────

describe('createEventAnnouncement', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls apiPost with body field and returns data', async () => {
    apiPostMock.mockResolvedValue({ announcementId: 'ann-1', body: 'Test' })

    const result = await createEventAnnouncement('evt-1', 'Test')

    expect(result).toEqual({ announcementId: 'ann-1', body: 'Test' })
    expect(apiPostMock).toHaveBeenCalledWith('/api/events/evt-1/announcements', { body: 'Test' })
  })

  it('throws when eventId is missing', async () => {
    await expect(createEventAnnouncement()).rejects.toThrow('eventId est requis')
  })

  it('throws a friendly error on API failure', async () => {
    apiPostMock.mockRejectedValue(new Error('server error'))

    await expect(createEventAnnouncement('evt-1', 'Test')).rejects.toThrow(
      "Impossible de publier l'annonce.",
    )
  })
})

// ── deleteEventAnnouncement ───────────────────────────────────────────────────

describe('deleteEventAnnouncement', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls apiDelete with correct path', async () => {
    apiDeleteMock.mockResolvedValue(undefined)

    await deleteEventAnnouncement('evt-1', 'ann-1')

    expect(apiDeleteMock).toHaveBeenCalledWith('/api/events/evt-1/announcements/ann-1')
  })

  it('throws when eventId is missing', async () => {
    await expect(deleteEventAnnouncement()).rejects.toThrow('eventId et announcementId sont requis')
  })

  it('throws when announcementId is missing', async () => {
    await expect(deleteEventAnnouncement('evt-1')).rejects.toThrow(
      'eventId et announcementId sont requis',
    )
  })

  it('throws a friendly error on API failure', async () => {
    apiDeleteMock.mockRejectedValue(new Error('server error'))

    await expect(deleteEventAnnouncement('evt-1', 'ann-1')).rejects.toThrow(
      "Impossible de supprimer l'annonce.",
    )
  })
})

// ── fetchModerationQueue ──────────────────────────────────────────────────────

describe('fetchModerationQueue', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls apiGet with default params when none are provided', async () => {
    apiGetMock.mockResolvedValue({
      content: [],
      page: 0,
      size: 30,
      totalElements: 0,
      totalPages: 0,
    })

    await fetchModerationQueue()

    expect(apiGetMock).toHaveBeenCalledWith('/api/moderation/queue', {
      params: { status: 'PENDING', page: 0, size: 30 },
    })
  })

  it('passes provided params through to apiGet', async () => {
    apiGetMock.mockResolvedValue({ content: [] })

    await fetchModerationQueue({ status: 'APPROVED', page: 2, size: 50 })

    expect(apiGetMock).toHaveBeenCalledWith('/api/moderation/queue', {
      params: { status: 'APPROVED', page: 2, size: 50 },
    })
  })

  it('returns the page payload on success', async () => {
    const page = { content: [{ caseId: 'c1' }], totalPages: 1 }
    apiGetMock.mockResolvedValue(page)

    const result = await fetchModerationQueue({ status: 'PENDING' })

    expect(result).toEqual(page)
  })

  it('maps 403 to the admin-only friendly error', async () => {
    apiGetMock.mockRejectedValue({ response: { status: 403 } })

    await expect(fetchModerationQueue()).rejects.toThrow(
      'Accès refusé : réservé aux administrateurs.',
    )
  })

  it('maps generic failures to the fallback message', async () => {
    apiGetMock.mockRejectedValue(new Error('boom'))

    await expect(fetchModerationQueue()).rejects.toThrow(
      'Impossible de récupérer la file de modération.',
    )
  })
})

// ── fetchModerationCase ───────────────────────────────────────────────────────

describe('fetchModerationCase', () => {
  beforeEach(() => vi.clearAllMocks())

  it('throws when caseId is missing', async () => {
    await expect(fetchModerationCase()).rejects.toThrow('caseId est requis')
    expect(apiGetMock).not.toHaveBeenCalled()
  })

  it('returns data on success', async () => {
    const caseData = { caseId: 'c1', status: 'PENDING' }
    apiGetMock.mockResolvedValue(caseData)

    const result = await fetchModerationCase('c1')

    expect(result).toEqual(caseData)
    expect(apiGetMock).toHaveBeenCalledWith('/api/moderation/queue/c1')
  })

  it('maps 403 to the admin-only friendly error', async () => {
    apiGetMock.mockRejectedValue({ response: { status: 403 } })

    await expect(fetchModerationCase('c1')).rejects.toThrow(
      'Accès refusé : réservé aux administrateurs.',
    )
  })

  it('maps 404 to a not-found error', async () => {
    apiGetMock.mockRejectedValue({ response: { status: 404 } })

    await expect(fetchModerationCase('c1')).rejects.toThrow('Cas de modération introuvable.')
  })

  it('maps generic errors to a fallback message', async () => {
    apiGetMock.mockRejectedValue({ response: { status: 500 } })

    await expect(fetchModerationCase('c1')).rejects.toThrow(
      'Impossible de récupérer ce cas de modération.',
    )
  })
})

// ── approveModerationCase ─────────────────────────────────────────────────────

describe('approveModerationCase', () => {
  beforeEach(() => vi.clearAllMocks())

  it('throws when caseId is missing', async () => {
    await expect(approveModerationCase()).rejects.toThrow('caseId est requis')
    expect(apiPatchMock).not.toHaveBeenCalled()
  })

  it('calls apiPatch without body when no adminNote is provided', async () => {
    apiPatchMock.mockResolvedValue({ caseId: 'c1', status: 'APPROVED' })

    const result = await approveModerationCase('c1')

    expect(result).toEqual({ caseId: 'c1', status: 'APPROVED' })
    expect(apiPatchMock).toHaveBeenCalledWith('/api/moderation/queue/c1/approve', {})
  })

  it('calls apiPatch with adminNote when one is provided', async () => {
    apiPatchMock.mockResolvedValue({ caseId: 'c1', status: 'APPROVED' })

    await approveModerationCase('c1', 'Contenu validé')

    expect(apiPatchMock).toHaveBeenCalledWith('/api/moderation/queue/c1/approve', {
      adminNote: 'Contenu validé',
    })
  })

  it('maps 403 to the admin-only friendly error', async () => {
    apiPatchMock.mockRejectedValue({ response: { status: 403 } })

    await expect(approveModerationCase('c1')).rejects.toThrow(
      'Accès refusé : réservé aux administrateurs.',
    )
  })

  it('maps 404 to a not-found error', async () => {
    apiPatchMock.mockRejectedValue({ response: { status: 404 } })

    await expect(approveModerationCase('c1')).rejects.toThrow('Cas de modération introuvable.')
  })

  it('maps 409 to an already-decided error', async () => {
    apiPatchMock.mockRejectedValue({ response: { status: 409 } })

    await expect(approveModerationCase('c1')).rejects.toThrow('Ce cas a déjà été traité.')
  })

  it('maps generic errors to a fallback message', async () => {
    apiPatchMock.mockRejectedValue({ response: { status: 500 } })

    await expect(approveModerationCase('c1')).rejects.toThrow("Impossible d'approuver ce cas.")
  })
})

// ── rejectModerationCase ──────────────────────────────────────────────────────

describe('rejectModerationCase', () => {
  beforeEach(() => vi.clearAllMocks())

  it('throws when caseId is missing', async () => {
    await expect(rejectModerationCase()).rejects.toThrow('caseId est requis')
    expect(apiPatchMock).not.toHaveBeenCalled()
  })

  it('throws when reason is empty or whitespace', async () => {
    await expect(rejectModerationCase('c1', '  ')).rejects.toThrow('Le motif de rejet est requis.')
    await expect(rejectModerationCase('c1')).rejects.toThrow('Le motif de rejet est requis.')
    expect(apiPatchMock).not.toHaveBeenCalled()
  })

  it('calls apiPatch with reason and returns data', async () => {
    apiPatchMock.mockResolvedValue({ caseId: 'c1', status: 'REJECTED' })

    const result = await rejectModerationCase('c1', 'Contenu inapproprié')

    expect(result).toEqual({ caseId: 'c1', status: 'REJECTED' })
    expect(apiPatchMock).toHaveBeenCalledWith('/api/moderation/queue/c1/reject', {
      reason: 'Contenu inapproprié',
    })
  })

  it('maps 403 to the admin-only friendly error', async () => {
    apiPatchMock.mockRejectedValue({ response: { status: 403 } })

    await expect(rejectModerationCase('c1', 'Raison')).rejects.toThrow(
      'Accès refusé : réservé aux administrateurs.',
    )
  })

  it('maps 404 to a not-found error', async () => {
    apiPatchMock.mockRejectedValue({ response: { status: 404 } })

    await expect(rejectModerationCase('c1', 'Raison')).rejects.toThrow(
      'Cas de modération introuvable.',
    )
  })

  it('maps 409 to an already-decided error', async () => {
    apiPatchMock.mockRejectedValue({ response: { status: 409 } })

    await expect(rejectModerationCase('c1', 'Raison')).rejects.toThrow('Ce cas a déjà été traité.')
  })

  it('maps generic errors to a fallback message', async () => {
    apiPatchMock.mockRejectedValue({ response: { status: 500 } })

    await expect(rejectModerationCase('c1', 'Raison')).rejects.toThrow(
      'Impossible de rejeter ce cas.',
    )
  })
})

// ── deleteModerationCase ──────────────────────────────────────────────────────

describe('deleteModerationCase', () => {
  beforeEach(() => vi.clearAllMocks())

  it('throws when caseId is missing', async () => {
    await expect(deleteModerationCase()).rejects.toThrow('caseId est requis')
    expect(apiDeleteMock).not.toHaveBeenCalled()
  })

  it('calls apiDelete with the correct path on success', async () => {
    apiDeleteMock.mockResolvedValue(undefined)

    await deleteModerationCase('c1')

    expect(apiDeleteMock).toHaveBeenCalledWith('/api/moderation/queue/c1')
  })

  it('maps 403 to the admin-only friendly error', async () => {
    apiDeleteMock.mockRejectedValue({ response: { status: 403 } })

    await expect(deleteModerationCase('c1')).rejects.toThrow(
      'Accès refusé : réservé aux administrateurs.',
    )
  })

  it('maps 404 to a not-found error', async () => {
    apiDeleteMock.mockRejectedValue({ response: { status: 404 } })

    await expect(deleteModerationCase('c1')).rejects.toThrow('Cas de modération introuvable.')
  })

  it('maps generic errors to a fallback message', async () => {
    apiDeleteMock.mockRejectedValue({ response: { status: 500 } })

    await expect(deleteModerationCase('c1')).rejects.toThrow(
      'Impossible de supprimer ce cas de modération.',
    )
  })
})

// ── deleteEventBanner ─────────────────────────────────────────────────────────

describe('deleteEventBanner', () => {
  beforeEach(() => vi.clearAllMocks())

  it('throws when eventId is missing', async () => {
    await expect(deleteEventBanner()).rejects.toThrow('eventId est requis')
    expect(apiDeleteMock).not.toHaveBeenCalled()
  })

  it('calls apiDelete with the correct path on success', async () => {
    apiDeleteMock.mockResolvedValue(undefined)

    await deleteEventBanner('evt-1')

    expect(apiDeleteMock).toHaveBeenCalledWith('/api/events/evt-1/banner')
  })

  it('maps 403 to a friendly organizer error', async () => {
    apiDeleteMock.mockRejectedValue({ response: { status: 403 } })

    await expect(deleteEventBanner('evt-1')).rejects.toThrow(
      "Accès refusé : vous n'êtes pas l'organisateur de cet événement.",
    )
  })

  it('maps 404 to an event-not-found error', async () => {
    apiDeleteMock.mockRejectedValue({ response: { status: 404 } })

    await expect(deleteEventBanner('evt-1')).rejects.toThrow('Événement introuvable.')
  })

  it('maps generic errors to a fallback message', async () => {
    apiDeleteMock.mockRejectedValue({ response: { status: 500 } })

    await expect(deleteEventBanner('evt-1')).rejects.toThrow('Impossible de supprimer le banner.')
  })
})

// ── searchEvents ─────────────────────────────────────────────────────────────

describe('searchEvents', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns response.data on success', async () => {
    const data = { content: [{ eventId: 'e1' }], totalPages: 1 }
    apiClientGetMock.mockResolvedValue({ data })

    const result = await searchEvents({ q: 'robotique' })

    expect(apiClientGetMock).toHaveBeenCalledWith('/api/search/events', {
      params: { q: 'robotique' },
    })
    expect(result).toEqual(data)
  })

  it('passes empty params by default', async () => {
    apiClientGetMock.mockResolvedValue({ data: { content: [] } })

    await searchEvents()

    expect(apiClientGetMock).toHaveBeenCalledWith('/api/search/events', { params: {} })
  })

  it('throws a friendly error on failure', async () => {
    apiClientGetMock.mockRejectedValue(new Error('network'))

    await expect(searchEvents({ q: 'test' })).rejects.toThrow(
      "Impossible d'exécuter la recherche.",
    )
  })
})

// ── fetchEventSuggestions ─────────────────────────────────────────────────────

describe('fetchEventSuggestions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns response.data with q and default limit', async () => {
    const data = { suggestions: ['Conférence IA', 'Conférence ML'] }
    apiClientGetMock.mockResolvedValue({ data })

    const result = await fetchEventSuggestions('Conf')

    expect(apiClientGetMock).toHaveBeenCalledWith('/api/search/events/suggestions', {
      params: { q: 'Conf', limit: 8 },
    })
    expect(result).toEqual(data)
  })

  it('passes custom limit when provided', async () => {
    apiClientGetMock.mockResolvedValue({ data: { suggestions: [] } })

    await fetchEventSuggestions('ia', 5)

    expect(apiClientGetMock).toHaveBeenCalledWith('/api/search/events/suggestions', {
      params: { q: 'ia', limit: 5 },
    })
  })

  it('throws a friendly error on failure', async () => {
    apiClientGetMock.mockRejectedValue(new Error('network'))

    await expect(fetchEventSuggestions('ia')).rejects.toThrow(
      'Impossible de récupérer les suggestions.',
    )
  })
})

// ── searchOrganizers ──────────────────────────────────────────────────────────

describe('searchOrganizers', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns response.data on success', async () => {
    const data = { content: [{ userId: 'org-1', associationName: 'Club Tech' }], totalPages: 1 }
    apiClientGetMock.mockResolvedValue({ data })

    const result = await searchOrganizers({ q: 'Club' })

    expect(apiClientGetMock).toHaveBeenCalledWith('/api/search/organizers', {
      params: { q: 'Club' },
    })
    expect(result).toEqual(data)
  })

  it('passes empty params by default', async () => {
    apiClientGetMock.mockResolvedValue({ data: { content: [] } })

    await searchOrganizers()

    expect(apiClientGetMock).toHaveBeenCalledWith('/api/search/organizers', { params: {} })
  })

  it('throws a friendly error on failure', async () => {
    apiClientGetMock.mockRejectedValue(new Error('network'))

    await expect(searchOrganizers({ q: 'Club' })).rejects.toThrow(
      'Impossible de rechercher les organisateurs.',
    )
  })
})

// ── cancelEvent with reason ───────────────────────────────────────────────────

describe('cancelEvent with reason', () => {
  beforeEach(() => vi.clearAllMocks())

  it('passes reason in the request body when provided', async () => {
    apiPatchMock.mockResolvedValue({ status: 'CANCELLED' })

    await cancelEvent('evt-1', 'Intervenant indisponible')

    expect(apiPatchMock).toHaveBeenCalledWith('/api/events/evt-1/cancel', {
      reason: 'Intervenant indisponible',
    })
  })
})

// ── fetchUserProfile — additional error paths ─────────────────────────────────

describe('fetchUserProfile — additional error paths', () => {
  beforeEach(() => vi.clearAllMocks())

  it('maps 404 to a profile-not-found error', async () => {
    apiGetMock.mockRejectedValue({ response: { status: 404 } })

    await expect(fetchUserProfile()).rejects.toThrow('Profil utilisateur non trouvé.')
  })

  it('uses the response message for unhandled status codes', async () => {
    apiGetMock.mockRejectedValue({
      response: { status: 500, data: { message: 'Erreur interne' } },
    })

    await expect(fetchUserProfile()).rejects.toThrow('Erreur interne')
  })

  it('falls back to generic message when response has no message', async () => {
    apiGetMock.mockRejectedValue({ response: { status: 500 } })

    await expect(fetchUserProfile()).rejects.toThrow('Impossible de récupérer votre profil.')
  })
})

// ── updateUserProfile — error path ───────────────────────────────────────────

describe('updateUserProfile — error path', () => {
  beforeEach(() => vi.clearAllMocks())

  it('maps API errors to a friendly message', async () => {
    apiPutMock.mockRejectedValue(new Error('network error'))

    await expect(updateUserProfile('user-1', { displayName: 'Jane' })).rejects.toThrow(
      'Impossible de mettre à jour votre profil.',
    )
  })
})
