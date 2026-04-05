export default function Button({
  children,
  className = '',
  type = 'button',
  variant = 'default',
  ...props
}) {
  const variantClasses =
    variant === 'ghost'
      ? 'bg-transparent text-gray-700 hover:bg-gray-100'
      : 'bg-black text-white hover:opacity-90'

  const classes =
    `inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses} ${className}`.trim()

  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  )
}
