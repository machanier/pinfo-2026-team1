import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Badge from './badge'
import Button from './button'

describe('UI atoms', () => {
  it('renders Badge with custom class', () => {
    render(<Badge className="custom-badge">New</Badge>)

    const badge = screen.getByText('New')
    expect(badge.tagName).toBe('SPAN')
    expect(badge.className).toMatch(/custom-badge/)
  })

  it('renders Button with default variant classes', () => {
    render(<Button>Save</Button>)

    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toHaveAttribute('type', 'button')
    expect(button.className).toMatch(/bg-black text-white/)
  })

  it('renders Button with ghost variant classes', () => {
    render(
      <Button variant="ghost" type="submit">
        Cancel
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'Cancel' })
    expect(button).toHaveAttribute('type', 'submit')
    expect(button.className).toMatch(/bg-transparent text-gray-700/)
  })
})
