import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import RegisterPage from './RegisterPage'

describe('RegisterPage', () => {
  beforeEach(() => {
    // Reset component state before each test
  })

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
})
