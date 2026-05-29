import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import BannerUpload from './BannerUpload.jsx'
import { uploadBannerToCloudinary } from '../../lib/cloudinaryBanner'

// ── Module-level mocks (preserved across vi.resetModules()) ──────────────────

// The signed-upload flow (server-minted signature + Cloudinary POST) lives in
// the cloudinaryBanner helper and is unit-tested separately. Here we only care
// that BannerUpload calls it and reacts to its resolution/rejection.
vi.mock('../../lib/cloudinaryBanner', () => ({
  uploadBannerToCloudinary: vi.fn(),
  MAX_BANNER_BYTES: 5_000_000,
  isBannerOverSized: (file) => file.size > 5_000_000,
  bannerTooLargeMessage: (bytes) => `Bannière trop lourde (${(bytes / 1_000_000).toFixed(1)} MB).`,
}))

// ReactCrop renders a canvas-based widget that is not available in jsdom.
// Replace it with a simple pass-through wrapper.
vi.mock('react-image-crop', () => ({
  default: ({ children }) => <div data-testid="react-crop">{children}</div>,
  centerCrop: (c) => c,
  makeAspectCrop: (c) => c,
}))
vi.mock('react-image-crop/dist/ReactCrop.css', () => ({}))

// ── Canvas stubs (used by cropToBlob, only when completedCrop is set) ────────

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({ drawImage: vi.fn() }))
  HTMLCanvasElement.prototype.toBlob = vi.fn((cb) => cb(new Blob(['img'], { type: 'image/jpeg' })))
})

