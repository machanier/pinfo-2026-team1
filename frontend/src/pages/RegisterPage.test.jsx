import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import RegisterPage from './RegisterPage'

describe('RegisterPage', () => {
  it('renders registration form with heading', () => {
    render(
      <BrowserRouter>
        <RegisterPage />
      </BrowserRouter>,
    )
    expect(screen.getByText('Inscription')).toBeInTheDocument()
  })

  it('displays account type selector with STUDENT and ORGANIZER options', () => {
    render(
      <BrowserRouter>
        <RegisterPage />
      </BrowserRouter>,
    )
    expect(screen.getByText('Student')).toBeInTheDocument()
    expect(screen.getByText('Organizer')).toBeInTheDocument()
  })

  it('displays form fields for student account type', () => {
    render(
      <BrowserRouter>
        <RegisterPage />
      </BrowserRouter>,
    )
    expect(screen.getByPlaceholderText('Ex: Alice Martin')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('alice@etu.univ.fr')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Informatique')).toBeInTheDocument()
  })

  it('displays error when fullName is empty and form is submitted', () => {
    render(
      <BrowserRouter>
        <RegisterPage />
      </BrowserRouter>,
    )
    const submitButton = screen.getByText('Créer mon compte')
    fireEvent.click(submitButton)
    expect(screen.getByText('Le nom complet est requis')).toBeInTheDocument()
  })

  it('displays error when password is too short', () => {
    render(
      <BrowserRouter>
        <RegisterPage />
      </BrowserRouter>,
    )
    const nameInput = screen.getByPlaceholderText('Ex: Alice Martin')
    fireEvent.change(nameInput, { target: { value: 'Alice Martin' } })
    const submitButton = screen.getByText('Créer mon compte')
    fireEvent.click(submitButton)
    expect(
      screen.getByText('Le mot de passe doit contenir au moins 8 caractères'),
    ).toBeInTheDocument()
  })

  it('switches from STUDENT to ORGANIZER account type', () => {
    render(
      <BrowserRouter>
        <RegisterPage />
      </BrowserRouter>,
    )
    const organizerButton = screen.getByText('Organizer')
    fireEvent.click(organizerButton)
    expect(screen.getByPlaceholderText('BDE Informatique')).toBeInTheDocument()
  })

  it('shows submit button', () => {
    render(
      <BrowserRouter>
        <RegisterPage />
      </BrowserRouter>,
    )
    expect(screen.getByText('Créer mon compte')).toBeInTheDocument()
  })

  it('clears error message when user fixes input', () => {
    render(
      <BrowserRouter>
        <RegisterPage />
      </BrowserRouter>,
    )
    const nameInput = screen.getByPlaceholderText('Ex: Alice Martin')
    fireEvent.change(nameInput, { target: { value: '' } })
    let submitButton = screen.getByText('Créer mon compte')
    fireEvent.click(submitButton)
    expect(screen.getByText('Le nom complet est requis')).toBeInTheDocument()

    fireEvent.change(nameInput, { target: { value: 'Alice Martin' } })
    // Error should be cleared when input is corrected
    expect(screen.queryByText('Le nom complet est requis')).not.toBeInTheDocument()
  })

  it('displays organization fields for ORGANIZER type', () => {
    render(
      <BrowserRouter>
        <RegisterPage />
      </BrowserRouter>,
    )
    const organizerButton = screen.getByText('Organizer')
    fireEvent.click(organizerButton)
    expect(screen.getByPlaceholderText('BDE Informatique')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Association étudiante')).toBeInTheDocument()
  })

  it('requires program for student account type', () => {
    render(
      <BrowserRouter>
        <RegisterPage />
      </BrowserRouter>,
    )
    const nameInput = screen.getByPlaceholderText('Ex: Alice Martin')
    fireEvent.change(nameInput, { target: { value: 'Alice' } })
    const submitButton = screen.getByText('Créer mon compte')
    fireEvent.click(submitButton)
    expect(screen.getByText('La filière est requise')).toBeInTheDocument()
  })

  it('shows invalid email error when email format is wrong', () => {
    render(
      <BrowserRouter>
        <RegisterPage />
      </BrowserRouter>,
    )

    fireEvent.change(screen.getByPlaceholderText('Ex: Alice Martin'), {
      target: { value: 'Alice Martin' },
    })
    fireEvent.change(screen.getByPlaceholderText('alice@etu.univ.fr'), {
      target: { value: 'alice@univ' },
    })
    fireEvent.change(screen.getByLabelText('Mot de passe *'), {
      target: { value: 'password123' },
    })
    fireEvent.change(screen.getByLabelText('Confirmation *'), {
      target: { value: 'password123' },
    })
    fireEvent.change(screen.getByPlaceholderText('Informatique'), {
      target: { value: 'Informatique' },
    })

    fireEvent.click(screen.getByText('Créer mon compte'))
    expect(screen.getByText('Email invalide')).toBeInTheDocument()
  })

  it('shows mismatch error when passwords differ', () => {
    render(
      <BrowserRouter>
        <RegisterPage />
      </BrowserRouter>,
    )

    fireEvent.change(screen.getByPlaceholderText('Ex: Alice Martin'), {
      target: { value: 'Alice Martin' },
    })
    fireEvent.change(screen.getByPlaceholderText('alice@etu.univ.fr'), {
      target: { value: 'alice@etu.univ.fr' },
    })
    fireEvent.change(screen.getByLabelText('Mot de passe *'), {
      target: { value: 'password123' },
    })
    fireEvent.change(screen.getByLabelText('Confirmation *'), {
      target: { value: 'password1234' },
    })
    fireEvent.change(screen.getByPlaceholderText('Informatique'), {
      target: { value: 'Informatique' },
    })

    fireEvent.click(screen.getByText('Créer mon compte'))
    expect(screen.getByText('Les mots de passe ne correspondent pas')).toBeInTheDocument()
  })

  it('requires organization fields for organizer account type', () => {
    render(
      <BrowserRouter>
        <RegisterPage />
      </BrowserRouter>,
    )

    fireEvent.click(screen.getByText('Organizer'))
    fireEvent.change(screen.getByPlaceholderText('Ex: Alice Martin'), {
      target: { value: 'Association Campus' },
    })
    fireEvent.change(screen.getByPlaceholderText('alice@etu.univ.fr'), {
      target: { value: 'contact@asso.unige.ch' },
    })
    fireEvent.change(screen.getByLabelText('Mot de passe *'), {
      target: { value: 'password123' },
    })
    fireEvent.change(screen.getByLabelText('Confirmation *'), {
      target: { value: 'password123' },
    })

    fireEvent.click(screen.getByText('Créer mon compte'))
    expect(screen.getByText("Le nom de l'organisation est requis")).toBeInTheDocument()
    expect(screen.getByText("Le type d'organisation est requis")).toBeInTheDocument()
  })

  it('shows success and resets form after valid submit', () => {
    vi.useFakeTimers()

    render(
      <BrowserRouter>
        <RegisterPage />
      </BrowserRouter>,
    )

    const fullNameInput = screen.getByPlaceholderText('Ex: Alice Martin')
    const emailInput = screen.getByPlaceholderText('alice@etu.univ.fr')
    const programInput = screen.getByPlaceholderText('Informatique')

    fireEvent.change(fullNameInput, { target: { value: 'Alice Martin' } })
    fireEvent.change(emailInput, { target: { value: 'alice@etu.univ.fr' } })
    fireEvent.change(screen.getByLabelText('Mot de passe *'), {
      target: { value: 'password123' },
    })
    fireEvent.change(screen.getByLabelText('Confirmation *'), {
      target: { value: 'password123' },
    })
    fireEvent.change(programInput, { target: { value: 'Informatique' } })

    fireEvent.click(screen.getByText('Créer mon compte'))
    expect(
      screen.getByText('Compte créé avec succès! Redirection vers la connexion...'),
    ).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(
      screen.queryByText('Compte créé avec succès! Redirection vers la connexion...'),
    ).not.toBeInTheDocument()
    expect(fullNameInput).toHaveValue('')
    expect(emailInput).toHaveValue('')
    expect(programInput).toHaveValue('')

    vi.useRealTimers()
  })
})
