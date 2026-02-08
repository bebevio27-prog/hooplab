import { cn } from '../../lib/utils'

export default function Input({ label, className, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="text-sm font-medium text-gray-600">{label}</label>}
      <input
        className={cn(
          'w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white/70 text-gray-800 placeholder:text-gray-400',
          'focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent transition-all',
          className
        )}
        {...props}
      />
    </div>
  )
}
