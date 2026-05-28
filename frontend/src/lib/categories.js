// Canonical event categories shown in the UI (home "browse by category" + search
// filters). Single source of truth — identical everywhere — instead of deriving
// the list from free-text event data, which was inconsistent ("conf", "test", …).
// Order matches the home page demo. Keep in sync with CATEGORY_ICONS in HomePage.
export const EVENT_CATEGORIES = [
  'Conférence',
  'Sport',
  'Plein air',
  'Carrière',
  'Bien-être',
  'Musique',
]

export function categoryMatches(eventCategory, selected) {
  if (!selected) return true
  return (
    String(eventCategory ?? '')
      .trim()
      .toLowerCase() === String(selected).trim().toLowerCase()
  )
}
