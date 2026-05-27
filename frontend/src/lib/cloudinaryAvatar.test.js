import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MAX_AVATAR_BYTES,
  avatarTooLargeMessage,
  cloudinaryOptimized,
  formatAvatarSize,
  isAvatarOverSized,
  uploadAvatarToCloudinary,
} from './cloudinaryAvatar'

const originalFetch = globalThis.fetch

beforeEach(() => {
  vi.stubEnv('VITE_CLOUDINARY_CLOUD_NAME', 'demo')
  vi.stubEnv('VITE_CLOUDINARY_UPLOAD_PRESET', 'preset')
  globalThis.fetch = vi.fn()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
  globalThis.fetch = originalFetch
})

describe('cloudinaryAvatar helpers', () => {
  describe('MAX_AVATAR_BYTES', () => {
    it('is 2 MB (the Cloudinary Free-plan workaround target)', () => {
      expect(MAX_AVATAR_BYTES).toBe(2_000_000)
    })
  })

  describe('formatAvatarSize', () => {
    it('renders the size in MB with one decimal', () => {
      expect(formatAvatarSize(0)).toBe('0.0 MB')
      expect(formatAvatarSize(2_000_000)).toBe('2.0 MB')
      expect(formatAvatarSize(5_440_889)).toBe('5.4 MB')
    })
  })

  describe('avatarTooLargeMessage', () => {
    it('includes both the actual size and the cap in MB', () => {
      const msg = avatarTooLargeMessage(3_000_000)
      expect(msg).toMatch(/Avatar trop lourd \(3\.0 MB\)/)
      expect(msg).toMatch(/Maximum autoris[eé] : 2\.0 MB/)
    })
  })

  describe('isAvatarOverSized', () => {
    it('returns true when file size exceeds the cap', () => {
      expect(isAvatarOverSized({ size: MAX_AVATAR_BYTES + 1 })).toBe(true)
      expect(isAvatarOverSized({ size: 10_000_000 })).toBe(true)
    })

    it('returns false when file size is at or below the cap', () => {
      expect(isAvatarOverSized({ size: MAX_AVATAR_BYTES })).toBe(false)
      expect(isAvatarOverSized({ size: 1_000_000 })).toBe(false)
      expect(isAvatarOverSized({ size: 0 })).toBe(false)
    })
  })

  describe('uploadAvatarToCloudinary', () => {
    function makeFile(bytes, name = 'avatar.jpg', type = 'image/jpeg') {
      return new File([new Uint8Array(bytes)], name, { type })
    }

    it('throws on oversized files without calling fetch (defense-in-depth)', async () => {
      await expect(uploadAvatarToCloudinary(makeFile(2_500_000))).rejects.toThrow(
        /Avatar trop lourd \(2\.5 MB\)\. Maximum autoris[eé] : 2\.0 MB\./,
      )
      expect(globalThis.fetch).not.toHaveBeenCalled()
    })

    it('throws when the Cloudinary env vars are missing', async () => {
      vi.unstubAllEnvs()
      vi.stubEnv('VITE_CLOUDINARY_CLOUD_NAME', '')
      vi.stubEnv('VITE_CLOUDINARY_UPLOAD_PRESET', '')

      await expect(uploadAvatarToCloudinary(makeFile(500_000))).rejects.toThrow(
        /Configuration Cloudinary manquante/,
      )
      expect(globalThis.fetch).not.toHaveBeenCalled()
    })

    it('throws with the Cloudinary error message when the upload fails', async () => {
      globalThis.fetch.mockResolvedValue({
        ok: false,
        json: async () => ({ error: { message: 'File size too large' } }),
      })

      await expect(uploadAvatarToCloudinary(makeFile(500_000))).rejects.toThrow(
        /File size too large/,
      )
    })

    it('throws a generic message when the failure payload has no error.message', async () => {
      globalThis.fetch.mockResolvedValue({
        ok: false,
        json: async () => {
          throw new Error('not json')
        },
      })

      await expect(uploadAvatarToCloudinary(makeFile(500_000))).rejects.toThrow(
        /Upload Cloudinary echoue/,
      )
    })

    it('throws when the Cloudinary response has no secure_url', async () => {
      globalThis.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      })

      await expect(uploadAvatarToCloudinary(makeFile(500_000))).rejects.toThrow(
        /Aucune URL retournee par Cloudinary/,
      )
    })

    it('returns the secure_url on success', async () => {
      globalThis.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          secure_url: 'https://res.cloudinary.com/demo/image/upload/avatar.png',
        }),
      })

      await expect(uploadAvatarToCloudinary(makeFile(500_000))).resolves.toBe(
        'https://res.cloudinary.com/demo/image/upload/avatar.png',
      )
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://api.cloudinary.com/v1_1/demo/upload',
        expect.objectContaining({ method: 'POST' }),
      )
    })
  })
})

describe('cloudinaryOptimized', () => {
  it('inserts 2× width, quality, and format params into a Cloudinary upload URL', () => {
    const raw = 'https://res.cloudinary.com/demo/image/upload/v1/photo.jpg'
    expect(cloudinaryOptimized(raw, 400)).toBe(
      'https://res.cloudinary.com/demo/image/upload/w_800,q_auto:best,f_auto/v1/photo.jpg',
    )
  })

  it('defaults to width 1200 — inserts w_2400 for retina screens', () => {
    const raw = 'https://res.cloudinary.com/demo/image/upload/photo.jpg'
    expect(cloudinaryOptimized(raw)).toContain('w_2400,q_auto:best,f_auto')
  })

  it('returns the URL unchanged when it does not contain /upload/', () => {
    const url = 'https://example.com/image.jpg'
    expect(cloudinaryOptimized(url, 400)).toBe(url)
  })

  it('returns null as-is', () => {
    expect(cloudinaryOptimized(null)).toBeNull()
  })

  it('returns undefined as-is', () => {
    expect(cloudinaryOptimized(undefined)).toBeUndefined()
  })

  it('returns empty string as-is', () => {
    expect(cloudinaryOptimized('')).toBe('')
  })
})
