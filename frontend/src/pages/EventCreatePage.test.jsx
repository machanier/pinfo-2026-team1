import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import EventCreatePage from './EventCreatePage'

const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }))
const { mockCreateEvent } = vi.hoisted(() => ({ mockCreateEvent: vi.fn() }))
const { mockUpdateEvent } = vi.hoisted(() => ({ mockUpdateEvent: vi.fn() }))
const { MOCK_BANNER_URL } = vi.hoisted(() => ({
  MOCK_BANNER_URL: 'https://res.cloudinary.com/testcloud/image/upload/v1/banner.jpg',
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../lib/apiServices', () => ({
  createEvent: mockCreateEvent,
  updateEvent: mockUpdateEvent,
}))

// Stub BannerUpload to avoid Cloudinary upload complexity in page-level tests.
// The mock exposes a button that, when clicked, sets the banner URL via onChange.
vi.mock('../components/event/BannerUpload', () => ({
  default: ({ onChange }) => (
    <button type="button" onClick={() => onChange(MOCK_BANNER_URL)}>
      Set banner
    </button>
  ),
}))

function renderPage() {
  return render(
    <BrowserRouter>
      <EventCreatePage />
    </BrowserRouter>,
  )
}

function fillRequiredFields({ title = 'My Event', startTime = '2026-06-10T14:00' } = {}) {
  fireEvent.change(screen.getByPlaceholderText('Ex: Job Dating Tech'), {
    target: { value: title },
  })
  fireEvent.change(screen.getByPlaceholderText('Conf\u00e9rence'), {
    target: { value: 'Workshop' },
  })
  fireEvent.change(screen.getByPlaceholderText('Amphi A'), { target: { value: 'Salle A' } })
  fireEvent.change(screen.getByPlaceholderText('200'), { target: { value: '50' } })
  fireEvent.change(screen.getByLabelText(/Date et heure de début/i), {
    target: { value: startTime },
  })
  fireEvent.change(
    screen.getByPlaceholderText('Programme, intervenants, informations pratiques...'),
    { target: { value: 'Description' } },
  )
}

