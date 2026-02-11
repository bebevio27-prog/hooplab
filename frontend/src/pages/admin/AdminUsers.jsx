import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  Check,
  X,
  Minus,
  Plus,
  UserPlus,
  Calendar,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export default function AdminUsers({ users = [], onUpdateUser, onCreateUser }) {
  const [selectedUser, setSelectedUser] = useState(null)
  const [currentYearMonth] = useState(format(new Date(), 'yyyy-MM'))

  const currentMonthLabel = format(new Date(), 'MMMM yyyy', { locale: it })

  const handleSettleLessons = (userId, delta) => {
    onUpdateUser(userId, {
      lessonsPaid: (users.find(u => u.id === userId)?.lessonsPaid || 0) + delta,
    })
  }

  const handleToggleMonthPaid = (userId, yearMonth, currentPaid) => {
    const user = users.find(u => u.id === userId)
    const updatedPayments = {
      ...(user?.monthlyPayments || {}),
      [yearMonth]: !currentPaid,
    }
    onUpdateUser(userId, { monthlyPayments: updatedPayments })
  }

  const handleSettleMonth = (userId) => {
    handleToggleMonthPaid(userId, currentYearMonth, false)
  }

  const handleCreateUser = () => {
    const name = prompt('Nome nuovo utente:')
    if (!name) return

    const newUser = {
      id: Date.now(),
      name,
      lessonsTotal: 0,
      lessonsPaid: 0,
      monthlyPayments: {},
    }

    onCreateUser(newUser)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Utenti</h1>
        <Button onClick={handleCreateUser}>
          <UserPlus size={16} />
          Nuovo utente
        </Button>
      </div>

      {/* Lista utenti */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Colonna sinistra – lista */}
        <div className="bg-white rounded-2xl shadow-sm border p-4 space-y-2">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">
            Tutti gli utenti
          </h2>

          {users.map(user => (
            <button
              key={user.id}
              onClick={() => setSelectedUser(user)}
              className={cn(
                'w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition',
                selectedUser?.id === user.id
                  ? 'bg-gray-100'
                  : 'hover:bg-gray-50'
              )}
            >
              {user.name}
            </button>
          ))}
        </div>

        {/* Colonna destra – dettagli */}
        <div className="md:col-span-2">
          {selectedUser ? (
            <UserDetails
              user={selectedUser}
              currentYearMonth={currentYearMonth}
              currentMonthLabel={currentMonthLabel}
              onUpdateUser={onUpdateUser}
              onSettleLessons={handleSettleLessons}
              onToggleMonthPaid={handleToggleMonthPaid}
              onSettleMonth={handleSettleMonth}
            />
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border p-6 text-gray-500">
              Seleziona un utente per vedere i dettagli.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ========================= */
/*   COMPONENTE DETTAGLI    */
/* ========================= */

function UserDetails({
  user,
  currentYearMonth,
  currentMonthLabel,
  onUpdateUser,
  onSettleLessons,
  onToggleMonthPaid,
  onSettleMonth,
}) {
  const lessonsTotal = user.lessonsTotal || 0
  const lessonsPaid = user.lessonsPaid || 0
  const delta = Math.max(lessonsTotal - lessonsPaid, 0)

  const currentPaid = !!user.monthlyPayments?.[currentYearMonth]

  return (
    <div className="space-y-6">
      {/* Header utente */}
      <div className="bg-white rounded-2xl shadow-sm border p-5">
        <h2 className="text-xl font-bold">{user.name}</h2>
        <p className="text-sm text-gray-500">Dettagli e pagamenti</p>
      </div>

      {/* BLOCCO LEZIONI */}
      <div className="bg-white rounded-2xl shadow-sm border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">
              Stato lezioni
            </h3>
            <p className="text-xs text-gray-500">
              Totali: {lessonsTotal} • Pagate: {lessonsPaid}
            </p>
          </div>

          {delta > 0 ? (
            <div className="text-right">
              <p className="text-2xl font-bold text-amber-600">{delta}</p>
              <p className="text-xs font-medium text-amber-600">
                {delta === 1 ? 'lezione da saldare' : 'lezioni da saldare'}
              </p>
            </div>
          ) : (
            <p className="text-lg font-bold text-emerald-600">In pari</p>
          )}
        </div>

        {delta > 0 && (
          <Button className="w-full" onClick={() => onSettleLessons(user.id, delta)}>
            <Check size={16} />
            Salda ({delta})
          </Button>
        )}

        <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
          <span className="text-xs text-gray-500">Correggi pagate</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSettleLessons(user.id, -1)}
              className="w-7 h-7 rounded-full bg-white border flex items-center justify-center"
            >
              <Minus size={12} />
            </button>
            <span className="text-sm font-semibold w-6 text-center">
              {lessonsPaid}
            </span>
            <button
              onClick={() => onSettleLessons(user.id, 1)}
              className="w-7 h-7 rounded-full bg-white border flex items-center justify-center"
            >
              <Plus size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* BLOCCO PAGAMENTO MENSILE – STESSO STILE */}
      <div className="bg-white rounded-2xl shadow-sm border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">
              Pagamento mensile
            </h3>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Calendar size={12} />
              {currentMonthLabel}
            </p>
          </div>

          {currentPaid ? (
            <p className="text-lg font-bold text-emerald-600">In pari</p>
          ) : (
            <div className="text-right">
              <p className="text-2xl font-bold text-amber-600">1</p>
              <p className="text-xs font-medium text-amber-600">
                mese da saldare
              </p>
            </div>
          )}
        </div>

        {!currentPaid && (
          <Button className="w-full" onClick={() => onSettleMonth(user.id)}>
            <Check size={16} />
            Salda
          </Button>
        )}

        <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
          <span className="text-xs text-gray-500">Correggi pagamento</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleMonthPaid(user.id, currentYearMonth, true)}
              className="w-7 h-7 rounded-full bg-white border flex items-center justify-center"
            >
              <Minus size={12} />
            </button>
            <span className="text-sm font-semibold w-6 text-center">
              {currentPaid ? 1 : 0}
            </span>
            <button
              onClick={() => onToggleMonthPaid(user.id, currentYearMonth, false)}
              className="w-7 h-7 rounded-full bg-white border flex items-center justify-center"
            >
              <Plus size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
