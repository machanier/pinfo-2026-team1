/**
 * Preview / demo mode.
 *
 * Enabled on a deployed *preview* build by setting VITE_DEMO_MODE=true at
 * build time. In this mode the app injects a fictional identity and relaxes
 * the route guards so the whole site can be navigated WITHOUT an Auth0 login —
 * handy for showing the team a preview before anything reaches production.
 *
 * In local dev and normal production builds (VITE_DEMO_MODE unset) DEMO_MODE
 * is false and every consumer falls back to the real auth/data behaviour.
 */
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true'

// Role used for the fictional preview identity. Override with
// VITE_DEMO_ROLE=ORGANIZER (or ADMIN) to preview those views.
export const DEMO_ROLE = (import.meta.env.VITE_DEMO_ROLE || 'STUDENT').toUpperCase()

export const DEMO_USER = {
  name: 'Camille Démo',
  email: 'camille.demo@etu.unige.ch',
}
