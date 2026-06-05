import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MAX_AVATAR_BYTES,
  avatarTooLargeMessage,
  cloudinaryOptimized,
  formatAvatarSize,
  isAvatarOverSized,
  uploadAvatarToCloudinary,
} from './cloudinaryAvatar'
import apiClient from './apiClient'

vi.mock('./apiClient', () => ({
  default: { post: vi.fn() },
}))

const originalFetch = globalThis.fetch

function signaturePayload(overrides = {}) {
  return {
    cloudName: 'demo',
    apiKey: '123456789',
    timestamp: 1735680000,
    publicId: 'avatars/auth0_abc',
    overwrite: true,
    uploadPreset: 'unigevents_profil',
    signature: 'deadbeefsignature',
    ...overrides,
  }
}

beforeEach(() => {
  globalThis.fetch = vi.fn()
})

afterEach(() => {
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

    it('throws on oversized files without requesting a signature or uploading', async () => {
      await expect(uploadAvatarToCloudinary(makeFile(2_500_000))).rejects.toThrow(
        /Avatar trop lourd \(2\.5 MB\)\. Maximum autoris[eé] : 2\.0 MB\./,
      )
      expect(apiClient.post).not.toHaveBeenCalled()
      expect(globalThis.fetch).not.toHaveBeenCalled()
    })

    it('requests a signature then uploads to Cloudinary with the signed fields', async () => {
      apiClient.post.mockResolvedValue({ data: signaturePayload() })
      globalThis.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          secure_url: 'https://res.cloudinary.com/demo/image/upload/avatars/auth0_abc.png',
        }),
      })

      const url = await uploadAvatarToCloudinary(makeFile(500_000))

      expect(url).toBe('https://res.cloudinary.com/demo/image/upload/avatars/auth0_abc.png')
      expect(apiClient.post).toHaveBeenCalledWith('/api/users/me/avatar-upload-signature')

      expect(globalThis.fetch).toHaveBeenCalledTimes(1)
      const [calledUrl, options] = globalThis.fetch.mock.calls[0]
      expect(calledUrl).toBe('https://api.cloudinary.com/v1_1/demo/image/upload')
      expect(options.method).toBe('POST')

      // The signed fields must be forwarded to Cloudinary verbatim, and a real
      // signature must be present — not just the (now retired) bare preset.
      const sent = options.body
      expect(sent.get('signature')).toBe('deadbeefsignature')
      expect(sent.get('api_key')).toBe('123456789')
      expect(sent.get('timestamp')).toBe('1735680000')
      expect(sent.get('public_id')).toBe('avatars/auth0_abc')
      expect(sent.get('overwrite')).toBe('true')
      expect(sent.get('upload_preset')).toBe('unigevents_profil')
      expect(sent.get('file')).toBeTruthy()
    })

    it('maps a 429 from the signature endpoint to a friendly rate-limit message', async () => {
      apiClient.post.mockRejectedValue({ response: { status: 429 } })

      await expect(uploadAvatarToCloudinary(makeFile(500_000))).rejects.toThrow(
        /Trop de changements de photo/,
      )
      expect(globalThis.fetch).not.toHaveBeenCalled()
    })

    it('throws a generic auth error when the signature request fails otherwise', async () => {
      apiClient.post.mockRejectedValue({ response: { status: 401 } })

      await expect(uploadAvatarToCloudinary(makeFile(500_000))).rejects.toThrow(
        /Impossible d'autoriser l'upload/,
      )
      expect(globalThis.fetch).not.toHaveBeenCalled()
    })

    it('throws when the signature payload is incomplete', async () => {
      apiClient.post.mockResolvedValue({ data: signaturePayload({ signature: undefined }) })

      await expect(uploadAvatarToCloudinary(makeFile(500_000))).rejects.toThrow(
        /signature Cloudinary invalide/,
      )
      expect(globalThis.fetch).not.toHaveBeenCalled()
    })

    it('throws with the Cloudinary error message when the upload fails', async () => {
      apiClient.post.mockResolvedValue({ data: signaturePayload() })
      globalThis.fetch.mockResolvedValue({
        ok: false,
        json: async () => ({ error: { message: 'Invalid signature' } }),
      })

      await expect(uploadAvatarToCloudinary(makeFile(500_000))).rejects.toThrow(/Invalid signature/)
    })

    it('throws a generic message when the failure payload has no error.message', async () => {
      apiClient.post.mockResolvedValue({ data: signaturePayload() })
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
      apiClient.post.mockResolvedValue({ data: signaturePayload() })
      globalThis.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      })

      await expect(uploadAvatarToCloudinary(makeFile(500_000))).rejects.toThrow(
        /Aucune URL retournee par Cloudinary/,
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
