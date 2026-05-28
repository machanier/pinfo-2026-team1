// Event categories are entered as free text (see EventFormShared), so real data
// arrives inconsistently — "Test" vs "test", stray whitespace, etc. These helpers
// derive a clean, de-duplicated list for the UI and compare categories
// case-insensitively so filtering still works across casing variants.

export function deriveCategories(events = []) {
  const byKey = new Map()
  for (const event of events) {
    const label = String(event?.category ?? '').trim()
    if (!label) continue
    const key = label.toLowerCase()
    const current = byKey.get(key)
    // Prefer a capitalised variant for display ("Test" over "test").
    if (!current || (current === current.toLowerCase() && label !== label.toLowerCase())) {
      byKey.set(key, label)
    }
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b, 'fr'))
}

export function categoryMatches(eventCategory, selected) {
  if (!selected) return true
  return (
    String(eventCategory ?? '')
      .trim()
      .toLowerCase() === String(selected).trim().toLowerCase()
  )
}