afterEach(() => {
  vi.clearAllMocks()
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function mkFile(name = 'banner.jpg', type = 'image/jpeg', sizeKB = 200) {
  return new File([new Uint8Array(sizeKB * 1024)], name, { type })
}

/** Fire a change event on the hidden file input with the given file. */
function fireFileChange(container, file) {
  const input = container.querySelector('input[type="file"]')
  fireEvent.change(input, { target: { files: [file] } })
}

describe('BannerUpload', () => {
  it('renders the upload button when no value is provided', () => {
    render(<BannerUpload value="" onChange={vi.fn()} />)
    expect(screen.getByText(/Cliquer pour ajouter une bannière/i)).toBeInTheDocument()
  })

  it('renders banner size hint text', () => {
    render(<BannerUpload value="" onChange={vi.fn()} />)
    expect(screen.getByText(/PNG, JPG, WEBP/i)).toBeInTheDocument()
  })

  it('renders the banner preview image when a value is provided', () => {
    render(
      <BannerUpload
        value="https://res.cloudinary.com/testcloud/image/upload/v1/banner.jpg"
        onChange={vi.fn()}
      />,
    )
    expect(screen.getByAltText(/Bannière de l'événement/i)).toBeInTheDocument()
  })

  it('renders a Supprimer button when a value is set', () => {
    render(<BannerUpload value="https://example.com/banner.jpg" onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /Supprimer/i })).toBeInTheDocument()
  })

  it('calls onChange with an empty string when Supprimer is clicked', () => {
    const onChange = vi.fn()
    render(<BannerUpload value="https://example.com/banner.jpg" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /Supprimer/i }))
    expect(onChange).toHaveBeenCalledWith('')
  })

  it('disables the upload button when disabled prop is true', () => {
    render(<BannerUpload value="" onChange={vi.fn()} disabled />)
    expect(screen.getByRole('button', { name: /Cliquer pour ajouter/i })).toBeDisabled()
  })

  it('shows a type-validation error for unsupported file types', () => {
    const { container } = render(<BannerUpload value="" onChange={vi.fn()} />)
    fireFileChange(container, mkFile('doc.pdf', 'application/pdf'))
    expect(screen.getByText(/Format non supporté/i)).toBeInTheDocument()
  })

  it('rejects GIF (parity with avatar preset — png/jpg/webp only)', () => {
    const { container } = render(<BannerUpload value="" onChange={vi.fn()} />)
    fireFileChange(container, mkFile('anim.gif', 'image/gif'))
    expect(screen.getByText(/Format non supporté/i)).toBeInTheDocument()
  })

  it('shows a size-validation error when the file exceeds 5 MB', () => {
    const { container } = render(<BannerUpload value="" onChange={vi.fn()} />)
    // 6 × 1024 KB = 6 144 KB ≈ 6 MB (> 5 MB limit)
    fireFileChange(container, mkFile('big.jpg', 'image/jpeg', 6 * 1024))
    expect(screen.getByText(/trop lourde/i)).toBeInTheDocument()
  })

  it('opens the crop modal after a valid file is selected', async () => {
    const { container } = render(<BannerUpload value="" onChange={vi.fn()} />)
    fireFileChange(container, mkFile())
    await screen.findByText('Recadrer la bannière')
    expect(screen.getByText('Recadrer la bannière')).toBeInTheDocument()
  })

  it('shows Confirmer and Annuler buttons inside the crop modal', async () => {
    const { container } = render(<BannerUpload value="" onChange={vi.fn()} />)
    fireFileChange(container, mkFile())
    await screen.findByText('Recadrer la bannière')
    expect(screen.getByRole('button', { name: /Confirmer le recadrage/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Annuler/i })).toBeInTheDocument()
  })

  it('closes the crop modal when Annuler is clicked', async () => {
    const { container } = render(<BannerUpload value="" onChange={vi.fn()} />)
    fireFileChange(container, mkFile())
    await screen.findByText('Recadrer la bannière')
    fireEvent.click(screen.getByRole('button', { name: /Annuler/i }))
    await waitFor(() => expect(screen.queryByText('Recadrer la bannière')).not.toBeInTheDocument())
  })

  it('toggles free-aspect mode via the Recadrage libre checkbox', async () => {
    const { container } = render(<BannerUpload value="" onChange={vi.fn()} />)
    fireFileChange(container, mkFile())
    await screen.findByText('Recadrer la bannière')
    const checkbox = screen.getByRole('checkbox', { name: /Recadrage libre/i })
    expect(checkbox).not.toBeChecked()
    fireEvent.click(checkbox)
    expect(checkbox).toBeChecked()
  })

  it('uploads the file and calls onChange with the secure URL on confirm', async () => {
    const onChange = vi.fn()
    uploadBannerToCloudinary.mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/testcloud/image/upload/v1/banner.jpg',
      width: 1200,
    })
    const { container } = render(<BannerUpload value="" onChange={onChange} />)
    fireFileChange(container, mkFile())
    await screen.findByText('Recadrer la bannière')

    fireEvent.click(screen.getByRole('button', { name: /Confirmer le recadrage/i }))

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith(
        'https://res.cloudinary.com/testcloud/image/upload/v1/banner.jpg',
      ),
    )
    expect(uploadBannerToCloudinary).toHaveBeenCalledWith(expect.any(File), 'banner.jpg')
  })

  it('closes the modal after a successful upload', async () => {
    uploadBannerToCloudinary.mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/testcloud/image/upload/v1/banner.jpg',
    })
    const { container } = render(<BannerUpload value="" onChange={vi.fn()} />)
    fireFileChange(container, mkFile())
    await screen.findByText('Recadrer la bannière')

    fireEvent.click(screen.getByRole('button', { name: /Confirmer le recadrage/i }))

    await waitFor(() => expect(screen.queryByText('Recadrer la bannière')).not.toBeInTheDocument())
  })

  it("surfaces the helper's error message when the upload fails", async () => {
    uploadBannerToCloudinary.mockRejectedValue(
      new Error("Trop d'uploads de bannière en peu de temps. Réessaie dans un moment."),
    )
    const { container } = render(<BannerUpload value="" onChange={vi.fn()} />)
    fireFileChange(container, mkFile())
    await screen.findByText('Recadrer la bannière')

    fireEvent.click(screen.getByRole('button', { name: /Confirmer le recadrage/i }))

    expect(await screen.findByText(/Trop d'uploads de bannière/i)).toBeInTheDocument()
  })

  it('falls back to a generic error when the helper throws without a message', async () => {
    uploadBannerToCloudinary.mockRejectedValue(new Error())
    const { container } = render(<BannerUpload value="" onChange={vi.fn()} />)
    fireFileChange(container, mkFile())
    await screen.findByText('Recadrer la bannière')

    fireEvent.click(screen.getByRole('button', { name: /Confirmer le recadrage/i }))

    expect(await screen.findByText(/Échec de l'upload/i)).toBeInTheDocument()
  })
})

// ── Additional coverage ───────────────────────────────────────────────────────

describe('BannerUpload — additional coverage', () => {
  it('hides Supprimer button when disabled prop is true and value is set', () => {
    render(<BannerUpload value="https://example.com/banner.jpg" onChange={vi.fn()} disabled />)
    expect(screen.queryByRole('button', { name: /Supprimer/i })).not.toBeInTheDocument()
    expect(screen.getByAltText(/Bannière de l'événement/i)).toBeInTheDocument()
  })

  it('shows "Ratio 5:2 (affichage bannière)" caption by default', async () => {
    const { container } = render(<BannerUpload value="" onChange={vi.fn()} />)
    fireFileChange(container, mkFile())
    await screen.findByText('Recadrer la bannière')
    expect(screen.getByText(/Ratio 5:2 \(affichage bannière\)/i)).toBeInTheDocument()
  })

  it('shows "Recadrage libre" caption when free-aspect checkbox is checked', async () => {
    const { container } = render(<BannerUpload value="" onChange={vi.fn()} />)
    fireFileChange(container, mkFile())
    await screen.findByText('Recadrer la bannière')
    fireEvent.click(screen.getByRole('checkbox', { name: /Recadrage libre/i }))
    // The caption <p> reads "Recadrage libre — faites glisser..."
    expect(screen.getByText(/Recadrage libre.*faites glisser/i)).toBeInTheDocument()
  })

  it('closes the crop modal when Escape is pressed (document listener)', async () => {
    const { container } = render(<BannerUpload value="" onChange={vi.fn()} />)
    fireFileChange(container, mkFile())
    await screen.findByText('Recadrer la bannière')
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByText('Recadrer la bannière')).not.toBeInTheDocument())
  })

  it('closes the crop modal when Enter is pressed on the backdrop', async () => {
    const { container } = render(<BannerUpload value="" onChange={vi.fn()} />)
    fireFileChange(container, mkFile())
    await screen.findByText('Recadrer la bannière')
    const backdrop = screen.getByRole('presentation')
    fireEvent.keyDown(backdrop, { key: 'Enter', target: backdrop })
    await waitFor(() => expect(screen.queryByText('Recadrer la bannière')).not.toBeInTheDocument())
  })

  it('does not close the modal on backdrop click while uploading', async () => {
    // A never-resolving upload keeps uploading=true.
    uploadBannerToCloudinary.mockReturnValue(new Promise(() => {}))
    const { container } = render(<BannerUpload value="" onChange={vi.fn()} />)
    fireFileChange(container, mkFile())
    await screen.findByText('Recadrer la bannière')

    fireEvent.click(screen.getByRole('button', { name: /Confirmer le recadrage/i }))

    // Now clicking the backdrop should not close the modal
    const backdrop = screen.getByRole('presentation')
    fireEvent.click(backdrop)
    expect(screen.getByText('Recadrer la bannière')).toBeInTheDocument()
  })

  it('shows a Cloudinary size warning when the returned image is smaller than MIN_WIDTH_PX', async () => {
    const onChange = vi.fn()
    uploadBannerToCloudinary.mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/testcloud/image/upload/v1/small.jpg',
      width: 400,
      height: 160,
    })
    const { container } = render(<BannerUpload value="" onChange={onChange} />)
    fireFileChange(container, mkFile())
    await screen.findByText('Recadrer la bannière')

    fireEvent.click(screen.getByRole('button', { name: /Confirmer le recadrage/i }))

    expect(await screen.findByText(/Cloudinary a réduit l'image à 400×160px/i)).toBeInTheDocument()
    expect(onChange).toHaveBeenCalled()
  })
})
