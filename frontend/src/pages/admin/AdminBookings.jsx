import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Users } from 'lucide-react'
import { format, startOfWeek, endOfWeek, addWeeks } from 'date-fns'
import { it } from 'date-fns/locale'
import { useAppStore } from '../../stores/appStore'
import { generateLessons, getWeekDays } from '../../lib/calendar'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'

export default function AdminBookings() {
  const { corsi, overrides, prenotazioni, loaded } = useAppStore()
  const [weekOffset, setWeekOffset] = useState(0)

  const referenceDate = addWeeks(new Date(), weekOffset)
  const weekDays = getWeekDays(referenceDate)
  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(referenceDate, { weekStartsOn: 1 })

  const lessons = useMemo(
    () => generateLessons(corsi, overrides, weekStart, weekEnd),
    [corsi, overrides, weekStart, weekEnd]
  )

  function getLessonBookings(corsoId, date) {
    return prenotazioni.filter((p) => p.corsoId === corsoId && p.date === date)
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 rounded-full border-2 border-brand-300 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setWeekOffset((w) => w - 1)}
          className="p-2 rounded-xl hover:bg-white/60 transition-colors"
        >
          <ChevronLeft size={20} className="text-gray-600" />
        </button>
        <p className="text-sm font-medium text-gray-800">
          {format(weekStart, 'd MMM', { locale: it })} – {format(weekEnd, 'd MMM yyyy', { locale: it })}
        </p>
        <button
          onClick={() => setWeekOffset((w) => w + 1)}
          className="p-2 rounded-xl hover:bg-white/60 transition-colors"
        >
          <ChevronRight size={20} className="text-gray-600" />
        </button>
      </div>

      {/* Lessons with bookings */}
      {lessons.length === 0 ? (
        <Card className="text-center py-8">
          <p className="text-sm text-gray-500">Nessuna lezione questa settimana</p>
        </Card>
      ) : (
        lessons.map((lesson, idx) => {
          const bookings = getLessonBookings(lesson.corsoId, lesson.date)
          return (
            <Card key={`${lesson.corsoId}-${lesson.date}-${idx}`} className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: lesson.color }}
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{lesson.corsoName}</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(lesson.date), 'EEE d MMM', { locale: it })} · {lesson.startTime}–{lesson.endTime}
                    </p>
                  </div>
                </div>
                <Badge variant={bookings.length >= lesson.capacity ? 'warning' : 'default'}>
                  <Users size={10} className="mr-1" />
                  {bookings.length}/{lesson.capacity}
                </Badge>
              </div>

              {bookings.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {bookings.map((b) => (
                    <span
                      key={b.id}
                      className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600"
                    >
                      {b.userName}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">Nessuna prenotazione</p>
              )}
            </Card>
          )
        })
      )}
    </div>
  )
}
