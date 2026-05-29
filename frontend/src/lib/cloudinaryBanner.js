import apiClient from './apiClient'

// Event-banner uploads are SIGNED, exactly like avatars (see cloudinaryAvatar):
//   1. ask event-service to mint a short-lived signature
//      (POST /api/events/banner-upload-signature, ORGANIZER/ADMIN only);
//   2. upload straight to Cloudinary with that signature.
// The Cloudinary API secret stays on the server, so anonymous uploads to the
// (signed) banner preset are refused — closing the denial-of-wallet path that
// an unsigned, publicly-readable preset would otherwise leave open.
const SIGNATURE_ENDPOINT = '/api/events/banner-upload-signature'

// Banners are larger than avatars (full-width hero vs thumbnail), hence a higher
// cap — but it mirrors the avatar guard: the Cloudinary preset's max_file_size is
// silently ignored on the Free plan, so THIS client check is the real size gate
// for legitimate users (abuse is bounded by the signature + per-user rate limit).
export const MAX_BANNER_BYTES = 5_000_000

export function formatBannerSize(bytes) {
  return `${(bytes / 1_000_000).toFixed(1)} MB`
}

export function bannerTooLargeMessage(bytes) {
  return `Bannière trop lourde (${formatBannerSize(bytes)}). Maximum autorisé : ${formatBannerSize(MAX_BANNER_BYTES)}.`
}

export function isBannerOverSized(file) {
  return file.size > MAX_BANNER_BYTES
}

export async function uploadBannerToCloudinary(fileOrBlob, filename) {
  // Defense-in-depth size guard (mirrors uploadAvatarToCloudinary): a caller that
  // bypasses the form's check is still bounded here.
  if (fileOrBlob?.size != null && isBannerOverSized(fileOrBlob)) {
    throw new Error(bannerTooLargeMessage(fileOrBlob.size))
  }

  // Step 1 — server-minted signature. apiClient attaches the Auth0 bearer; the
  // Cloudinary API secret stays on the server and never reaches the browser.
  let signed
  try {
    const { data } = await apiClient.post(SIGNATURE_ENDPOINT)
    signed = data
  } catch (error) {
    if (error?.response?.status === 429) {
      throw new Error("Trop d'uploads de bannière en peu de temps. Réessaie dans un moment.", {
        cause: error,
      })
    }
    if (error?.response?.status === 503) {
      throw new Error("L'upload de bannière n'est pas configuré côté serveur (Cloudinary).", {
        cause: error,
      })
    }
    throw new Error("Impossible d'autoriser l'upload de la bannière. Réessaie.", { cause: error })
  }

  if (!signed?.signature || !signed?.cloudName || !signed?.apiKey) {
    throw new Error('Réponse de signature Cloudinary invalide.')
  }

  // Step 2 — upload with the signed params. Each signed field must be sent back
  // verbatim or Cloudinary recomputes a different hash and rejects the upload.
  const formData = new FormData()
  formData.append('file', fileOrBlob, filename)
  formData.append('api_key', signed.apiKey)
  formData.append('timestamp', String(signed.timestamp))
  formData.append('public_id', signed.publicId)
  formData.append('overwrite', String(signed.overwrite))
  formData.append('upload_preset', signed.uploadPreset)
  formData.append('signature', signed.signature)

  const response = await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}))
    throw new Error(errorPayload?.error?.message || 'Upload Cloudinary échoué.')
  }

  const payload = await response.json()
  if (!payload?.secure_url) {
    throw new Error('Aucune URL retournée par Cloudinary.')
  }
  return payload
}
