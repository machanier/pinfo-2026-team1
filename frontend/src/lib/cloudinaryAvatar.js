import apiClient from './apiClient'

// Avatar uploads are SIGNED. The browser no longer talks to Cloudinary with the
// public *unsigned* preset (its cloud name + preset name were readable straight
// from the JS bundle, so anyone could POST uploads and burn our Free-plan quota
// — a denial-of-wallet risk). Instead the flow is:
//   1. ask user-service to mint a short-lived signature
//      (POST /api/users/me/avatar-upload-signature);
//   2. upload straight to Cloudinary with that signature.
// Only the backend holds the Cloudinary API secret, so only the backend can
// produce a valid signature: anonymous uploads are refused by Cloudinary, and
// the signing endpoint itself is authenticated (Auth0 / Kong) and per-user
// rate-limited.
//
// Two gates remain client-side by design:
//  - MAX_AVATAR_BYTES — the Cloudinary preset's max_file_size is silently
//    ignored on the Free plan, so this stays the only real size guard for
//    legitimate users (an attacker is bounded by the rate limit + signature,
//    not by this number).
//  - file type — smuggling SVG/HTML as an "image" (an XSS surface) is blocked by
//    allowed_formats=png,jpg,webp on the preset, which IS enforced and still
//    applies because the upload references the (now signed) preset.
export const MAX_AVATAR_BYTES = 2_000_000

export function formatAvatarSize(bytes) {
  return `${(bytes / 1_000_000).toFixed(1)} MB`
}

export function avatarTooLargeMessage(bytes) {
  return `Avatar trop lourd (${formatAvatarSize(bytes)}). Maximum autorisé : ${formatAvatarSize(MAX_AVATAR_BYTES)}.`
}

// Single-source size guard reused by both the form's onChange handler (for
// immediate UX feedback) and uploadAvatarToCloudinary (defense-in-depth for
// any future caller that bypasses the form — drop handler, paste handler,
// programmatic upload).
export function isAvatarOverSized(file) {
  return file.size > MAX_AVATAR_BYTES
}

const SIGNATURE_ENDPOINT = '/api/users/me/avatar-upload-signature'

export async function uploadAvatarToCloudinary(file) {
  if (isAvatarOverSized(file)) {
    throw new Error(avatarTooLargeMessage(file.size))
  }

  // Step 1 — get a server-minted signature. apiClient attaches the Auth0 bearer
  // token; the Cloudinary API secret stays on the server and never reaches here.
  let signed
  try {
    const { data } = await apiClient.post(SIGNATURE_ENDPOINT)
    signed = data
  } catch (error) {
    if (error?.response?.status === 429) {
      throw new Error(
        'Trop de changements de photo en peu de temps. Réessaie dans un moment.',
        { cause: error },
      )
    }
    throw new Error("Impossible d'autoriser l'upload de l'avatar. Reessaie.", {
      cause: error,
    })
  }

  if (!signed?.signature || !signed?.cloudName || !signed?.apiKey) {
    throw new Error('Reponse de signature Cloudinary invalide.')
  }

  // Step 2 — upload to Cloudinary with the signed parameters. Each signed field
  // must be sent back verbatim; any change makes Cloudinary recompute a
  // different hash and reject the upload.
  const formData = new FormData()
  formData.append('file', file)
  formData.append('api_key', signed.apiKey)
  formData.append('timestamp', String(signed.timestamp))
  formData.append('public_id', signed.publicId)
  formData.append('overwrite', String(signed.overwrite))
  formData.append('upload_preset', signed.uploadPreset)
  formData.append('signature', signed.signature)

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`,
    {
      method: 'POST',
      body: formData,
    },
  )

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}))
    const message = errorPayload?.error?.message || 'Upload Cloudinary echoue.'
    throw new Error(message)
  }

  const payload = await response.json()
  if (!payload?.secure_url) {
    throw new Error('Aucune URL retournee par Cloudinary.')
  }

  return payload.secure_url
}

/**
 * Injects Cloudinary URL transformation parameters for display.
 * Inserts w_<width>,q_auto:best,f_auto between /upload/ and the public_id
 * so the browser receives the highest quality for the given display width.
 *
 * @param {string} url    Raw Cloudinary secure_url
 * @param {number} width  Intended display width in CSS pixels (will be 2× for retina)
 */
export function cloudinaryOptimized(url, width = 1200) {
  if (!url?.includes('/upload/')) return url
  return url.replace('/upload/', `/upload/w_${width * 2},q_auto:best,f_auto/`)
}
