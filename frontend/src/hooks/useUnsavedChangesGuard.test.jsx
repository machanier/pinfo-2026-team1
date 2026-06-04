import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useUnsavedChangesGuard } from './useUnsavedChangesGuard'

// Minimal host component: the hook + a plain in-app link to click.
function Harness({ when }) {
  useUnsavedChangesGuard(when)
  return <a href="/ailleurs">Lien interne</a>
}

function dispatchLinkClick(link) {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })
  link.dispatchEvent(event)
  return event
}

describe('useUnsavedChangesGuard', () => {
  afterEach(() => vi.restoreAllMocks())

  it('arms a beforeunload prompt while dirty', () => {
    render(<Harness when />)
    const event = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })

  it('does not arm beforeunload when clean', () => {
    render(<Harness when={false} />)
    const event = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })

  it('confirms and blocks an in-app link (sidebar/back link) when dirty', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<Harness when />)
    const event = dispatchLinkClick(screen.getByRole('link', { name: 'Lien interne' }))
    expect(confirmSpy).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(true) // navigation blocked
  })

  it('lets an in-app link through when the user confirms leaving', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<Harness when />)
    const event = dispatchLinkClick(screen.getByRole('link', { name: 'Lien interne' }))
    expect(confirmSpy).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(false) // navigation allowed
  })

  it('does not touch in-app links when clean', () => {
    const confirmSpy = vi.spyOn(window, 'confirm')
    render(<Harness when={false} />)
    const event = dispatchLinkClick(screen.getByRole('link', { name: 'Lien interne' }))
    expect(confirmSpy).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
  })

  it('confirms on the browser Back button (popstate) when dirty', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<Harness when />)
    window.dispatchEvent(new PopStateEvent('popstate'))
    expect(confirmSpy).toHaveBeenCalledTimes(1)
  })
})
