/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

import { useDebounce } from './useDebounce'

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('foo', 500))

    expect(result.current).toBe('foo')
  })

  it('does not update before delay has elapsed', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'foo', delay: 300 },
    })

    rerender({ value: 'bar', delay: 300 })

    act(() => {
      vi.advanceTimersByTime(299)
    })

    expect(result.current).toBe('foo')
  })

  it('updates after delay has elapsed', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'foo', delay: 300 },
    })

    rerender({ value: 'bar', delay: 300 })

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current).toBe('bar')
  })

  it('resets timer on rapid value changes', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'a', delay: 300 },
    })

    rerender({ value: 'b', delay: 300 })

    act(() => {
      vi.advanceTimersByTime(100)
    })

    rerender({ value: 'c', delay: 300 })

    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(result.current).toBe('a')

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current).toBe('c')
  })

  it('handles delay change', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'x', delay: 200 },
    })

    rerender({ value: 'x', delay: 100 })

    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(result.current).toBe('x')
  })
})
