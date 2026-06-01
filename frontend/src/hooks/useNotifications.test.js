/**
 * @vitest-environment jsdom
 */
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { createElement } from 'react'
import {
  useUnreadCount,
  useNotifications,
  useNotificationPreferences,
  MOCK_NOTIFICATIONS,
  MOCK_PREFERENCES,
} from './useNotifications'

// ---------------------------------------------------------------------------
// Mock apiServices
// ---------------------------------------------------------------------------

vi.mock('../lib/apiServices', () => ({
  fetchUnreadNotificationsCount: vi.fn(),
  fetchNotifications: vi.fn(),
  fetchNotificationPreferences: vi.fn(),
  markNotificationAsRead: vi.fn(),
  markAllNotificationsAsRead: vi.fn(),
  updateNotificationPreferences: vi.fn(),
}))

import {
  fetchUnreadNotificationsCount,
  fetchNotifications,
  fetchNotificationPreferences,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  updateNotificationPreferences,
} from '../lib/apiServices'

// ---------------------------------------------------------------------------
// Helper: wrapper with fresh QueryClient per test
// ---------------------------------------------------------------------------

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
  return ({ children }) => createElement(QueryClientProvider, { client: queryClient }, children)
}

// ---------------------------------------------------------------------------
// useUnreadCount
// ---------------------------------------------------------------------------

describe('useUnreadCount', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns the count from the API', async () => {
    fetchUnreadNotificationsCount.mockResolvedValue({ count: 7 })

    const { result } = renderHook(() => useUnreadCount(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.data).toBe(7))
  })

  it('returns 0 silently when the API fails', async () => {
    fetchUnreadNotificationsCount.mockRejectedValue(new Error('Service down'))

    const { result } = renderHook(() => useUnreadCount(), { wrapper: makeWrapper() })

    // placeholderData kicks in immediately
    expect(result.current.data).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// useNotifications
// ---------------------------------------------------------------------------

describe('useNotifications', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns paginated data from the API', async () => {
    const apiData = {
      content: [
        {
          notificationId: 'n1',
          type: 'REMINDER',
          body: 'Hello',
          read: false,
          createdAt: new Date().toISOString(),
        },
      ],
      page: 0,
      totalPages: 1,
      totalElements: 1,
      unreadCount: 1,
    }
    fetchNotifications.mockResolvedValue(apiData)

    const { result } = renderHook(() => useNotifications(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toEqual(apiData)
    expect(result.current.isMock).toBe(false)
  })

  it('falls back to MOCK_NOTIFICATIONS when API fails', async () => {
    fetchNotifications.mockRejectedValue(new Error('503'))

    const { result } = renderHook(() => useNotifications(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.isMock).toBe(true)
    expect(result.current.data?.content).toHaveLength(MOCK_NOTIFICATIONS.content.length)
  })

  it('filters mock content to unread-only when read=false', async () => {
    fetchNotifications.mockRejectedValue(new Error('503'))

    const { result } = renderHook(() => useNotifications({ read: false }), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isMock).toBe(true))
    expect(result.current.data?.content.every((n) => !n.read)).toBe(true)
  })

  it('filters mock content to read-only when read=true', async () => {
    fetchNotifications.mockRejectedValue(new Error('503'))

    const { result } = renderHook(() => useNotifications({ read: true }), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isMock).toBe(true))
    expect(result.current.data?.content.every((n) => n.read)).toBe(true)
  })

  it('does not expose isError when backend fails (masked by mock)', async () => {
    fetchNotifications.mockRejectedValue(new Error('503'))

    const { result } = renderHook(() => useNotifications(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isMock).toBe(true))
    expect(result.current.isError).toBe(false)
  })

  it('calls markNotificationAsRead via markRead()', async () => {
    fetchNotifications.mockResolvedValue({
      content: [],
      unreadCount: 0,
      page: 0,
      totalPages: 1,
      totalElements: 0,
    })
    markNotificationAsRead.mockResolvedValue({})

    const { result } = renderHook(() => useNotifications(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    result.current.markRead('notif-99')
    await waitFor(() => expect(markNotificationAsRead.mock.calls[0]?.[0]).toBe('notif-99'))
  })

  it('calls markAllNotificationsAsRead via markAllRead()', async () => {
    fetchNotifications.mockResolvedValue({
      content: [],
      unreadCount: 0,
      page: 0,
      totalPages: 1,
      totalElements: 0,
    })
    markAllNotificationsAsRead.mockResolvedValue({})

    const { result } = renderHook(() => useNotifications(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    result.current.markAllRead()
    await waitFor(() => expect(markAllNotificationsAsRead).toHaveBeenCalledTimes(1))
  })
})

// ---------------------------------------------------------------------------
// useNotificationPreferences
// ---------------------------------------------------------------------------

describe('useNotificationPreferences', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns preferences from the API', async () => {
    const apiPrefs = { emailEnabled: false, reminderLeadTimeHours: 12 }
    fetchNotificationPreferences.mockResolvedValue(apiPrefs)

    const { result } = renderHook(() => useNotificationPreferences(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toEqual(apiPrefs)
    expect(result.current.isMock).toBe(false)
  })

  it('falls back to MOCK_PREFERENCES when API fails', async () => {
    fetchNotificationPreferences.mockRejectedValue(new Error('503'))

    const { result } = renderHook(() => useNotificationPreferences(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.isMock).toBe(true)
    expect(result.current.data).toEqual(MOCK_PREFERENCES)
  })

  it('does not expose isError when backend fails', async () => {
    fetchNotificationPreferences.mockRejectedValue(new Error('503'))

    const { result } = renderHook(() => useNotificationPreferences(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isMock).toBe(true))
    expect(result.current.isError).toBe(false)
  })

  it('calls updateNotificationPreferences via update()', async () => {
    fetchNotificationPreferences.mockResolvedValue(MOCK_PREFERENCES)
    const updated = { ...MOCK_PREFERENCES, emailEnabled: false }
    updateNotificationPreferences.mockResolvedValue(updated)

    const { result } = renderHook(() => useNotificationPreferences(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    result.current.update(updated)
    await waitFor(() => expect(updateNotificationPreferences.mock.calls[0]?.[0]).toEqual(updated))
  })
})
