import { describe, it, expect } from 'vitest'
import { deriveCategories, categoryMatches } from './categories'

describe('deriveCategories', () => {
  it('dedupes case-insensitively + trims, preferring the capitalised label', () => {
    const events = [
      { category: 'Test' },
      { category: 'test' },
      { category: '  Sport ' },
      { category: 'sport' },
      { category: 'Conférence' },
    ]
    expect(deriveCategories(events)).toEqual(['Conférence', 'Sport', 'Test'])
  })

  it('ignores empty / missing categories', () => {
    expect(
      deriveCategories([{ category: '' }, { category: null }, {}, { category: '   ' }]),
    ).toEqual([])
  })

  it('sorts alphabetically (fr locale)', () => {
    expect(deriveCategories([{ category: 'Musique' }, { category: 'Carrière' }])).toEqual([
      'Carrière',
      'Musique',
    ])
  })
})

describe('categoryMatches', () => {
  it('matches case-insensitively and trimmed', () => {
    expect(categoryMatches('Test', 'test')).toBe(true)
    expect(categoryMatches(' sport ', 'Sport')).toBe(true)
  })

  it('treats an empty selection as "match all"', () => {
    expect(categoryMatches('anything', '')).toBe(true)
    expect(categoryMatches('anything', null)).toBe(true)
  })

  it('returns false for different categories', () => {
    expect(categoryMatches('Conférence', 'Sport')).toBe(false)
  })
})
