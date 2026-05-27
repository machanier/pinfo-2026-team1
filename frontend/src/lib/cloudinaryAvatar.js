// Vuln 13 follow-up: hard ceiling on avatar uploads, mirrored client-side.
// The matching `max_file_size` on the Cloudinary preset is silently ignored on
// the Free plan (verified by direct API test against the preset
// `unigevents_profil` — the param round-trips through PUT/GET but never actually
// blocks an upload). This constant is therefore the only real gate against
// legitimate users wasting our Cloudinary quota with huge files. A determined
// attacker can still POST directly to Cloudinary, but the surface that matters
// (XSS via SVG / HTML smuggled as an image) is independently bounded by
// `allowed_formats=png,jpg,webp` on the preset — which IS enforced.
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

export async function uploadAvatarToCloudinary(file) {
  if (isAvatarOverSized(file)) {
    throw new Error(avatarTooLargeMessage(file.size))
  }

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
  if (!cloudName || !uploadPreset) {
    throw new Error('Configuration Cloudinary manquante. Renseigne VITE_CLOUDINARY_*.')
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', uploadPreset)

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/upload`, {
    method: 'POST',
    body: formData,
  })

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
