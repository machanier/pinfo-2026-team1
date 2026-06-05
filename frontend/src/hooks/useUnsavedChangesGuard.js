import { useEffect, useRef } from 'react'

const DEFAULT_MESSAGE = 'Modifications non enregistrées. Quitter sans enregistrer ?'

/**
 * Block leaving the page while there are unsaved changes.
 *
 * Works with the classic <BrowserRouter> (no data router / useBlocker needed) by
 * covering the three ways a user can leave a page:
 *
 *  1. Hard exit (refresh / tab close / external URL): the native `beforeunload`
 *     prompt — the browser decides the wording, we only opt in.
 *  2. In-app navigation (sidebar link, logo, the in-page « Retour » link… anything
 *     rendered as <a> by react-router's <Link>): intercepted in the capture phase
 *     before react-router sees the click, with a confirm().
 *  3. Browser Back / Forward button: a sentinel history entry is pushed so the
 *     first Back lands back on this page; on `popstate` we confirm and either let
 *     the user leave for real or re-arm the sentinel to keep them here.
 *
 * State is read through refs so the listeners — attached once — always see the
 * latest `when` / `message` without being torn down and re-added on every render.
 *
 * @param {boolean} when    true while the form has unsaved changes
 * @param {string}  message confirm() text shown for in-app navigation / Back
 */
export function useUnsavedChangesGuard(when, message = DEFAULT_MESSAGE) {
  const whenRef = useRef(when)
  const messageRef = useRef(message)

  // Updating a ref during render is disallowed (react-hooks/refs); keep the refs
  // in sync after every render so the listeners below always read fresh values.
  useEffect(() => {
    whenRef.current = when
    messageRef.current = message
  })

  // 1) Hard exit — native browser prompt.
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (!whenRef.current) return
      e.preventDefault()
      // Legacy browsers need returnValue set to trigger the prompt.
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  // 2) In-app link clicks — intercept before react-router handles them.
  useEffect(() => {
    const onClickCapture = (e) => {
      if (!whenRef.current) return
      // Only a plain left-click triggers SPA navigation; let modified clicks
      // (new tab, etc.) and non-primary buttons through untouched.
      if (e.defaultPrevented || e.button !== 0) return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return

      const anchor = e.target?.closest?.('a[href]')
      if (!anchor) return
      if (anchor.target && anchor.target !== '_self') return // opens elsewhere
      if (anchor.hasAttribute('download')) return

      const url = new URL(anchor.href, window.location.href)
      if (url.origin !== window.location.origin) return // external site
      // Same path + query → in-page anchor / no real navigation.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return

      if (!window.confirm(messageRef.current)) {
        // Stop here: react-router's click handler never runs, the browser
        // doesn't follow the href, the user stays on the page.
        e.preventDefault()
        e.stopPropagation()
      }
    }
    document.addEventListener('click', onClickCapture, true)
    return () => document.removeEventListener('click', onClickCapture, true)
  }, [])

  // 3) Browser Back / Forward — sentinel entry + confirm on popstate.
  useEffect(() => {
    if (!when) return undefined
    // Drop a sentinel so the first Back returns here instead of leaving.
    window.history.pushState(window.history.state, '')

    const onPopState = () => {
      if (!whenRef.current) return
      if (window.confirm(messageRef.current)) {
        // User accepts leaving: remove our guard and replay the Back for real.
        window.removeEventListener('popstate', onPopState)
        window.history.back()
      } else {
        // User stays: re-arm the sentinel we just consumed.
        window.history.pushState(window.history.state, '')
      }
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [when])
}

export default useUnsavedChangesGuard
