export default function Badge({ children, className = '', ...props }) {
  const classes =
    `inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 ${className}`.trim()

  return (
    <span className={classes} {...props}>
      {children}
    </span>
  )
}
