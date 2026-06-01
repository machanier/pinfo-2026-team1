import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import AboutPage from './AboutPage'
import ContactPage from './ContactPage'
import HelpPage from './HelpPage'
import PrivacyPage from './PrivacyPage'

describe('Static info pages', () => {
  it('AboutPage renders its heading and the student-project blurb', () => {
    render(<AboutPage />)
    expect(screen.getByRole('heading', { name: 'À propos' })).toBeInTheDocument()
    expect(screen.getByText(/projet étudiant/i)).toBeInTheDocument()
  })

  it('ContactPage renders the email and the address', () => {
    render(<ContactPage />)
    expect(screen.getByRole('heading', { name: 'Contact' })).toBeInTheDocument()
    expect(screen.getByText('contact@unigevents.ch')).toBeInTheDocument()
    expect(screen.getByText(/Général-Dufour/)).toBeInTheDocument()
  })

  it('HelpPage renders the FAQ questions', () => {
    render(<HelpPage />)
    expect(screen.getByRole('heading', { name: /Aide/ })).toBeInTheDocument()
    expect(screen.getByText(/Comment m'inscrire à un événement/)).toBeInTheDocument()
    expect(screen.getByText(/Comment retrouver mes inscriptions/)).toBeInTheDocument()
  })

  it('PrivacyPage renders its heading and the no-resale statement', () => {
    render(<PrivacyPage />)
    expect(screen.getByRole('heading', { name: 'Confidentialité' })).toBeInTheDocument()
    expect(screen.getByText(/jamais revendues/i)).toBeInTheDocument()
  })
})
