export function FormField({ id, label, required, optionalLabel, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
        {optionalLabel && <span className="text-gray-400 font-normal">{optionalLabel}</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

export function CheckboxList({
  options,
  selected,
  onToggle,
  labelFn = (x) => x,
  spanClass,
  labelClass,
  inputClass,
}) {
  return options.map((opt) => (
    <label key={opt} className={labelClass ?? 'flex items-center gap-2 cursor-pointer py-0.5'}>
      <input
        type="checkbox"
        checked={selected.includes(opt)}
        onChange={() => onToggle(opt)}
        className={
          inputClass ?? 'h-4 w-4 shrink-0 rounded border-gray-300 text-pink-600 focus:ring-pink-500'
        }
      />
      <span className={spanClass ?? 'text-xs text-gray-700 leading-snug'}>{labelFn(opt)}</span>
    </label>
  ))
}
