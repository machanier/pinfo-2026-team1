import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AppContext } from './AppContextValue'
import { useApp } from './useApp'

function Probe() {
  const { displayName } = useApp()

  return <div>{displayName}</div>
}

describe('useApp', () => {
  it('throws when used outside AppProvider', () => {
    expect(() => render(<Probe />)).toThrow('useApp must be used within an AppProvider')
  })

  it('returns context value when used inside AppProvider', () => {
    render(
      <AppContext.Provider value={{ displayName: 'Tester' }}>
        <Probe />
      </AppContext.Provider>,
    )

    expect(screen.getByText('Tester')).toBeInTheDocument()
  })
})
