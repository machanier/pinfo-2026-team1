import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { FormField, CheckboxList, EventFormBody } from './EventFormShared'

// ── Stub BannerUpload (canvas / Cloudinary – tested separately) ──────────────
vi.mock('./BannerUpload', () => ({
  default: ({ value, onChange, disabled }) => (
    <div data-testid="banner-upload">
      <button type="button" onClick={() => onChange('url')} disabled={disabled}>
        Upload
      </button>
      {value && <img src={value} alt="banner-preview" />}
    </div>
  ),
}))

// ─────────────────────────────────────────────────────────────────────────────
// FormField
// ─────────────────────────────────────────────────────────────────────────────
describe('FormField', () => {
  it('renders the label text', () => {
    render(
      <FormField id="f" label="Titre">
        <input />
      </FormField>,
    )
    expect(screen.getByText('Titre')).toBeInTheDocument()
  })

  it('renders children inside the field', () => {
    render(
      <FormField id="f" label="Titre">
        <input data-testid="child" />
      </FormField>,
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('shows a red asterisk when required=true', () => {
    render(
      <FormField id="f" label="Titre" required>
        <input />
      </FormField>,
    )
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('does not show an asterisk when required is omitted', () => {
    render(
      <FormField id="f" label="Titre">
        <input />
      </FormField>,
    )
    expect(screen.queryByText('*')).not.toBeInTheDocument()
  })

  it('shows the optionalLabel text', () => {
    render(
      <FormField id="f" label="Fin" optionalLabel="(optionnel)">
        <input />
      </FormField>,
    )
    expect(screen.getByText('(optionnel)')).toBeInTheDocument()
  })

  it('displays the error message when error is set', () => {
    render(
      <FormField id="f" label="Titre" error="Champ requis">
        <input />
      </FormField>,
    )
    expect(screen.getByText('Champ requis')).toBeInTheDocument()
  })

  it('renders no error element when error is falsy', () => {
    const { container } = render(
      <FormField id="f" label="Titre">
        <input />
      </FormField>,
    )
    expect(container.querySelector('p')).toBeNull()
  })

  it('associates the label with the input via htmlFor', () => {
    render(
      <FormField id="myInput" label="Capacité">
        <input id="myInput" />
      </FormField>,
    )
    expect(screen.getByLabelText('Capacité')).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// CheckboxList
// ─────────────────────────────────────────────────────────────────────────────
describe('CheckboxList', () => {
  const options = ['Sport', 'Tech', 'Art']

  it('renders one checkbox per option', () => {
    render(<CheckboxList options={options} selected={[]} onToggle={vi.fn()} />)
    expect(screen.getAllByRole('checkbox')).toHaveLength(3)
  })

  it('renders each option label', () => {
    render(<CheckboxList options={options} selected={[]} onToggle={vi.fn()} />)
    options.forEach((o) => expect(screen.getByText(o)).toBeInTheDocument())
  })

  it('marks selected options as checked', () => {
    render(<CheckboxList options={options} selected={['Tech']} onToggle={vi.fn()} />)
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes[0]).not.toBeChecked()
    expect(checkboxes[1]).toBeChecked()
    expect(checkboxes[2]).not.toBeChecked()
  })

  it('calls onToggle with the option value when a checkbox is changed', () => {
    const onToggle = vi.fn()
    render(<CheckboxList options={options} selected={[]} onToggle={onToggle} />)
    fireEvent.click(screen.getAllByRole('checkbox')[2])
    expect(onToggle).toHaveBeenCalledWith('Art')
  })

  it('applies a custom labelFn to transform displayed labels', () => {
    const labelFn = (x) => x.toUpperCase()
    render(<CheckboxList options={options} selected={[]} onToggle={vi.fn()} labelFn={labelFn} />)
    expect(screen.getByText('SPORT')).toBeInTheDocument()
    expect(screen.getByText('TECH')).toBeInTheDocument()
  })

  it('applies custom spanClass to the label span', () => {
    const { container } = render(
      <CheckboxList options={['X']} selected={[]} onToggle={vi.fn()} spanClass="my-custom-span" />,
    )
    expect(container.querySelector('span.my-custom-span')).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// EventFormBody – helpers
// ─────────────────────────────────────────────────────────────────────────────
function buildForm(overrides = {}) {
  return {
    formData: {
      title: '',
      category: '',
      place: '',
      capacity: '',
      time: '',
      endTime: '',
      description: '',
    },
    handleChange: vi.fn(),
    fieldCls: () => 'field-class',
    errors: {},
    tagInput: '',
    setTagInput: vi.fn(),
    tags: [],
    removeTag: vi.fn(),
    handleTagKeyDown: vi.fn(),
    isRestricted: false,
    setIsRestricted: vi.fn(),
    selectedFaculties: [],
    selectedMajors: [],
    selectedDegreeLevels: [],
    availableMajors: [],
    toggleFaculty: vi.fn(),
    toggleMajor: vi.fn(),
    toggleDegreeLevel: vi.fn(),
    bannerImageUrl: '',
    setBannerImageUrl: vi.fn(),
    isSubmitting: false,
    ...overrides,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EventFormBody
// ─────────────────────────────────────────────────────────────────────────────
describe('EventFormBody', () => {
  it('renders the BannerUpload stub', () => {
    render(<EventFormBody form={buildForm()} />)
    expect(screen.getByTestId('banner-upload')).toBeInTheDocument()
  })

  it('renders general information fields', () => {
    render(<EventFormBody form={buildForm()} />)
    expect(screen.getByLabelText(/Titre/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Catégorie/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Lieu/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Capacité/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Date et heure de début/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Description/)).toBeInTheDocument()
  })

  it('renders the end-time field with an "optionnel" hint', () => {
    render(<EventFormBody form={buildForm()} />)
    expect(screen.getByLabelText(/Date et heure de fin/)).toBeInTheDocument()
    expect(screen.getAllByText('(optionnel)').length).toBeGreaterThanOrEqual(1)
  })

  it('calls handleChange when an input changes', () => {
    const form = buildForm()
    render(<EventFormBody form={form} />)
    fireEvent.change(screen.getByLabelText(/Titre/), { target: { name: 'title', value: 'Test' } })
    expect(form.handleChange).toHaveBeenCalledTimes(1)
  })

  it('displays field-level error messages', () => {
    const form = buildForm({ errors: { title: 'Le titre est requis' } })
    render(<EventFormBody form={form} />)
    expect(screen.getByText('Le titre est requis')).toBeInTheDocument()
  })

  it('renders tags that are in the tags array', () => {
    render(<EventFormBody form={buildForm({ tags: ['React', 'Java'] })} />)
    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.getByText('Java')).toBeInTheDocument()
  })

  it("calls removeTag when a tag's remove button is clicked", () => {
    const form = buildForm({ tags: ['React'] })
    render(<EventFormBody form={form} />)
    fireEvent.click(screen.getByRole('button', { name: /Supprimer le tag React/i }))
    expect(form.removeTag).toHaveBeenCalledWith('React')
  })

  it('calls setTagInput when typing in the tag input', () => {
    const form = buildForm()
    render(<EventFormBody form={form} />)
    fireEvent.change(screen.getByPlaceholderText(/emploi/i), {
      target: { value: 'nouveau' },
    })
    expect(form.setTagInput).toHaveBeenCalled()
  })

  it('renders the restrictions checkbox unchecked by default', () => {
    render(<EventFormBody form={buildForm()} />)
    expect(screen.getByRole('checkbox', { name: /Restreindre/i })).not.toBeChecked()
  })

  it('does not render faculties/majors/degree sections when isRestricted=false', () => {
    render(<EventFormBody form={buildForm({ isRestricted: false })} />)
    expect(screen.queryByText(/Facultés autorisées/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Niveaux de diplôme/i)).not.toBeInTheDocument()
  })

  it('shows faculties and degree sections when isRestricted=true', () => {
    render(<EventFormBody form={buildForm({ isRestricted: true })} />)
    expect(screen.getByText(/Facultés autorisées/i)).toBeInTheDocument()
    expect(screen.getByText(/Niveaux de diplôme/i)).toBeInTheDocument()
  })

  it('calls setIsRestricted when the restriction checkbox is toggled', () => {
    const form = buildForm()
    render(<EventFormBody form={form} />)
    fireEvent.click(screen.getByRole('checkbox', { name: /Restreindre/i }))
    expect(form.setIsRestricted).toHaveBeenCalledWith(true)
  })

  it('shows the majors section only when availableMajors is non-empty (isRestricted=true)', () => {
    const noMajors = buildForm({ isRestricted: true, availableMajors: [] })
    const { rerender } = render(<EventFormBody form={noMajors} />)
    expect(screen.queryByText(/Filières autorisées/i)).not.toBeInTheDocument()

    const withMajors = buildForm({
      isRestricted: true,
      availableMajors: ['Informatique', 'Physique'],
    })
    rerender(<EventFormBody form={withMajors} />)
    expect(screen.getByText(/Filières autorisées/i)).toBeInTheDocument()
  })

  it('passes isSubmitting to BannerUpload as disabled', () => {
    render(<EventFormBody form={buildForm({ isSubmitting: true })} />)
    expect(screen.getByRole('button', { name: 'Upload' })).toBeDisabled()
  })

  it('renders category options from EVENT_CATEGORIES', () => {
    render(<EventFormBody form={buildForm()} />)
    const select = screen.getByLabelText(/Catégorie/)
    expect(select).toBeInTheDocument()
    // At least one real category option must be present
    expect(screen.getByRole('option', { name: 'Conférence' })).toBeInTheDocument()
  })

  it('shows the current category value even if it is not in EVENT_CATEGORIES', () => {
    const form = buildForm({ formData: { ...buildForm().formData, category: 'Custom Cat' } })
    render(<EventFormBody form={form} />)
    expect(screen.getByRole('option', { name: 'Custom Cat' })).toBeInTheDocument()
  })
})
