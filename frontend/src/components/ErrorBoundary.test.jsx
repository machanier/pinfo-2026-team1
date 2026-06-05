import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ErrorBoundary from './ErrorBoundary'

function ProblemChild() {
  throw new Error('Erreur de rendu test')
}

function EmptyMessageChild() {
  throw new Error('')
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <p>Contenu OK</p>
      </ErrorBoundary>,
    )

    expect(screen.getByText('Contenu OK')).toBeInTheDocument()
  })

  it('renders fallback UI when a child throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>,
    )

    expect(screen.getByText("Une erreur s'est produite")).toBeInTheDocument()
    expect(screen.getByText('Erreur de rendu test')).toBeInTheDocument()
    expect(screen.getByText('Recharger la page')).toBeInTheDocument()
  })

  it('uses default fallback message when error message is empty', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <EmptyMessageChild />
      </ErrorBoundary>,
    )

    expect(screen.getByText("Une erreur inattendue s'est produite.")).toBeInTheDocument()
  })

  it('calls window.location.reload when Recharger la page button is clicked', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const reloadMock = vi.fn()
    vi.spyOn(window, 'location', 'get').mockReturnValue({ ...window.location, reload: reloadMock })

    render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>,
    )

    fireEvent.click(screen.getByText('Recharger la page'))
    expect(reloadMock).toHaveBeenCalledTimes(1)
  })
})
