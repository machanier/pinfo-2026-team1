import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import NotificationPreferencesPage from './NotificationPreferencesPage'

const usePrefsMock = vi.hoisted(() => vi.fn())

vi.mock('../hooks/useNotifications', () => ({
  useNotificationPreferences: () => usePrefsMock(),
}))

const basePrefs = {
  emailEnabled: true,
  emailOnAnnouncement: true,
  emailOnEventUpdate: true,
  emailOnEventCancellation: true,
  emailOnRegistrationConfirmed: true,
  emailOnFreeSlot: false,
  reminderLeadTimeHours: 24,
}

const defaultHook = {
  data: basePrefs,
  isLoading: false,
  error: null,
  isMock: false,
  update: vi.fn(),
  isUpdating: false,
  isUpdateSuccess: false,
  updateError: null,
}

function renderPage() {
  return render(
    <MemoryRouter>
      <NotificationPreferencesPage />
    </MemoryRouter>,
  )
}

describe('NotificationPreferencesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    usePrefsMock.mockReturnValue(defaultHook)
  })

  it('renders the heading and a back link to the notifications page', () => {
    renderPage()
    expect(
      screen.getByRole('heading', { name: /Préférences de notification/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Retour aux notifications/i })).toHaveAttribute(
      'href',
      '/notifications',
    )
  })

  it('shows a loading spinner while preferences load', () => {
    usePrefsMock.mockReturnValue({ ...defaultHook, isLoading: true, data: undefined })
    renderPage()
    expect(screen.queryByText(/Activer les emails/i)).not.toBeInTheDocument()
  })

  it('shows an error message when preferences fail to load', () => {
    usePrefsMock.mockReturnValue({ ...defaultHook, error: new Error('boom'), data: undefined })
    renderPage()
    expect(screen.getByText(/Impossible de charger les préférences/i)).toBeInTheDocument()
  })

  it('disables every per-type toggle when the master switch is off', () => {
    usePrefsMock.mockReturnValue({ ...defaultHook, data: { ...basePrefs, emailEnabled: false } })
    renderPage()
    const switches = screen.getAllByRole('switch')
    expect(switches[0]).not.toBeDisabled() // master stays interactive
    switches.slice(1).forEach((s) => expect(s).toBeDisabled())
  })

  it('keeps per-type toggles enabled when the master switch is on', () => {
    renderPage()
    screen
      .getAllByRole('switch')
      .slice(1)
      .forEach((s) => expect(s).not.toBeDisabled())
  })

  it('disables the sub-toggles live when the master switch is turned off', () => {
    renderPage()
    expect(screen.getAllByRole('switch')[1]).not.toBeDisabled()
    fireEvent.click(screen.getAllByRole('switch')[0]) // turn master off
    screen
      .getAllByRole('switch')
      .slice(1)
      .forEach((s) => expect(s).toBeDisabled())
  })

  it('enables Save only after a change, then calls update', () => {
    const update = vi.fn()
    usePrefsMock.mockReturnValue({ ...defaultHook, update })
    renderPage()
    const save = screen.getByRole('button', { name: 'Enregistrer' })
    expect(save).toBeDisabled() // pristine
    fireEvent.click(screen.getAllByRole('switch')[0])
    expect(save).not.toBeDisabled()
    fireEvent.click(save)
    expect(update).toHaveBeenCalledTimes(1)
  })

  it('changes the reminder lead time (0 = Désactivé)', () => {
    renderPage()
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: '0' } })
    expect(select.value).toBe('0')
    expect(screen.getByRole('option', { name: 'Désactivé' }).selected).toBe(true)
  })

  it('shows a success message after a successful save', () => {
    usePrefsMock.mockReturnValue({ ...defaultHook, isUpdateSuccess: true })
    renderPage()
    expect(screen.getByText(/Préférences enregistrées/i)).toBeInTheDocument()
  })

  it('shows an error message when saving fails', () => {
    usePrefsMock.mockReturnValue({ ...defaultHook, updateError: new Error('save failed') })
    renderPage()
    expect(screen.getByText(/Échec de l'enregistrement/i)).toBeInTheDocument()
  })

  it('warns when the notification service is unavailable', () => {
    usePrefsMock.mockReturnValue({ ...defaultHook, isMock: true })
    renderPage()
    expect(screen.getByText(/Service indisponible/i)).toBeInTheDocument()
  })
})
