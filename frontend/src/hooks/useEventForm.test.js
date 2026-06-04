import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useEventForm } from './useEventForm'

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Formats a Date as "YYYY-MM-DDTHH:mm" in local time (for datetime-local inputs). */
function toDatetimeLocal(d) {
  const pad = (v) => String(v).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Returns a datetime-local string N minutes from now. */
function futureTime(offsetMinutes = 60) {
  return toDatetimeLocal(new Date(Date.now() + offsetMinutes * 60_000))
}

/** Returns a datetime-local string N minutes in the past. */
function pastTime(offsetMinutes = 60) {
  return toDatetimeLocal(new Date(Date.now() - offsetMinutes * 60_000))
}

// Fix Date.now() so time-based assertions are deterministic.
const FIXED_NOW = new Date('2030-01-01T12:00:00Z').getTime()
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(FIXED_NOW)
})
afterEach(() => {
  vi.useRealTimers()
})

// ── Initial state ─────────────────────────────────────────────────────────────

describe('useEventForm — initial state', () => {
  it('returns empty formData', () => {
    const { result } = renderHook(() => useEventForm())
    expect(result.current.formData).toEqual({
      title: '',
      category: '',
      time: '',
      endTime: '',
      place: '',
      capacity: '',
      description: '',
    })
  })

  it('returns empty tags, tagInput, errors, submitError', () => {
    const { result } = renderHook(() => useEventForm())
    expect(result.current.tags).toEqual([])
    expect(result.current.tagInput).toBe('')
    expect(result.current.errors).toEqual({})
    expect(result.current.submitError).toBe('')
  })

  it('starts with isRestricted = false and empty selections', () => {
    const { result } = renderHook(() => useEventForm())
    expect(result.current.isRestricted).toBe(false)
    expect(result.current.selectedFaculties).toEqual([])
    expect(result.current.selectedMajors).toEqual([])
    expect(result.current.selectedDegreeLevels).toEqual([])
  })

  it('starts with isSubmitting = false and empty bannerImageUrl', () => {
    const { result } = renderHook(() => useEventForm())
    expect(result.current.isSubmitting).toBe(false)
    expect(result.current.bannerImageUrl).toBe('')
  })
})

// ── handleChange ──────────────────────────────────────────────────────────────

describe('useEventForm — handleChange', () => {
  it('updates a formData field', () => {
    const { result } = renderHook(() => useEventForm())
    act(() => {
      result.current.handleChange({ target: { name: 'title', value: 'Mon événement' } })
    })
    expect(result.current.formData.title).toBe('Mon événement')
  })

  it('clears the field error when the field is changed', () => {
    const { result } = renderHook(() => useEventForm())
    act(() => result.current.setErrors({ title: 'Le titre est requis' }))
    act(() => {
      result.current.handleChange({ target: { name: 'title', value: 'Nouveau titre' } })
    })
    expect(result.current.errors.title).toBe('')
  })

  it('does not clear errors on other fields', () => {
    const { result } = renderHook(() => useEventForm())
    act(() => result.current.setErrors({ title: 'requis', place: 'requis' }))
    act(() => {
      result.current.handleChange({ target: { name: 'title', value: 'x' } })
    })
    expect(result.current.errors.place).toBe('requis')
  })
})

// ── validateForm ──────────────────────────────────────────────────────────────

