import { useRef, useState } from 'react'
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET =
  import.meta.env.VITE_CLOUDINARY_BANNER_UPLOAD_PRESET ||
  import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
const MIN_WIDTH_PX = 800
const MAX_SIZE_MB = 5
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
// Ratio 5:2 = 720px (max-w-3xl − p-6×2) / 288px (max-h-72) — correspond à l'affichage dans EventDetailPage
const BANNER_ASPECT = 720 / 288

function initCrop(w, h) {
  return centerCrop(makeAspectCrop({ unit: '%', width: 90 }, BANNER_ASPECT, w, h), w, h)
}

function cropToBlob(imgEl, px) {
  const scaleX = imgEl.naturalWidth / imgEl.width
  const scaleY = imgEl.naturalHeight / imgEl.height
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(px.width * scaleX)
  canvas.height = Math.round(px.height * scaleY)
  canvas
    .getContext('2d')
    .drawImage(
      imgEl,
      px.x * scaleX,
      px.y * scaleY,
      px.width * scaleX,
      px.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height,
    )
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.95))
}

export default function BannerUpload({ value, onChange, disabled = false }) {
  const inputRef = useRef(null)
  const imgRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  // Crop modal
  const [srcUrl, setSrcUrl] = useState(null)
  const [pendingFile, setPendingFile] = useState(null)
  const [crop, setCrop] = useState()
  const [completedCrop, setCompletedCrop] = useState()
  const [freeAspect, setFreeAspect] = useState(false)

  const isConfigured = Boolean(CLOUD_NAME && UPLOAD_PRESET)

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    if (inputRef.current) inputRef.current.value = ''

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Format non supporté. Utilisez PNG, JPG, WEBP ou GIF.')
      return
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`L'image ne doit pas dépasser ${MAX_SIZE_MB} Mo.`)
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setSrcUrl(reader.result)
      setPendingFile(file)
    }
    reader.readAsDataURL(file)
  }

  function onImageLoad(e) {
    const { width, height } = e.currentTarget
    setCrop(initCrop(width, height))
  }

  async function doUpload(fileOrBlob) {
    const body = new FormData()
    body.append('file', fileOrBlob, pendingFile.name)
    body.append('upload_preset', UPLOAD_PRESET)
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body,
    })
    if (!res.ok) throw new Error(`Cloudinary a répondu avec le statut ${res.status}`)
    const data = await res.json()
    if (!data.secure_url) throw new Error("L'URL retournée par Cloudinary est invalide.")
    if (data.width && data.width < MIN_WIDTH_PX) {
      console.warn(`[BannerUpload] Image stockée à ${data.width}×${data.height}px par Cloudinary.`)
      setError(
        `Attention : Cloudinary a réduit l'image à ${data.width}×${data.height}px. ` +
          'Configurez VITE_CLOUDINARY_BANNER_UPLOAD_PRESET avec un preset sans redimensionnement.',
      )
    }
    return data.secure_url
  }

  async function handleConfirm() {
    setUploading(true)
    setError('')
    try {
      let payload = pendingFile
      if (completedCrop?.width && completedCrop?.height && imgRef.current) {
        payload = await cropToBlob(imgRef.current, completedCrop)
      }
      const url = await doUpload(payload)
      onChange(url)
      closeCropModal()
    } catch {
      setError("Échec de l'upload. Vérifiez votre connexion et réessayez.")
    } finally {
      setUploading(false)
    }
  }

  function closeCropModal() {
    setSrcUrl(null)
    setPendingFile(null)
    setCrop(undefined)
    setCompletedCrop(undefined)
    setFreeAspect(false)
  }

  function handleRemove() {
    onChange('')
    setError('')
  }

  if (!isConfigured) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-400">
          Bannière non disponible — configurez{' '}
          <code className="font-mono">VITE_CLOUDINARY_CLOUD_NAME</code> et{' '}
          <code className="font-mono">VITE_CLOUDINARY_UPLOAD_PRESET</code>.
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Crop modal */}
      {srcUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="flex w-full max-w-2xl flex-col gap-4 rounded-xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Recadrer la bannière</h3>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={freeAspect}
                  onChange={(e) => {
                    setFreeAspect(e.target.checked)
                    setCrop(undefined)
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                />
                Recadrage libre
              </label>
            </div>

            <div className="max-h-[60vh] overflow-auto rounded-lg bg-gray-100 flex items-center justify-center">
              <ReactCrop
                crop={crop}
                onChange={(_, pct) => setCrop(pct)}
                onComplete={(px) => setCompletedCrop(px)}
                aspect={freeAspect ? undefined : BANNER_ASPECT}
                minWidth={50}
              >
                <img
                  ref={imgRef}
                  src={srcUrl}
                  alt="Aperçu"
                  onLoad={onImageLoad}
                  className="max-h-[55vh] max-w-full object-contain"
                />
              </ReactCrop>
            </div>

            <p className="text-xs text-gray-400">
              {freeAspect ? 'Recadrage libre' : 'Ratio 5:2 (affichage bannière)'}
              {' — '}faites glisser les coins pour ajuster la sélection.
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={closeCropModal}
                disabled={uploading}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={uploading}
                className="rounded-lg bg-pink-600 px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
              >
                {uploading ? 'Upload en cours…' : 'Confirmer le recadrage'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        {value ? (
          <div className="relative rounded-xl overflow-hidden border border-gray-100 shadow-sm">
            <img
              src={value}
              alt="Bannière de l'événement"
              className="w-full max-h-72 object-cover object-top"
            />
            {!disabled && (
              <button
                type="button"
                onClick={handleRemove}
                className="absolute right-2 top-2 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-gray-700 shadow hover:bg-white"
              >
                Supprimer
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
            className="flex h-[288px] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? (
              <p className="text-sm text-gray-500">Upload en cours…</p>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-600">
                  Cliquer pour ajouter une bannière
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  PNG, JPG, WEBP, GIF · max {MAX_SIZE_MB} Mo
                </p>
              </>
            )}
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled || uploading}
        />

        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    </>
  )
}
