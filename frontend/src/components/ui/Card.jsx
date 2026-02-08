import { cn } from '../../lib/utils'

export default function Card({ className, children, ...props }) {
  return (
    <div
      className={cn(
        'bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm p-5',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
