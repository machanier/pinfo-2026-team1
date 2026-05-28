import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import Footer from './Footer'

const renderFooter = () =>
  render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>,
  )

describe('Footer', () => {
  it('renders the brand logo and tagline', () => {
    renderFooter()
    expect(screen.getByAltText('UNIGEvents logo')).toBeInTheDocument()
    expect(screen.getByText(/réunis en un seul endroit/)).toBeInTheDocument()
  })

  it('renders the link columns and their internal links', () => {
    renderFooter()
    expect(screen.getByText('Explorer')).toBeInTheDocument()
    expect(screen.getByText('Mon espace')).toBeInTheDocument()
    expect(screen.getByText('Ressources')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'À propos' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Mes inscriptions' })).toBeInTheDocument()
  })

  it('renders the social links with accessible labels', () => {
    renderFooter()
    expect(screen.getByRole('link', { name: 'GitHub' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Instagram' })).toBeInTheDocument()
  })

  it('renders the current-year copyright', () => {
    renderFooter()
    const year = new Date().getFullYear()
    expect(screen.getByText(new RegExp(`© ${year} UNIGEvents`))).toBeInTheDocument()
  })
})
