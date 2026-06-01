import { describe, it, expect } from 'vitest'
import { EVENT_CATEGORIES, categoryMatches } from './categories'

describe('EVENT_CATEGORIES', () => {
  it('is the canonical category list, in demo order, with no duplicates', () => {
    expect(EVENT_CATEGORIES).toEqual([
      'Conférence',
      'Sport',
      'Plein air',
      'Carrière',
      'Bien-être',
      'Musique',
    ])
    expect(new Set(EVENT_CATEGORIES).size).toBe(EVENT_CATEGORIES.length)
  })
})

describe('categoryMatches', () => {
  it('matches case-insensitively and trimmed', () => {
    expect(categoryMatches('Conférence', 'conférence')).toBe(true)
    expect(categoryMatches(' Sport ', 'sport')).toBe(true)
  })

  it('treats an empty selection as "match all"', () => {
    expect(categoryMatches('anything', '')).toBe(true)
    expect(categoryMatches('anything', null)).toBe(true)
  })

  it('returns false for different categories', () => {
    expect(categoryMatches('Conférence', 'Sport')).toBe(false)
  })
})
