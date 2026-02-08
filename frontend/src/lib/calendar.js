import { addDays, format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isAfter, isBefore, addWeeks } from 'date-fns'
import { it } from 'date-fns/locale'

export const DAYS_IT = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']
export const DAYS_SHORT_IT = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']

export function getWeekDays(referenceDate) {
  const start = startOfWeek(referenceDate, { weekStartsOn: 1 })
  const end = endOfWeek(referenceDate, { weekStartsOn: 1 })
  return eachDayOfInterval({ start, end })
}

export function formatDate(date) {
  return format(date, 'yyyy-MM-dd')
}

export function formatDateDisplay(date) {
  return format(date, 'd MMM', { locale: it })
}

export function formatDayName(date) {
  return format(date, 'EEE', { locale: it })
}

/**
 * Generate lesson instances for a date range from corsi + overrides.
 * Returns array of { corsoId, corsoName, color, date, startTime, endTime, capacity, cancelled }
 */
export function generateLessons(corsi, overrides, startDate, endDate) {
  const lessons = []
  const days = eachDayOfInterval({ start: startDate, end: endDate })

  for (const corso of corsi) {
    if (!corso.schedule) continue

    for (const day of days) {
      const dayOfWeek = day.getDay()
      const matchingSlots = corso.schedule.filter((s) => s.dayOfWeek === dayOfWeek)

      for (const slot of matchingSlots) {
        const dateStr = formatDate(day)
        const override = overrides.find(
          (o) => o.corsoId === corso.id && o.originalDate === dateStr
        )

        if (override?.cancelled) continue

        lessons.push({
          corsoId: corso.id,
          corsoName: corso.name,
          color: corso.color || '#c4b5fd',
          date: dateStr,
          startTime: override?.newStartTime || slot.startTime,
          endTime: override?.newEndTime || slot.endTime,
          capacity: corso.capacity || 10,
          cancelled: false,
        })
      }
    }
  }

  return lessons.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    return a.startTime.localeCompare(b.startTime)
  })
}

/**
 * Check if a date is within the bookable window (now to now+7 days)
 */
export function isBookable(dateStr) {
  const now = new Date()
  const date = new Date(dateStr + 'T23:59:59')
  const maxDate = addDays(now, 7)
  return isAfter(date, now) && isBefore(new Date(dateStr + 'T00:00:00'), maxDate)
}

/**
 * Parse "HH:mm" to minutes since midnight for positioning
 */
export function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/**
 * Get hour range for calendar display
 */
export function getCalendarHours(lessons) {
  if (!lessons.length) return { start: 8, end: 21 }
  let min = 24, max = 0
  for (const l of lessons) {
    const startH = parseInt(l.startTime.split(':')[0])
    const endH = parseInt(l.endTime.split(':')[0])
    if (startH < min) min = startH
    if (endH > max) max = endH
  }
  return { start: Math.max(0, min - 1), end: Math.min(24, max + 1) }
}
