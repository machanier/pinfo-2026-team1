import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import Footer, { FooterLink } from './Footer'

const renderLink = (props) =>
  render(
    <MemoryRouter>
      <FooterLink {...props} />
    </MemoryRouter>,
  )

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

describe('FooterLink', () => {
  it('renders an internal <Link> for a path starting with /', () => {
    renderLink({ label: 'Accueil', href: '/' })
    const link = screen.getByRole('link', { name: 'Accueil' })
    expect(link).toBeInTheDocument()
    expect(link).not.toHaveAttribute('target')
  })

  it('renders an external <a> with target and rel for an http href', () => {
    renderLink({ label: 'Site externe', href: 'https://example.com' })
    const link = screen.getByRole('link', { name: 'Site externe' })
    expect(link).toHaveAttribute('href', 'https://example.com')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noreferrer')
  })

  it('renders an <a> without target/rel for a non-http non-path href', () => {
    renderLink({ label: 'Mail', href: 'mailto:test@unige.ch' })
    const link = screen.getByRole('link', { name: 'Mail' })
    expect(link).toHaveAttribute('href', 'mailto:test@unige.ch')
    expect(link).not.toHaveAttribute('target')
  })
})
