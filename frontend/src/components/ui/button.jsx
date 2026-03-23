export default function Button({ children, className = '', type = 'button', ...props }) {
  const classes =
    `inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium bg-black text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed ${className}`.trim()

  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  )
}
