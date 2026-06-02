import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../lib/apiServices', () => ({
  fetchEventDetail: vi.fn(),
}))

import * as apiServices from '../../lib/apiServices'
import OrganizerName from './OrganizerName'

function renderName(props) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <OrganizerName {...props} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('OrganizerName', () => {
  beforeEach(() => vi.clearAllMocks())

  it('resolves and links the organizer name from the event', async () => {
    apiServices.fetchEventDetail.mockResolvedValue({ organizerName: 'Club UNIGE' })
    renderName({ eventId: 'evt-1', organizerId: 'org-uuid-123456789' })
    const name = await screen.findByText('Club UNIGE')
    expect(name.closest('a')).toHaveAttribute('href', '/organizers/org-uuid-123456789')
  })

  it('falls back to a short organizer id when the event has no name', async () => {
    apiServices.fetchEventDetail.mockResolvedValue({})
    renderName({ eventId: 'evt-1', organizerId: 'org-uuid-123456789' })
    expect(await screen.findByText('org-uuid…')).toBeInTheDocument()
  })

  it('falls back to a short id when the event lookup fails', async () => {
    apiServices.fetchEventDetail.mockRejectedValue(new Error('not found'))
    renderName({ eventId: 'evt-1', organizerId: 'org-uuid-123456789' })
    expect(await screen.findByText('org-uuid…')).toBeInTheDocument()
  })
})
