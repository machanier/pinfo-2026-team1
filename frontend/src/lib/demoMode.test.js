import { describe, it, expect, vi } from 'vitest'

// setupTests.js mocks this module globally (DEMO_MODE: false) so pages run in
// real-auth mode. Here we exercise the REAL implementation via importActual to
// cover its derivation logic.
describe('demoMode (real module)', () => {
  it('DEMO_MODE is false by default in dev (only VITE_DEMO_MODE=true enables it)', async () => {
    const mod = await vi.importActual('./demoMode')
    // DEV no longer activates demo mode — requires explicit VITE_DEMO_MODE=true.
    expect(mod.DEMO_MODE).toBe(false)
    expect(mod.DEMO_ROLE).toBe('STUDENT')
    expect(mod.DEMO_USER).toMatchObject({
      name: expect.any(String),
      email: expect.any(String),
    })
  })
})
