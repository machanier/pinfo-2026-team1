import { describe, it, expect, vi } from 'vitest'

// setupTests.js mocks this module globally (DEMO_MODE: false) so pages run in
// real-auth mode. Here we exercise the REAL implementation via importActual to
// cover its derivation logic.
describe('demoMode (real module)', () => {
  it('derives DEMO_MODE from import.meta.env.DEV (true under Vitest) and exposes defaults', async () => {
    const mod = await vi.importActual('./demoMode')
    expect(mod.DEMO_MODE).toBe(true)
    expect(mod.DEMO_ROLE).toBe('STUDENT')
    expect(mod.DEMO_USER).toMatchObject({
      name: expect.any(String),
      email: expect.any(String),
    })
  })
})
