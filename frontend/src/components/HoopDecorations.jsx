export function HoopRing({ className = '', size = 120, opacity = 0.08, strokeWidth = 2 }) {
  return (
    <svg
      className={`absolute pointer-events-none ${className}`}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
    >
      <circle
        cx="50"
        cy="50"
        r={48 - strokeWidth}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        opacity={opacity}
      />
    </svg>
  )
}

export function HoopArcs({ className = '', opacity = 0.06 }) {
  return (
    <svg
      className={`absolute pointer-events-none ${className}`}
      width="200"
      height="200"
      viewBox="0 0 200 200"
      fill="none"
    >
      <path
        d="M 20 100 A 80 80 0 0 1 180 100"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity={opacity}
        strokeLinecap="round"
      />
      <path
        d="M 40 100 A 60 60 0 0 1 160 100"
        stroke="currentColor"
        strokeWidth="1"
        opacity={opacity * 0.7}
        strokeLinecap="round"
      />
    </svg>
  )
}

export function BackgroundHoops() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <HoopRing className="text-brand-400 -top-10 -right-10" size={180} opacity={0.06} strokeWidth={1.5} />
      <HoopRing className="text-lavender-400 top-1/3 -left-16" size={220} opacity={0.05} strokeWidth={1} />
      <HoopRing className="text-brand-300 bottom-20 right-10" size={100} opacity={0.07} strokeWidth={1.5} />
      <HoopArcs className="text-lavender-300 top-16 left-1/2 -translate-x-1/2 rotate-12" opacity={0.05} />
      <HoopRing className="text-peach-300 bottom-1/4 left-1/4" size={140} opacity={0.04} strokeWidth={1} />
    </div>
  )
}
