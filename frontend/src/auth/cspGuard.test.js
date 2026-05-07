// PINFO-219 — pin the CSP that mitigates the localStorage Auth0 token risk.
//
// Auth0ProviderWithConfig deliberately uses cacheLocation: 'localstorage'
// (see the long-form trade-off comment in that file). The mitigation is the
// CSP shipped from frontend/nginx.conf: any script that wants to read the
// access token from localStorage has to come from our own bundle, because
// `script-src` is restricted to `'self'` (no `'unsafe-inline'`, no
// `'unsafe-eval'`, no third-party origins).
//
// If a future PR ever loosens that directive — for example by adding
// `'unsafe-inline'` to enable an analytics snippet, or by allow-listing a
// third-party CDN under script-src — the localStorage exposure becomes a
// real XSS gateway. This regression test grep-asserts the nginx config to
// make that diff impossible to land silently.

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'

// __dirname doesn't exist in ESM; reconstruct it from import.meta.url.
const here = dirname(fileURLToPath(import.meta.url))
const NGINX_CONF = resolve(here, '../../nginx.conf')

function extractScriptSrc(csp) {
  // CSP directives are separated by `;`. Find the script-src directive (or
  // default-src as fallback per CSP semantics).
  const directives = csp.split(';').map((d) => d.trim())
  const scriptSrc = directives.find((d) => d.startsWith('script-src '))
  return scriptSrc ?? directives.find((d) => d.startsWith('default-src '))
}

describe('PINFO-219: CSP regression guard', () => {
  const conf = readFileSync(NGINX_CONF, 'utf8')

  // Pull every `add_header Content-Security-Policy "<value>"` occurrence —
  // there are TWO blocks in nginx.conf (parent + static-asset location)
  // and both must keep the same hardening.
  const cspMatches = [...conf.matchAll(/add_header\s+Content-Security-Policy\s+"([^"]+)"/g)]

  it('declares a CSP in every server context', () => {
    // Parent server block + static-asset location block.
    expect(cspMatches.length).toBeGreaterThanOrEqual(2)
  })

  cspMatches.forEach((match, idx) => {
    const csp = match[1]
    const scriptSrc = extractScriptSrc(csp)

    describe(`CSP block #${idx + 1}`, () => {
      it("script-src restricts to 'self' only", () => {
        expect(scriptSrc).toBeTruthy()
        // 'self' must be present.
        expect(scriptSrc).toMatch(/'self'/)
        // No third-party hostnames whitelisted under script-src.
        // (The directive should NOT contain http(s):// schemes.)
        expect(scriptSrc).not.toMatch(/https?:\/\//)
      })

      it("script-src must NOT allow 'unsafe-inline' (would defeat localStorage XSS mitigation)", () => {
        expect(scriptSrc).not.toMatch(/'unsafe-inline'/)
      })

      it("script-src must NOT allow 'unsafe-eval'", () => {
        expect(scriptSrc).not.toMatch(/'unsafe-eval'/)
      })

      it("frame-ancestors stays 'none' (no clickjacking against the SPA)", () => {
        expect(csp).toMatch(/frame-ancestors\s+'none'/)
      })

      it("base-uri stays 'self' (no <base> hijack to redirect relative URLs)", () => {
        expect(csp).toMatch(/base-uri\s+'self'/)
      })

      it("form-action stays 'self' (no off-site form posts of credentials)", () => {
        expect(csp).toMatch(/form-action\s+'self'/)
      })
    })
  })
})
