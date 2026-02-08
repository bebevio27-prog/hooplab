import { cn } from '../../lib/utils'

const variants = {
  primary: 'bg-gradient-to-r from-brand-400 to-lavender-400 text-white hover:from-brand-500 hover:to-lavender-500 shadow-md',
  secondary: 'bg-white/80 text-gray-700 hover:bg-white border border-gray-200',
  ghost: 'text-gray-600 hover:bg-gray-100',
  danger: 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200',
}

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
}

export default function Button({ variant = 'primary', size = 'md', className, children, ...props }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
