import { useState, useEffect } from 'react'
import { Search, ChevronRight, ChevronDown, StickyNote, Check, X, Minus, Plus } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useAppStore } from '../../stores/appStore'
import { format, subMonths } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  updateUserProfile,
  setMonthlyPaymentStatus,
  getMonthlyPayments,
} from '../../lib/firestore'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import { cn } from '../../lib/utils'

export default function AdminUsers() {
  const { currentUser } = useAuth()
  const { users, usersLoaded, loadUsers, updateUserInStore, currentMonthPaidMap, setCurrentMonthPaid, setCurrentMonthPaidMap: setMonthPaidMap } = useAppStore()
  const [loading, setLoading] = useState(!usersLoaded)
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [monthlyPayments, setMonthlyPaymentsState] = useState([])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const currentYearMonth = format(new Date(), 'yyyy-MM')

  useEffect(() => {
    initUsers()
  }, [])

  async function initUsers() {
    if (usersLoaded) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await loadUsers()
      // Preload current month payment status for mensile users
      const mensileUsers = data.filter((u) => u.paymentType === 'mensile')
      const paidMap = {}
      await Promise.all(
        mensileUsers.map(async (u) => {
          try {
            const payments = await getMonthlyPayments(u.id)
            const current = payments.find((p) => p.id === currentYearMonth)
            paidMap[u.id] = current?.paid || false
          } catch {
            paidMap[u.id] = false
          }
        })
      )
      setMonthPaidMap(paidMap)
    } catch (err) {
      console.error('Error loading users:', err)
    } finally {
      setLoading(false)
    }
  }

  async function openUserDetail(user) {
    setSelectedUser(user)
    setNotes(user.notes || '')
    setShowHistory(false)
    if (user.paymentType === 'mensile') {
      try {
        const payments = await getMonthlyPayments(user.id)
        setMonthlyPaymentsState(payments)
      } catch {
        setMonthlyPaymentsState([])
      }
    }
  }

  async function handlePaymentTypeChange(userId, type) {
    setSaving(true)
    try {
      await updateUserProfile(userId, { paymentType: type })
      updateUserInStore(userId, { paymentType: type })
      if (selectedUser?.id === userId) {
        setSelectedUser((prev) => ({ ...prev, paymentType: type }))
      }
    } catch (err) {
      console.error('Error updating payment type:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleMonthPaid(userId, yearMonth, currentPaid) {
    try {
      await setMonthlyPaymentStatus(userId, yearMonth, !currentPaid)
      setMonthlyPaymentsState((prev) => {
        const existing = prev.find((p) => p.id === yearMonth)
        if (existing) {
          return prev.map((p) => (p.id === yearMonth ? { ...p, paid: !currentPaid } : p))
        }
        return [...prev, { id: yearMonth, paid: !currentPaid }]
      })
      if (yearMonth === currentYearMonth) {
        setCurrentMonthPaid(userId, !currentPaid)
      }
    } catch (err) {
      console.error('Error toggling payment:', err)
    }
  }

  function getUserBookingsCount(userId) {
    return useAppStore.getState().prenotazioni.filter((p) => p.userId === userId).length
  }

  async function handleLessonsPaidUpdate(userId, delta) {
    const user = users.find((u) => u.id === userId)
    const current = user?.lessonsPaid || 0
    const newVal = Math.max(0, current + delta)
    try {
      await updateUserProfile(userId, { lessonsPaid: newVal })
      updateUserInStore(userId, { lessonsPaid: newVal })
      if (selectedUser?.id === userId) {
        setSelectedUser((prev) => ({ ...prev, lessonsPaid: newVal }))
      }
    } catch (err) {
      console.error('Error updating lessons paid:', err)
    }
  }

  async function handleSettle(userId) {
    const booked = getUserBookingsCount(userId)
    try {
      await updateUserProfile(userId, { lessonsPaid: booked })
      updateUserInStore(userId, { lessonsPaid: booked })
      if (selectedUser?.id === userId) {
        setSelectedUser((prev) => ({ ...prev, lessonsPaid: booked }))
      }
    } catch (err) {
      console.error('Error settling:', err)
    }
  }

  async function handleSaveNotes() {
    if (!selectedUser) return
    setSaving(true)
    try {
      await updateUserProfile(selectedUser.id, { notes })
      updateUserInStore(selectedUser.id, { notes })
    } catch (err) {
      console.error('Error saving notes:', err)
    } finally {
      setSaving(false)
    }
  }

  const filteredUsers = users
    .filter((u) => u.id !== currentUser?.uid)
    .filter(
      (u) =>
        (u.displayName || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const aOk = a.paymentType === 'per-lesson'
        ? getUserBookingsCount(a.id) - (a.lessonsPaid || 0) <= 0
        : a.paymentType === 'mensile'
          ? (currentMonthPaidMap[a.id] || false)
          : true
      const bOk = b.paymentType === 'per-lesson'
        ? getUserBookingsCount(b.id) - (b.lessonsPaid || 0) <= 0
        : b.paymentType === 'mensile'
          ? (currentMonthPaidMap[b.id] || false)
          : true
      return aOk === bOk ? 0 : aOk ? 1 : -1
    })

  // Generate last 6 months for monthly payment view
  const recentMonths = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), i)
    return format(d, 'yyyy-MM')
  })

  function isMonthPaid(yearMonth) {
    return monthlyPayments.find((p) => p.id === yearMonth)?.paid || false
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 rounded-full border-2 border-brand-300 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Cerca utente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white/70 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent"
        />
      </div>

      {/* Users list */}
      {filteredUsers.length === 0 ? (
        <Card className="text-center py-8">
          <p className="text-sm text-gray-500">Nessun utente trovato</p>
        </Card>
      ) : (
        filteredUsers.map((user) => {
          const isPerLesson = user.paymentType === 'per-lesson'
          const delta = isPerLesson
            ? getUserBookingsCount(user.id) - (user.lessonsPaid || 0)
            : 0
          const isMensile = user.paymentType === 'mensile'
          const mensileOk = isMensile ? (currentMonthPaidMap[user.id] || false) : true
          const isOk = isPerLesson ? delta <= 0 : mensileOk

          return (
            <Card
              key={user.id}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99] border-l-4',
                isOk ? 'border-l-emerald-400' : 'border-l-amber-400'
              )}
              onClick={() => openUserDetail(user)}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {user.displayName || user.email || 'Senza nome'}
                </p>
              </div>
              <Badge variant={isMensile ? 'brand' : 'default'}>
                {isMensile ? 'Mensile' : 'Per lezione'}
              </Badge>
              {isPerLesson && delta > 0 && (
                <span className="text-xs font-bold text-amber-600">-{delta}</span>
              )}
              {isMensile && !mensileOk && (
                <span className="text-xs font-bold text-amber-600">!</span>
              )}
              <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
            </Card>
          )
        })
      )}

      {/* User detail modal */}
      <Modal
        open={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        title={selectedUser?.displayName || selectedUser?.email || 'Utente'}
      >
        {selectedUser && (
          <div className="space-y-5">
            {/* Payment type selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Tipo pagamento
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePaymentTypeChange(selectedUser.id, 'mensile')}
                  className={cn(
                    'flex-1 py-2 rounded-xl text-sm font-medium transition-all border',
                    selectedUser.paymentType === 'mensile'
                      ? 'bg-brand-50 border-brand-200 text-brand-700'
                      : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                  )}
                >
                  Mensile
                </button>
                <button
                  onClick={() => handlePaymentTypeChange(selectedUser.id, 'per-lesson')}
                  className={cn(
                    'flex-1 py-2 rounded-xl text-sm font-medium transition-all border',
                    selectedUser.paymentType === 'per-lesson'
                      ? 'bg-brand-50 border-brand-200 text-brand-700'
                      : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                  )}
                >
                  Per lezione
                </button>
              </div>
            </div>

            {/* Monthly payment view */}
            {selectedUser.paymentType === 'mensile' && (() => {
              const currentMonth = recentMonths[0]
              const pastMonths = recentMonths.slice(1)
              const currentPaid = isMonthPaid(currentMonth)
              const [cy, cm] = currentMonth.split('-')
              const currentMonthName = format(new Date(parseInt(cy), parseInt(cm) - 1), 'MMMM yyyy', { locale: it })

              return (
                <div className="space-y-3">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Mese corrente
                  </label>
                  <div
                    className={cn(
                      'flex items-center justify-between rounded-xl px-4 py-3 border transition-all',
                      currentPaid
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-red-50 border-red-200'
                    )}
                  >
                    <div>
                      <span className="text-sm font-semibold text-gray-800 capitalize">{currentMonthName}</span>
                      <p className={cn('text-xs font-medium', currentPaid ? 'text-emerald-600' : 'text-red-500')}>
                        {currentPaid ? 'Pagato' : 'Non pagato'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggleMonthPaid(selectedUser.id, currentMonth, currentPaid)}
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                        currentPaid
                          ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                          : 'bg-red-100 text-red-500 hover:bg-red-200'
                      )}
                    >
                      {currentPaid ? <Check size={18} /> : <X size={18} />}
                    </button>
                  </div>

                  {/* Collapsible history */}
                  <button
                    onClick={() => setShowHistory((v) => !v)}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <ChevronDown size={14} className={cn('transition-transform', showHistory && 'rotate-180')} />
                    Storico ({pastMonths.length} mesi)
                  </button>

                  {showHistory && (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {pastMonths.map((ym) => {
                        const paid = isMonthPaid(ym)
                        const [year, month] = ym.split('-')
                        const monthName = format(new Date(parseInt(year), parseInt(month) - 1), 'MMMM yyyy', { locale: it })
                        return (
                          <div
                            key={ym}
                            className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                          >
                            <span className="text-xs text-gray-600 capitalize">{monthName}</span>
                            <button
                              onClick={() => handleToggleMonthPaid(selectedUser.id, ym, paid)}
                              className={cn(
                                'w-6 h-6 rounded-full flex items-center justify-center transition-all',
                                paid
                                  ? 'bg-emerald-100 text-emerald-600'
                                  : 'bg-red-50 text-red-400 hover:bg-red-100'
                              )}
                            >
                              {paid ? <Check size={12} /> : <X size={12} />}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Per-lesson payment view */}
            {selectedUser.paymentType === 'per-lesson' && (() => {
              const booked = getUserBookingsCount(selectedUser.id)
              const paid = selectedUser.lessonsPaid || 0
              const delta = booked - paid

              return (
                <div className="space-y-3">
                  {/* Delta card */}
                  <div
                    className={cn(
                      'rounded-xl px-4 py-3 border text-center',
                      delta > 0
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-emerald-50 border-emerald-200'
                    )}
                  >
                    {delta > 0 ? (
                      <>
                        <p className="text-2xl font-bold text-amber-600">{delta}</p>
                        <p className="text-xs font-medium text-amber-600">
                          {delta === 1 ? 'lezione da saldare' : 'lezioni da saldare'}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-lg font-bold text-emerald-600">In pari</p>
                        <p className="text-xs text-emerald-500">Nessun pagamento in sospeso</p>
                      </>
                    )}
                  </div>

                  {/* Settle button */}
                  {delta > 0 && (
                    <Button
                      className="w-full"
                      onClick={() => handleSettle(selectedUser.id)}
                    >
                      <Check size={16} />
                      Salda ({delta} {delta === 1 ? 'lezione' : 'lezioni'})
                    </Button>
                  )}

                  {/* Info row */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Prenotate: {booked}</span>
                    <span>Pagate: {paid}</span>
                  </div>

                  {/* Manual adjust */}
                  <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                    <span className="text-xs text-gray-500">Correggi pagate</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleLessonsPaidUpdate(selectedUser.id, -1)}
                        className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="text-sm font-semibold text-gray-700 w-6 text-center">{paid}</span>
                      <button
                        onClick={() => handleLessonsPaidUpdate(selectedUser.id, 1)}
                        className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
                <StickyNote size={12} />
                Note
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Note sull'utente..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white/70 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent resize-none"
              />
              <Button size="sm" variant="secondary" onClick={handleSaveNotes} disabled={saving}>
                {saving ? '...' : 'Salva note'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
