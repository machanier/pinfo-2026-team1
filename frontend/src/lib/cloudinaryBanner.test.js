import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MAX_BANNER_BYTES, uploadBannerToCloudinary } from './cloudinaryBanner'
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
    publicId: 'banners/auth0_abc',
    overwrite: true,
    uploadPreset: 'unigevents_banner',
    signature: 'deadbeefsignature',
    ...overrides,
  }
}

function makeBlob(type = 'image/jpeg') {
  return new Blob([new Uint8Array(1024)], { type })
}

beforeEach(() => {
  globalThis.fetch = vi.fn()
})

afterEach(() => {
  vi.clearAllMocks()
  globalThis.fetch = originalFetch
})

describe('uploadBannerToCloudinary', () => {
  it('rejects an oversized file before requesting a signature', async () => {
    await expect(
      uploadBannerToCloudinary({ size: MAX_BANNER_BYTES + 1 }, 'big.jpg'),
    ).rejects.toThrow(/trop lourde/i)
    expect(apiClient.post).not.toHaveBeenCalled()
  })

  it('requests a signature then uploads to Cloudinary with the signed fields', async () => {
    apiClient.post.mockResolvedValue({ data: signaturePayload() })
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        secure_url: 'https://res.cloudinary.com/demo/image/upload/banners/auth0_abc.jpg',
        width: 1280,
        height: 512,
      }),
    })

    const payload = await uploadBannerToCloudinary(makeBlob(), 'banner.jpg')

    // The helper returns the FULL Cloudinary payload (BannerUpload reads width).
    expect(payload.secure_url).toBe(
      'https://res.cloudinary.com/demo/image/upload/banners/auth0_abc.jpg',
    )
    expect(payload.width).toBe(1280)
    expect(apiClient.post).toHaveBeenCalledWith('/api/events/banner-upload-signature')

    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
    const [calledUrl, options] = globalThis.fetch.mock.calls[0]
    expect(calledUrl).toBe('https://api.cloudinary.com/v1_1/demo/image/upload')
    expect(options.method).toBe('POST')

    // Signed fields must be forwarded verbatim, and a real signature present.
    const sent = options.body
    expect(sent.get('signature')).toBe('deadbeefsignature')
    expect(sent.get('api_key')).toBe('123456789')
    expect(sent.get('timestamp')).toBe('1735680000')
    expect(sent.get('public_id')).toBe('banners/auth0_abc')
    expect(sent.get('overwrite')).toBe('true')
    expect(sent.get('upload_preset')).toBe('unigevents_banner')
    expect(sent.get('file')).toBeTruthy()
  })

  it('forwards the given filename to the Cloudinary form data', async () => {
    apiClient.post.mockResolvedValue({ data: signaturePayload() })
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ secure_url: 'https://res.cloudinary.com/demo/image/upload/x.jpg' }),
    })

    await uploadBannerToCloudinary(makeBlob(), 'my-cropped-banner.jpg')

    const sent = globalThis.fetch.mock.calls[0][1].body
    const file = sent.get('file')
    expect(file).toBeInstanceOf(File)
    expect(file.name).toBe('my-cropped-banner.jpg')
  })

  it('maps a 429 from the signature endpoint to a friendly rate-limit message', async () => {
    apiClient.post.mockRejectedValue({ response: { status: 429 } })

    await expect(uploadBannerToCloudinary(makeBlob(), 'banner.jpg')).rejects.toThrow(
      /Trop d'uploads de bannière/,
    )
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('maps a 503 from the signature endpoint to a "not configured" message', async () => {
    apiClient.post.mockRejectedValue({ response: { status: 503 } })

    await expect(uploadBannerToCloudinary(makeBlob(), 'banner.jpg')).rejects.toThrow(
      /n'est pas configuré côté serveur/,
    )
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('throws a generic auth error when the signature request fails otherwise', async () => {
    apiClient.post.mockRejectedValue({ response: { status: 401 } })

    await expect(uploadBannerToCloudinary(makeBlob(), 'banner.jpg')).rejects.toThrow(
      /Impossible d'autoriser l'upload de la bannière/,
    )
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('throws when the signature payload is incomplete', async () => {
    apiClient.post.mockResolvedValue({ data: signaturePayload({ signature: undefined }) })

    await expect(uploadBannerToCloudinary(makeBlob(), 'banner.jpg')).rejects.toThrow(
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

    await expect(uploadBannerToCloudinary(makeBlob(), 'banner.jpg')).rejects.toThrow(
      /Invalid signature/,
    )
  })

  it('throws a generic message when the failure payload has no error.message', async () => {
    apiClient.post.mockResolvedValue({ data: signaturePayload() })
    globalThis.fetch.mockResolvedValue({
      ok: false,
      json: async () => {
        throw new Error('not json')
      },
    })

    await expect(uploadBannerToCloudinary(makeBlob(), 'banner.jpg')).rejects.toThrow(
      /Upload Cloudinary échoué/,
    )
  })

  it('throws when the Cloudinary response has no secure_url', async () => {
    apiClient.post.mockResolvedValue({ data: signaturePayload() })
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    })

    await expect(uploadBannerToCloudinary(makeBlob(), 'banner.jpg')).rejects.toThrow(
      /Aucune URL retournée par Cloudinary/,
    )
  })
})
