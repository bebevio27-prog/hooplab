import { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = ['00', '15', '30', '45']

export default function TimePicker({ value = '16:00', onChange, label }) {
  const [h, m] = value.split(':')
  const hour = parseInt(h)
  const minute = m || '00'

  function setHour(newH) {
    const clamped = ((newH % 24) + 24) % 24
    onChange(`${String(clamped).padStart(2, '0')}:${minute}`)
  }

  function setMinute(newM) {
    onChange(`${String(hour).padStart(2, '0')}:${newM}`)
  }

  function cycleMinute(dir) {
    const idx = MINUTES.indexOf(minute)
    const next = (idx + dir + MINUTES.length) % MINUTES.length
    setMinute(MINUTES[next])
  }

  return (
    <div className="space-y-1">
      {label && <span className="text-xs text-gray-500">{label}</span>}
      <div className="flex items-center gap-1">
        {/* Hour */}
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={() => setHour(hour + 1)}
            className="p-0.5 text-gray-400 hover:text-gray-600 active:scale-90"
          >
            <ChevronUp size={14} />
          </button>
          <span className="text-lg font-semibold text-gray-800 w-8 text-center tabular-nums">
            {String(hour).padStart(2, '0')}
          </span>
          <button
            type="button"
            onClick={() => setHour(hour - 1)}
            className="p-0.5 text-gray-400 hover:text-gray-600 active:scale-90"
          >
            <ChevronDown size={14} />
          </button>
        </div>

        <span className="text-lg font-semibold text-gray-400 pb-0.5">:</span>

        {/* Minute */}
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={() => cycleMinute(1)}
            className="p-0.5 text-gray-400 hover:text-gray-600 active:scale-90"
          >
            <ChevronUp size={14} />
          </button>
          <span className="text-lg font-semibold text-gray-800 w-8 text-center tabular-nums">
            {minute}
          </span>
          <button
            type="button"
            onClick={() => cycleMinute(-1)}
            className="p-0.5 text-gray-400 hover:text-gray-600 active:scale-90"
          >
            <ChevronDown size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
