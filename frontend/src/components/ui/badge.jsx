export default function Badge({ children, className = '', variant = 'default', ...props }) {
  const variantClasses =
    variant === 'secondary' ? 'bg-gray-100 text-gray-800' : 'bg-indigo-100 text-indigo-700'

  const classes =
    `inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${variantClasses} ${className}`.trim()

  return (
    <span className={classes} {...props}>
      {children}
    </span>
  )
}