describe('useEventForm — validateForm', () => {
  function validData() {
    return {
      title: 'Mon événement',
      place: 'Amphi A',
      time: futureTime(120),
      endTime: '',
      category: 'Conférence',
      description: 'Une description.',
      capacity: '50',
    }
  }

  it('returns no errors when all required fields are valid', () => {
    const { result } = renderHook(() => useEventForm())
    act(() => result.current.setFormData(validData()))
    const errors = result.current.validateForm()
    expect(errors).toEqual({})
  })

  it('requires title', () => {
    const { result } = renderHook(() => useEventForm())
    act(() => result.current.setFormData({ ...validData(), title: '' }))
    expect(result.current.validateForm()).toMatchObject({ title: expect.any(String) })
  })

  it('requires place', () => {
    const { result } = renderHook(() => useEventForm())
    act(() => result.current.setFormData({ ...validData(), place: '' }))
    expect(result.current.validateForm()).toMatchObject({ place: expect.any(String) })
  })

  it('requires time', () => {
    const { result } = renderHook(() => useEventForm())
    act(() => result.current.setFormData({ ...validData(), time: '' }))
    const errors = result.current.validateForm()
    expect(errors.time).toBe('La date et heure de début est requise')
  })

  it('rejects a past start time', () => {
    const { result } = renderHook(() => useEventForm())
    act(() => result.current.setFormData({ ...validData(), time: pastTime(30) }))
    const errors = result.current.validateForm()
    expect(errors.time).toBe('La date de début doit être dans le futur')
  })

  it('accepts a future start time', () => {
    const { result } = renderHook(() => useEventForm())
    act(() => result.current.setFormData({ ...validData(), time: futureTime(30) }))
    const errors = result.current.validateForm()
    expect(errors.time).toBeUndefined()
  })

  it('allows a past start time when requireFutureStart is false (edit mode, Review B4)', () => {
    const { result } = renderHook(() => useEventForm())
    act(() => result.current.setFormData({ ...validData(), time: pastTime(30) }))
    const errors = result.current.validateForm({ requireFutureStart: false })
    expect(errors.time).toBeUndefined()
  })

  it('requires category', () => {
    const { result } = renderHook(() => useEventForm())
    act(() => result.current.setFormData({ ...validData(), category: '' }))
    expect(result.current.validateForm()).toMatchObject({ category: expect.any(String) })
  })

  it('requires description', () => {
    const { result } = renderHook(() => useEventForm())
    act(() => result.current.setFormData({ ...validData(), description: '' }))
    expect(result.current.validateForm()).toMatchObject({ description: expect.any(String) })
  })

  it('requires capacity ≥ 1', () => {
    const { result } = renderHook(() => useEventForm())
    act(() => result.current.setFormData({ ...validData(), capacity: '0' }))
    expect(result.current.validateForm()).toMatchObject({ capacity: expect.any(String) })
  })

  it('accepts capacity = 1', () => {
    const { result } = renderHook(() => useEventForm())
    act(() => result.current.setFormData({ ...validData(), capacity: '1' }))
    expect(result.current.validateForm().capacity).toBeUndefined()
  })

  it('rejects endTime ≤ startTime', () => {
    const { result } = renderHook(() => useEventForm())
    const start = futureTime(120)
    const end = futureTime(60) // end before start
    act(() => result.current.setFormData({ ...validData(), time: start, endTime: end }))
    expect(result.current.validateForm()).toMatchObject({ endTime: expect.any(String) })
  })

  it('accepts endTime > startTime', () => {
    const { result } = renderHook(() => useEventForm())
    const start = futureTime(60)
    const end = futureTime(180)
    act(() => result.current.setFormData({ ...validData(), time: start, endTime: end }))
    expect(result.current.validateForm().endTime).toBeUndefined()
  })

  it('ignores endTime validation when endTime is empty', () => {
    const { result } = renderHook(() => useEventForm())
    act(() => result.current.setFormData({ ...validData(), endTime: '' }))
    expect(result.current.validateForm().endTime).toBeUndefined()
  })
})

// ── Tags ──────────────────────────────────────────────────────────────────────

describe('useEventForm — tags', () => {
  it('adds a tag via addTag', () => {
    const { result } = renderHook(() => useEventForm())
    act(() => result.current.addTag('tech'))
    expect(result.current.tags).toContain('tech')
  })

  it('does not add duplicate tags', () => {
    const { result } = renderHook(() => useEventForm())
    act(() => result.current.addTag('tech'))
    act(() => result.current.addTag('tech'))
    expect(result.current.tags).toHaveLength(1)
  })

  it('trims whitespace before adding a tag', () => {
    const { result } = renderHook(() => useEventForm())
    act(() => result.current.addTag('  emploi  '))
    expect(result.current.tags).toContain('emploi')
  })

  it('clears tagInput after addTag', () => {
    const { result } = renderHook(() => useEventForm())
    act(() => result.current.setTagInput('tech'))
    act(() => result.current.addTag('tech'))
    expect(result.current.tagInput).toBe('')
  })

  it('removes a tag via removeTag', () => {
    const { result } = renderHook(() => useEventForm())
    act(() => result.current.addTag('tech'))
    act(() => result.current.removeTag('tech'))
    expect(result.current.tags).not.toContain('tech')
  })

  it('handleTagKeyDown adds tag on Enter', () => {
    const { result } = renderHook(() => useEventForm())
    act(() => result.current.setTagInput('networking'))
    act(() => {
      const event = { key: 'Enter', preventDefault: vi.fn() }
      result.current.handleTagKeyDown(event)
    })
    expect(result.current.tags).toContain('networking')
  })

  it('handleTagKeyDown ignores non-Enter keys', () => {
    const { result } = renderHook(() => useEventForm())
    act(() => result.current.setTagInput('net'))
    act(() => result.current.handleTagKeyDown({ key: 'a', preventDefault: vi.fn() }))
    expect(result.current.tags).toHaveLength(0)
  })
})

// ── Faculty / Major / DegreeLevel toggles ────────────────────────────────────