describe('EventCreatePage', () => {
  it('renders event creation form with heading', () => {
    renderPage()
    expect(screen.getByText("Cr\u00e9ation d'un \u00e9v\u00e9nement")).toBeInTheDocument()
  })

  it('displays all required form fields', () => {
    renderPage()
    expect(screen.getByPlaceholderText('Ex: Job Dating Tech')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Conf\u00e9rence')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Amphi A')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('200')).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText('Programme, intervenants, informations pratiques...'),
    ).toBeInTheDocument()
  })

  it('displays error when title is missing', () => {
    renderPage()
    fireEvent.click(screen.getByText("Publier l'\u00e9v\u00e9nement"))
    expect(screen.getByText('Le titre est requis')).toBeInTheDocument()
  })

  it('displays error when capacity is missing', () => {
    renderPage()
    fireEvent.change(screen.getByPlaceholderText('Ex: Job Dating Tech'), {
      target: { value: 'Test Event' },
    })
    fireEvent.click(screen.getByText("Publier l'\u00e9v\u00e9nement"))
    expect(screen.getByText('La capacit\u00e9 doit \u00eatre \u2265 1')).toBeInTheDocument()
  })

  it('displays error when description is missing', () => {
    renderPage()
    fireEvent.change(screen.getByPlaceholderText('Ex: Job Dating Tech'), {
      target: { value: 'Test Event' },
    })
    fireEvent.change(screen.getByPlaceholderText('Conf\u00e9rence'), {
      target: { value: 'Workshop' },
    })
    fireEvent.click(screen.getByText("Publier l'\u00e9v\u00e9nement"))
    expect(screen.getByText('La description est requise')).toBeInTheDocument()
  })

  it('clears error message when user corrects input', () => {
    renderPage()
    const titleInput = screen.getByPlaceholderText('Ex: Job Dating Tech')
    fireEvent.change(titleInput, { target: { value: '' } })
    fireEvent.click(screen.getByText("Publier l'\u00e9v\u00e9nement"))
    expect(screen.getByText('Le titre est requis')).toBeInTheDocument()
    fireEvent.change(titleInput, { target: { value: 'Test Event' } })
    expect(screen.queryByText('Le titre est requis')).not.toBeInTheDocument()
  })

  it('displays submit button with proper text', () => {
    renderPage()
    expect(screen.getByText("Publier l'\u00e9v\u00e9nement")).toBeInTheDocument()
  })

  it('displays success message when form has no errors (simple check)', () => {
    renderPage()
    fireEvent.change(screen.getByPlaceholderText('Ex: Job Dating Tech'), {
      target: { value: 'Tech Talk' },
    })
    fireEvent.change(screen.getByPlaceholderText('Conf\u00e9rence'), {
      target: { value: 'Workshop' },
    })
    fireEvent.change(screen.getByPlaceholderText('Amphi A'), { target: { value: 'Room 101' } })
    fireEvent.change(screen.getByPlaceholderText('200'), { target: { value: '50' } })
    fireEvent.change(
      screen.getByPlaceholderText('Programme, intervenants, informations pratiques...'),
      { target: { value: 'A great event' } },
    )
    const submitButton = screen.getByText("Publier l'\u00e9v\u00e9nement")
    fireEvent.click(submitButton)
    expect(submitButton).toBeInTheDocument()
  })

  it('requires all fields to be filled', () => {
    renderPage()
    fireEvent.click(screen.getByText("Publier l'\u00e9v\u00e9nement"))
    expect(screen.getByText('Le titre est requis')).toBeInTheDocument()
    expect(screen.getByText('La cat\u00e9gorie est requise')).toBeInTheDocument()
    expect(screen.getByText('Le lieu est requis')).toBeInTheDocument()
  })

  it('shows date required error', () => {
    renderPage()
    fireEvent.change(screen.getByPlaceholderText('Ex: Job Dating Tech'), {
      target: { value: 'My Event' },
    })
    fireEvent.change(screen.getByPlaceholderText('Conf\u00e9rence'), {
      target: { value: 'Workshop' },
    })
    fireEvent.change(screen.getByPlaceholderText('Amphi A'), { target: { value: 'Salle A' } })
    fireEvent.change(screen.getByPlaceholderText('200'), { target: { value: '30' } })
    fireEvent.change(
      screen.getByPlaceholderText('Programme, intervenants, informations pratiques...'),
      { target: { value: 'Description here' } },
    )
    fireEvent.click(screen.getByText("Publier l'\u00e9v\u00e9nement"))
    expect(screen.getByText('La date et heure de début est requise')).toBeInTheDocument()
  })

  it('shows endTime validation error when end is before start', () => {
    renderPage()
    fireEvent.change(screen.getByLabelText(/Date et heure de début/i), {
      target: { value: '2026-06-10T14:00' },
    })
    fireEvent.change(screen.getByLabelText(/Date et heure de fin/i), {
      target: { value: '2026-06-10T13:00' },
    })
    fillRequiredFields()
    fireEvent.click(screen.getByText("Publier l'\u00e9v\u00e9nement"))
    expect(screen.getByText('La date de fin doit être après la date de début')).toBeInTheDocument()
  })

  it('adds a tag when Enter is pressed', () => {
    renderPage()
    const tagInput = screen.getByPlaceholderText('emploi, tech, networking...')
    fireEvent.change(tagInput, { target: { value: 'javascript' } })
    fireEvent.keyDown(tagInput, { key: 'Enter' })
    expect(screen.getByText('javascript')).toBeInTheDocument()
  })

  it('does not add duplicate tags', () => {
    renderPage()
    const tagInput = screen.getByPlaceholderText('emploi, tech, networking...')
    fireEvent.change(tagInput, { target: { value: 'javascript' } })
    fireEvent.keyDown(tagInput, { key: 'Enter' })
    fireEvent.change(tagInput, { target: { value: 'javascript' } })
    fireEvent.keyDown(tagInput, { key: 'Enter' })
    expect(screen.getAllByText('javascript')).toHaveLength(1)
  })

  it('removes a tag when x is clicked', () => {
    renderPage()
    const tagInput = screen.getByPlaceholderText('emploi, tech, networking...')
    fireEvent.change(tagInput, { target: { value: 'react' } })
    fireEvent.keyDown(tagInput, { key: 'Enter' })
    expect(screen.getByText('react')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Supprimer le tag react'))
    expect(screen.queryByText('react')).not.toBeInTheDocument()
  })

  it('toggles the restriction checkbox and shows restriction fields', () => {
    renderPage()
    expect(screen.queryByText('Facultés autorisées')).not.toBeInTheDocument()
    fireEvent.click(screen.getByLabelText("Restreindre l'accès aux inscriptions"))
    expect(screen.getByText(/Facultés autorisées/i)).toBeInTheDocument()
    expect(screen.getByText(/Niveaux de diplôme/i)).toBeInTheDocument()
  })

  it('selects a faculty and shows its majors', () => {
    renderPage()
    fireEvent.click(screen.getByLabelText("Restreindre l'accès aux inscriptions"))
    fireEvent.click(screen.getByLabelText('Faculte des sciences'))
    expect(screen.getByLabelText('Mathematiques')).toBeInTheDocument()
    expect(screen.getByLabelText('Sciences informatiques')).toBeInTheDocument()
  })

  it('deselecting a faculty removes its majors', () => {
    renderPage()
    fireEvent.click(screen.getByLabelText("Restreindre l'accès aux inscriptions"))
    fireEvent.click(screen.getByLabelText('Faculte des sciences'))
    expect(screen.getByLabelText('Mathematiques')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Faculte des sciences'))
    expect(screen.queryByLabelText('Mathematiques')).not.toBeInTheDocument()
  })

  it('toggles a degree level', () => {
    renderPage()
    fireEvent.click(screen.getByLabelText("Restreindre l'accès aux inscriptions"))
    const bachelorCheckbox = screen.getByLabelText('Bachelor')
    expect(bachelorCheckbox).not.toBeChecked()
    fireEvent.click(bachelorCheckbox)
    expect(bachelorCheckbox).toBeChecked()
    fireEvent.click(bachelorCheckbox)
    expect(bachelorCheckbox).not.toBeChecked()
  })

  it('navigates to /my-events on successful submit', async () => {
    mockCreateEvent.mockResolvedValue({})
    renderPage()
    fillRequiredFields()
    fireEvent.click(screen.getByText("Publier l'\u00e9v\u00e9nement"))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/my-events'))
  })

  it('shows 403 error message on submit', async () => {
    mockCreateEvent.mockRejectedValue(
      Object.assign(new Error(), { cause: { response: { status: 403 } } }),
    )
    renderPage()
    fillRequiredFields()
    fireEvent.click(screen.getByText("Publier l'\u00e9v\u00e9nement"))
    expect(
      await screen.findByText("Acces refuse : votre compte n'a pas le role ORGANIZER."),
    ).toBeInTheDocument()
  })

  it('shows 401 error message on submit', async () => {
    mockCreateEvent.mockRejectedValue(
      Object.assign(new Error(), { cause: { response: { status: 401 } } }),
    )
    renderPage()
    fillRequiredFields()
    fireEvent.click(screen.getByText("Publier l'\u00e9v\u00e9nement"))
    expect(
      await screen.findByText('Session expiree. Veuillez vous reconnecter.'),
    ).toBeInTheDocument()
  })

  it('shows generic error message on submit', async () => {
    mockCreateEvent.mockRejectedValue(new Error('Unexpected error'))
    renderPage()
    fillRequiredFields()
    fireEvent.click(screen.getByText("Publier l'\u00e9v\u00e9nement"))
    expect(await screen.findByText('Unexpected error')).toBeInTheDocument()
  })

  it('navigates back when cancel is clicked', () => {
    renderPage()
    fireEvent.click(screen.getByText('Annuler'))
    expect(mockNavigate).toHaveBeenCalledWith(-1)
  })

  // ── Banner image upload ────────────────────────────────────────────────────

  it('does NOT call updateEvent when no banner is set', async () => {
    mockCreateEvent.mockResolvedValue({ eventId: 'new-evt-1' })
    renderPage()
    fillRequiredFields()
    fireEvent.click(screen.getByText("Publier l'\u00e9v\u00e9nement"))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/my-events'))
    expect(mockUpdateEvent).not.toHaveBeenCalled()
  })

  it('calls updateEvent with bannerImageUrl after create when banner is set', async () => {
    mockCreateEvent.mockResolvedValue({ eventId: 'new-evt-1' })
    mockUpdateEvent.mockResolvedValue({})
    renderPage()
    fireEvent.click(screen.getByText('Set banner'))
    fillRequiredFields()
    fireEvent.click(screen.getByText("Publier l'\u00e9v\u00e9nement"))
    await waitFor(() =>
      expect(mockUpdateEvent).toHaveBeenCalledWith('new-evt-1', {
        bannerImageUrl: MOCK_BANNER_URL,
      }),
    )
    expect(mockNavigate).toHaveBeenCalledWith('/my-events')
  })
})
