import { useState } from 'react'
import { PROGRAM_OPTIONS_BY_FACULTY } from '../lib/universityData'

export function useEventForm() {
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    time: '',
    endTime: '',
    place: '',
    capacity: '',
    description: '',
  })
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState([])
  const [isRestricted, setIsRestricted] = useState(false)
  const [selectedFaculties, setSelectedFaculties] = useState([])
  const [selectedMajors, setSelectedMajors] = useState([])
  const [selectedDegreeLevels, setSelectedDegreeLevels] = useState([])
  const [bannerImageUrl, setBannerImageUrl] = useState('')
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const availableMajors = [
    ...new Set(selectedFaculties.flatMap((f) => PROGRAM_OPTIONS_BY_FACULTY[f] || [])),
  ]

  function validateForm() {
    const e = {}
    if (!formData.title?.trim()) e.title = 'Le titre est requis'
    if (!formData.place?.trim()) e.place = 'Le lieu est requis'
    if (!formData.time) e.time = 'La date et heure de début est requise'
    if (!formData.category?.trim()) e.category = 'La catégorie est requise'
    if (!formData.description?.trim()) e.description = 'La description est requise'
    if (!formData.capacity || Number(formData.capacity) < 1)
      e.capacity = 'La capacité doit être ≥ 1'
    if (formData.time && formData.endTime && new Date(formData.endTime) <= new Date(formData.time))
      e.endTime = 'La date de fin doit être après la date de début'
    return e
  }

  function handleChange(e) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  function addTag(value) {
    const trimmed = value.trim()
    if (trimmed && !tags.includes(trimmed)) setTags((prev) => [...prev, trimmed])
    setTagInput('')
  }

  function handleTagKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag(tagInput)
    }
  }

  function removeTag(tag) {
    setTags((prev) => prev.filter((t) => t !== tag))
  }

  function toggleFaculty(faculty) {
    setSelectedFaculties((prev) => {
      const next = prev.includes(faculty) ? prev.filter((f) => f !== faculty) : [...prev, faculty]
      const nextAvailable = new Set(next.flatMap((f) => PROGRAM_OPTIONS_BY_FACULTY[f] || []))
      setSelectedMajors((m) => m.filter((maj) => nextAvailable.has(maj)))
      return next
    })
  }

  function toggleMajor(major) {
    setSelectedMajors((prev) =>
      prev.includes(major) ? prev.filter((m) => m !== major) : [...prev, major],
    )
  }

  function toggleDegreeLevel(level) {
    setSelectedDegreeLevels((prev) =>
      prev.includes(level) ? prev.filter((d) => d !== level) : [...prev, level],
    )
  }

  function fieldCls(hasError) {
    return (
      'w-full rounded-md border px-3 py-2 text-sm focus:outline-none ' +
      (hasError ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-pink-500')
    )
  }

  function buildPayload() {
    return {
      title: formData.title.trim(),
      description: formData.description.trim(),
      place: formData.place.trim(),
      time: new Date(formData.time).toISOString(),
      ...(formData.endTime && { endTime: new Date(formData.endTime).toISOString() }),
      ...(formData.capacity !== '' && { capacity: parseInt(formData.capacity, 10) }),
      ...(formData.category.trim() && { category: formData.category.trim() }),
      tags,
      ...(isRestricted && {
        restrictedTo: {
          faculties: selectedFaculties,
          majors: selectedMajors,
          degreeLevels: selectedDegreeLevels,
        },
      }),
    }
  }

  return {
    formData,
    setFormData,
    bannerImageUrl,
    setBannerImageUrl,
    tagInput,
    setTagInput,
    tags,
    setTags,
    isRestricted,
    setIsRestricted,
    selectedFaculties,
    setSelectedFaculties,
    selectedMajors,
    setSelectedMajors,
    selectedDegreeLevels,
    setSelectedDegreeLevels,
    availableMajors,
    errors,
    setErrors,
    submitError,
    setSubmitError,
    isSubmitting,
    setIsSubmitting,
    validateForm,
    handleChange,
    addTag,
    handleTagKeyDown,
    removeTag,
    toggleFaculty,
    toggleMajor,
    toggleDegreeLevel,
    fieldCls,
    buildPayload,
  }
}