describe('useEventForm — restriction toggles', () => {
  it('toggleFaculty adds and removes a faculty', () => {
    const { result } = renderHook(() => useEventForm())
    act(() => result.current.toggleFaculty('Faculte des sciences'))
    expect(result.current.selectedFaculties).toContain('Faculte des sciences')
    act(() => result.current.toggleFaculty('Faculte des sciences'))
    expect(result.current.selectedFaculties).not.toContain('Faculte des sciences')
  })

  it('toggleFaculty removes majors that no longer belong to selected faculties', () => {
    const { result } = renderHook(() => useEventForm())
    act(() => result.current.toggleFaculty('Faculte des sciences'))
    act(() => result.current.toggleMajor('Mathematiques'))
    expect(result.current.selectedMajors).toContain('Mathematiques')
    // Deselect faculty → major should be pruned
    act(() => result.current.toggleFaculty('Faculte des sciences'))
    expect(result.current.selectedMajors).not.toContain('Mathematiques')
  })

  it('toggleMajor adds and removes a major', () => {
    const { result } = renderHook(() => useEventForm())
    act(() => result.current.toggleMajor('Finance'))
    expect(result.current.selectedMajors).toContain('Finance')
    act(() => result.current.toggleMajor('Finance'))
    expect(result.current.selectedMajors).not.toContain('Finance')
  })

  it('toggleDegreeLevel adds and removes a degree level', () => {
    const { result } = renderHook(() => useEventForm())
    act(() => result.current.toggleDegreeLevel('BACHELOR'))
    expect(result.current.selectedDegreeLevels).toContain('BACHELOR')
    act(() => result.current.toggleDegreeLevel('BACHELOR'))
    expect(result.current.selectedDegreeLevels).not.toContain('BACHELOR')
  })

  it('availableMajors reflects selected faculties', () => {
    const { result } = renderHook(() => useEventForm())
    act(() => result.current.toggleFaculty('Faculte de droit'))
    expect(result.current.availableMajors).toContain('Droit suisse')
  })

  it('availableMajors is empty when no faculty is selected', () => {
    const { result } = renderHook(() => useEventForm())
    expect(result.current.availableMajors).toHaveLength(0)
  })
})

// ── fieldCls ──────────────────────────────────────────────────────────────────

describe('useEventForm — fieldCls', () => {
  it('returns error class when hasError is truthy', () => {
    const { result } = renderHook(() => useEventForm())
    expect(result.current.fieldCls('some error')).toContain('border-red-500')
  })

  it('returns normal class when hasError is falsy', () => {
    const { result } = renderHook(() => useEventForm())
    expect(result.current.fieldCls('')).toContain('border-gray-300')
    expect(result.current.fieldCls(false)).toContain('border-gray-300')
  })
})

// ── buildPayload ──────────────────────────────────────────────────────────────

describe('useEventForm — buildPayload', () => {
  const FUTURE = '2030-06-01T14:00'

  it('builds a minimal payload (no endTime, no restrictions)', () => {
    const { result } = renderHook(() => useEventForm())
    act(() =>
      result.current.setFormData({
        title: '  Mon event  ',
        place: '  Amphi A  ',
        time: FUTURE,
        endTime: '',
        category: 'Conférence',
        description: '  Une description.  ',
        capacity: '100',
      }),
    )
    const payload = result.current.buildPayload()
    expect(payload.title).toBe('Mon event')
    expect(payload.place).toBe('Amphi A')
    expect(payload.description).toBe('Une description.')
    expect(payload.time).toBe(new Date(FUTURE).toISOString())
    expect(payload.endTime).toBeUndefined()
    expect(payload.capacity).toBe(100)
    expect(payload.category).toBe('Conférence')
    expect(payload.restrictedTo).toBeUndefined()
  })

  it('includes endTime in ISO format when set', () => {
    const { result } = renderHook(() => useEventForm())
    const END = '2030-06-01T16:00'
    act(() =>
      result.current.setFormData({
        title: 'T',
        place: 'P',
        time: FUTURE,
        endTime: END,
        category: 'Sport',
        description: 'D',
        capacity: '10',
      }),
    )
    expect(result.current.buildPayload().endTime).toBe(new Date(END).toISOString())
  })

  it('includes tags in the payload', () => {
    const { result } = renderHook(() => useEventForm())
    act(() =>
      result.current.setFormData({
        title: 'T',
        place: 'P',
        time: FUTURE,
        endTime: '',
        category: 'C',
        description: 'D',
        capacity: '5',
      }),
    )
    act(() => result.current.addTag('tech'))
    act(() => result.current.addTag('emploi'))
    expect(result.current.buildPayload().tags).toEqual(['tech', 'emploi'])
  })

  it('includes restrictedTo when isRestricted is true', () => {
    const { result } = renderHook(() => useEventForm())
    act(() =>
      result.current.setFormData({
        title: 'T',
        place: 'P',
        time: FUTURE,
        endTime: '',
        category: 'C',
        description: 'D',
        capacity: '5',
      }),
    )
    act(() => result.current.setIsRestricted(true))
    act(() => result.current.toggleFaculty('Faculte de droit'))
    act(() => result.current.toggleDegreeLevel('MASTER'))
    const payload = result.current.buildPayload()
    expect(payload.restrictedTo).toMatchObject({
      faculties: ['Faculte de droit'],
      majors: [],
      degreeLevels: ['MASTER'],
    })
  })
})
