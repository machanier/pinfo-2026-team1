/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import EventEditPage from './EventEditPage'

vi.mock('../lib/apiServices', () => ({
  fetchEventDetail: vi.fn(),
  updateEvent: vi.fn(),
}))

import * as apiServices from '../lib/apiServices'

const sampleEvent = {
  eventId: 'evt-1',
  title: 'Job Dating',
  category: 'Conférence',
  place: 'Amphi A',
  capacity: 200,
  time: '2026-09-01T09:00:00Z',
  endTime: null,
  description: 'Une description complète.',
  tags: ['tech', 'emploi'],
  restrictedTo: null,
}

function renderPage(id = 'evt-1') {
  return render(
    <MemoryRouter initialEntries={[`/events/edit/${id}`]}>
      <Routes>
        <Route path="/events/edit/:id" element={<EventEditPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('EventEditPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Loading / error states ─────────────────────────────────────────────

  it('shows loading state initially', () => {
    apiServices.fetchEventDetail.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByText(/Chargement/i)).toBeInTheDocument()
  })

  it('shows error state when fetchEventDetail fails', async () => {
    apiServices.fetchEventDetail.mockRejectedValue(new Error('Événement non trouvé.'))
    renderPage()
    expect(await screen.findByText('Événement non trouvé.')).toBeInTheDocument()
  })

  it('shows a back button on error', async () => {
    apiServices.fetchEventDetail.mockRejectedValue(new Error('Erreur réseau'))
    renderPage()
    await screen.findByText('Erreur réseau')
    expect(screen.getByRole('button', { name: /Retour/i })).toBeInTheDocument()
  })

  it('clicking the error-state Retour button does not throw', async () => {
    apiServices.fetchEventDetail.mockRejectedValue(new Error('Erreur réseau'))
    renderPage()
    await screen.findByText('Erreur réseau')
    fireEvent.click(screen.getByRole('button', { name: /Retour/i }))
    // navigate(-1) is called; no assertion beyond no-throw
    expect(screen.getByRole('button', { name: /Retour/i })).toBeInTheDocument()
  })

  // ── Pre-populated form ─────────────────────────────────────────────────

  it('renders the form with pre-populated title', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent)
    renderPage()
    expect(await screen.findByDisplayValue('Job Dating')).toBeInTheDocument()
  })

  it('pre-populates category, place, capacity, description', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent)
    renderPage()
    await screen.findByDisplayValue('Job Dating')
    expect(screen.getByDisplayValue('Conférence')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Amphi A')).toBeInTheDocument()
    expect(screen.getByDisplayValue('200')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Une description complète.')).toBeInTheDocument()
  })

  it('renders pre-existing tags as chips', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent)
    renderPage()
    await screen.findByDisplayValue('Job Dating')
    expect(screen.getByText('tech')).toBeInTheDocument()
    expect(screen.getByText('emploi')).toBeInTheDocument()
  })

  it('shows the page title "Éditer l\'événement"', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent)
    renderPage()
    expect(await screen.findByRole('heading', { name: /Éditer l/i })).toBeInTheDocument()
  })

  it('shows the submit button', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent)
    renderPage()
    expect(
      await screen.findByRole('button', { name: /Enregistrer les modifications/i }),
    ).toBeInTheDocument()
  })

  // ── Restriction pre-population ─────────────────────────────────────────

  it('checks the restriction checkbox when event has restrictedTo', async () => {
    apiServices.fetchEventDetail.mockResolvedValue({
      ...sampleEvent,
      restrictedTo: {
        faculties: ['Sciences'],
        majors: [],
        degreeLevels: ['MASTER'],
      },
    })
    renderPage()
    await screen.findByDisplayValue('Job Dating')
    const checkbox = screen.getByLabelText(/Restreindre/i)
    expect(checkbox).toBeChecked()
  })

  // ── Validation ─────────────────────────────────────────────────────────

  it('shows validation errors when submitting empty required fields', async () => {
    apiServices.fetchEventDetail.mockResolvedValue({
      ...sampleEvent,
      title: '',
      place: '',
      category: '',
      description: '',
      capacity: null,
      time: null,
    })
    renderPage()
    await screen.findByRole('button', { name: /Enregistrer les modifications/i })

    fireEvent.click(screen.getByRole('button', { name: /Enregistrer les modifications/i }))

    expect(await screen.findByText('Le titre est requis')).toBeInTheDocument()
  })

  // ── Confirmation dialog ────────────────────────────────────────────────

  it('shows confirmation dialog after valid submit', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent)
    renderPage()
    await screen.findByRole('button', { name: /Enregistrer les modifications/i })

    fireEvent.click(screen.getByRole('button', { name: /Enregistrer les modifications/i }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/Confirmer la mise à jour/i)).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /^Confirmer$/i })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /Annuler/i })).toBeInTheDocument()
  })

  it('closes confirmation dialog when clicking Annuler', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent)
    renderPage()
    await screen.findByRole('button', { name: /Enregistrer les modifications/i })

    fireEvent.click(screen.getByRole('button', { name: /Enregistrer les modifications/i }))
    const dialog = await screen.findByRole('dialog')

    fireEvent.click(within(dialog).getByRole('button', { name: /Annuler/i }))

    await waitFor(() =>
      expect(screen.queryByText(/Confirmer la mise à jour/i)).not.toBeInTheDocument(),
    )
  })

  it('calls updateEvent on confirmation', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent)
    apiServices.updateEvent.mockResolvedValue({})
    renderPage()
    await screen.findByRole('button', { name: /Enregistrer les modifications/i })

    fireEvent.click(screen.getByRole('button', { name: /Enregistrer les modifications/i }))
    await screen.findByText(/Confirmer la mise à jour/i)

    fireEvent.click(screen.getByRole('button', { name: /^Confirmer$/i }))

    await waitFor(() =>
      expect(apiServices.updateEvent).toHaveBeenCalledWith(
        'evt-1',
        expect.objectContaining({
          title: 'Job Dating',
          place: 'Amphi A',
        }),
      ),
    )
  })

  it('shows 403 error when updateEvent is rejected with 403', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent)
    const err = new Error('Forbidden')
    err.response = { status: 403 }
    apiServices.updateEvent.mockRejectedValue(err)
    renderPage()
    await screen.findByRole('button', { name: /Enregistrer les modifications/i })

    fireEvent.click(screen.getByRole('button', { name: /Enregistrer les modifications/i }))
    await screen.findByText(/Confirmer la mise à jour/i)
    fireEvent.click(screen.getByRole('button', { name: /^Confirmer$/i }))

    expect(await screen.findByText(/Accès refusé/i)).toBeInTheDocument()
  })

  it('shows 401 error when updateEvent is rejected with 401', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent)
    const err = new Error('Unauthorized')
    err.response = { status: 401 }
    apiServices.updateEvent.mockRejectedValue(err)
    renderPage()
    await screen.findByRole('button', { name: /Enregistrer les modifications/i })

    fireEvent.click(screen.getByRole('button', { name: /Enregistrer les modifications/i }))
    await screen.findByText(/Confirmer la mise à jour/i)
    fireEvent.click(screen.getByRole('button', { name: /^Confirmer$/i }))

    expect(await screen.findByText(/Session expirée/i)).toBeInTheDocument()
  })

  it('shows 404 error when updateEvent is rejected with 404', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent)
    const err = new Error('Not Found')
    err.response = { status: 404 }
    apiServices.updateEvent.mockRejectedValue(err)
    renderPage()
    await screen.findByRole('button', { name: /Enregistrer les modifications/i })

    fireEvent.click(screen.getByRole('button', { name: /Enregistrer les modifications/i }))
    await screen.findByText(/Confirmer la mise à jour/i)
    fireEvent.click(screen.getByRole('button', { name: /^Confirmer$/i }))

    expect(await screen.findByText(/Événement introuvable/i)).toBeInTheDocument()
  })

  it('shows generic error when updateEvent fails without a status code', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent)
    apiServices.updateEvent.mockRejectedValue(new Error('Erreur réseau inattendue'))
    renderPage()
    await screen.findByRole('button', { name: /Enregistrer les modifications/i })

    fireEvent.click(screen.getByRole('button', { name: /Enregistrer les modifications/i }))
    await screen.findByText(/Confirmer la mise à jour/i)
    fireEvent.click(screen.getByRole('button', { name: /^Confirmer$/i }))

    expect(await screen.findByText('Erreur réseau inattendue')).toBeInTheDocument()
  })

  // ── Tag management ─────────────────────────────────────────────────────

  it('removes a tag when clicking its remove button', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent)
    renderPage()
    await screen.findByText('tech')

    fireEvent.click(screen.getByLabelText('Supprimer le tag tech'))

    await waitFor(() => expect(screen.queryByText('tech')).not.toBeInTheDocument())
    expect(screen.getByText('emploi')).toBeInTheDocument()
  })

  it('adds a tag on Enter key', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent)
    renderPage()
    await screen.findByDisplayValue('Job Dating')

    const tagInput = screen.getByPlaceholderText(/emploi, tech/i)
    fireEvent.change(tagInput, { target: { value: 'nouveau' } })
    fireEvent.keyDown(tagInput, { key: 'Enter' })

    expect(screen.getByText('nouveau')).toBeInTheDocument()
  })

  // ── Cancel / navigate back ─────────────────────────────────────────────

  it('shows an Annuler button that navigates back', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent)
    renderPage()
    await screen.findByRole('button', { name: /Enregistrer les modifications/i })
    expect(screen.getByRole('button', { name: /^Annuler$/i })).toBeInTheDocument()
  })

  it('clicking the form Annuler button does not throw', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent)
    renderPage()
    await screen.findByRole('button', { name: /^Annuler$/i })
    fireEvent.click(screen.getByRole('button', { name: /^Annuler$/i }))
    // navigate(-1) is called; the button was in the DOM
    expect(screen.queryByRole('button', { name: /^Annuler$/i })).toBeInTheDocument()
  })
})
