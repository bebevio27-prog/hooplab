import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Users, BookOpen, AlertCircle, Check, X, Calendar, BarChart3 } from 'lucide-react'
import { format, subMonths } from 'date-fns'
import { it } from 'date-fns/locale'
import { useAppStore } from '../../stores/appStore'
import { getMonthlyPayments, setMonthlyPaymentStatus } from '../../lib/firestore'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import { cn } from '../../lib/utils'

// Prezzo mensile e prezzo per lezione (modifica secondo le tue tariffe)
const PREZZO_MENSILE = 60
const PREZZO_LEZIONE = 10

export default function AdminNonPaganti() {
  const { users, usersLoaded, loadUsers, spese, speseLoaded, loadSpese, prenotazioni } = useAppStore()

  const [loading, setLoading] = useState(!usersLoaded || !speseLoaded)
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [paymentsData, setPaymentsData] = useState({})
  const [loadingPayments, setLoadingPayments] = useState(true)
  const [activeTab, setActiveTab] = useState('riepilogo')

  useEffect(() => {
    initData()
  }, [])

  useEffect(() => {
    if (usersLoaded) {
      loadPaymentsForMonth(selectedMonth)
    }
  }, [selectedMonth, usersLoaded])

  async function initData() {
    setLoading(true)
    try {
      const ops = []
      if (!usersLoaded) ops.push(loadUsers())
      if (!speseLoaded) ops.push(loadSpese())
      await Promise.all(ops)
      await loadPaymentsForMonth(selectedMonth)
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadPaymentsForMonth(yearMonth) {
    setLoadingPayments(true)
    const mensileUsers = users.filter((u) => u.paymentType === 'mensile')
    const paymentsMap = {}

    await Promise.all(
      mensileUsers.map(async (user) => {
        try {
          const payments = await getMonthlyPayments(user.id)
          const monthPayment = payments.find((p) => p.id === yearMonth)
          paymentsMap[user.id] = monthPayment?.paid || false
        } catch {
          paymentsMap[user.id] = false
        }
      })
    )

    setPaymentsData(paymentsMap)
    setLoadingPayments(false)
  }

  async function handleTogglePayment(userId, yearMonth, currentPaid) {
    try {
      await setMonthlyPaymentStatus(userId, yearMonth, !currentPaid)
      setPaymentsData((prev) => ({ ...prev, [userId]: !currentPaid }))
    } catch (err) {
      console.error('Error toggling payment:', err)
    }
  }

  const last12Months = Array.from({ length: 12 }, (_, i) => {
    return format(subMonths(new Date(), i), 'yyyy-MM')
  })

  function formatMonth(ym) {
    const [year, month] = ym.split('-')
    return format(new Date(parseInt(year), parseInt(month) - 1), 'MMMM yyyy', { locale: it })
  }

  function getUserBookingsCount(userId) {
    return prenotazioni.filter((p) => p.userId === userId).length
  }

  // Utenti per tipo
  const mensileUsers = users.filter((u) => u.paymentType === 'mensile')
  const perLessonUsers = users.filter((u) => u.paymentType === 'per-lesson')

  // Mensili paganti/non paganti nel mese selezionato
  const pagantiMensile = mensileUsers.filter((u) => paymentsData[u.id])
  const nonPagantiMensile = mensileUsers.filter((u) => !paymentsData[u.id])

  // Entrate mensili
  const entrateMensile = pagantiMensile.length * PREZZO_MENSILE

  // Per-lesson report
  const perLessonReport = perLessonUsers.map((user) => {
    const booked = getUserBookingsCount(user.id)
    const paid = user.lessonsPaid || 0
    const delta = booked - paid
    return { user, booked, paid, delta }
  })

  const perLessonPaid = perLessonReport.filter((r) => r.paid > 0)
  const perLessonUnpaid = perLessonReport.filter((r) => r.delta > 0)
  const entrateLezioni = perLessonPaid.reduce((sum, r) => sum + r.paid * PREZZO_LEZIONE, 0)

  // Spese del mese selezionato
  const speseDelMese = spese.filter((s) => s.yearMonth === selectedMonth)
  const totaleSpese = speseDelMese.reduce((sum, s) => sum + s.amount, 0)

  // Totali
  const totaleEntrate = entrateMensile + entrateLezioni
  const bilancio = totaleEntrate - totaleSpese

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 rounded-full border-2 border-brand-300 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Report Finanziario</h1>
        <p className="text-sm text-gray-500 capitalize">
          {formatMonth(selectedMonth)} — entrate, uscite e bilancio
        </p>
      </div>

      {/* Selettore mese */}
      <Card>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <span className="flex items-center gap-2">
            <Calendar size={16} />
            Seleziona Mese
          </span>
        </label>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-300 capitalize"
        >
          {last12Months.map((month) => (
            <option key={month} value={month} className="capitalize">
              {formatMonth(month)}
            </option>
          ))}
        </select>
      </Card>

      {loadingPayments ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 rounded-full border-2 border-brand-300 border-t-transparent animate-spin" />
        </div>
      ) : (
        <>
          {/* Bilancio principale */}
          <div
            className={cn(
              'rounded-2xl p-6 border-2 text-center',
              bilancio >= 0
                ? 'bg-gradient-to-br from-emerald-50 to-white border-emerald-300'
                : 'bg-gradient-to-br from-red-50 to-white border-red-300'
            )}
          >
            <p className="text-sm font-medium text-gray-500 mb-1">Bilancio del mese</p>
            <p
              className={cn(
                'text-5xl font-bold mb-1',
                bilancio >= 0 ? 'text-emerald-600' : 'text-red-600'
              )}
            >
              {bilancio >= 0 ? '+' : ''}€{bilancio.toFixed(2)}
            </p>
            <p className="text-xs text-gray-400 capitalize">{formatMonth(selectedMonth)}</p>
          </div>

          {/* Entrate vs Uscite */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Entrate</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">€{totaleEntrate.toFixed(2)}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <TrendingUp className="text-emerald-600" size={20} />
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Mensili ({pagantiMensile.length})</span>
                  <span className="font-medium">€{entrateMensile.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Lezioni pagate</span>
                  <span className="font-medium">€{entrateLezioni.toFixed(2)}</span>
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-red-50 to-white border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Uscite</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">€{totaleSpese.toFixed(2)}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <TrendingDown className="text-red-600" size={20} />
                </div>
              </div>
              <div className="mt-3 space-y-1">
                {speseDelMese.length === 0 ? (
                  <p className="text-xs text-gray-400">Nessuna spesa registrata</p>
                ) : (
                  speseDelMese.slice(0, 3).map((s) => (
                    <div key={s.id} className="flex justify-between text-xs text-gray-500">
                      <span className="truncate">{s.description || s.type}</span>
                      <span className="font-medium ml-2">€{s.amount.toFixed(2)}</span>
                    </div>
                  ))
                )}
                {speseDelMese.length > 3 && (
                  <p className="text-xs text-gray-400">+{speseDelMese.length - 3} altre spese</p>
                )}
              </div>
            </Card>
          </div>

          {/* Tabs */}
          <div className="flex gap-0 border-b border-gray-200 overflow-x-auto">
            {[
              { key: 'riepilogo', label: 'Riepilogo', icon: BarChart3 },
              { key: 'mensili', label: `Mensili (${mensileUsers.length})`, icon: Users },
              { key: 'lezioni', label: `A Lezione (${perLessonUsers.length})`, icon: BookOpen },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                  activeTab === key
                    ? 'border-brand-500 text-brand-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          {/* Tab: Riepilogo */}
          {activeTab === 'riepilogo' && (
            <div className="space-y-4">
              <Card>
                <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <TrendingUp className="text-emerald-500" size={18} />
                  Riepilogo entrate
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Abbonamenti mensili</p>
                      <p className="text-xs text-gray-400">
                        {pagantiMensile.length} paganti × €{PREZZO_MENSILE}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-emerald-600">€{entrateMensile.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Lezioni singole pagate</p>
                      <p className="text-xs text-gray-400">
                        {perLessonPaid.reduce((s, r) => s + r.paid, 0)} lezioni × €{PREZZO_LEZIONE}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-emerald-600">€{entrateLezioni.toFixed(2)}</p>
                  </div>
                  <div className="flex justify-between font-semibold text-sm pt-1">
                    <span className="text-gray-600">Totale entrate</span>
                    <span className="text-emerald-600">€{totaleEntrate.toFixed(2)}</span>
                  </div>
                </div>
              </Card>

              <Card>
                <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <TrendingDown className="text-red-500" size={18} />
                  Spese del mese
                </h3>
                {speseDelMese.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">Nessuna spesa registrata</p>
                ) : (
                  <div className="space-y-2">
                    {speseDelMese.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-700 capitalize">
                            {s.type.replace(/_/g, ' ')}
                          </p>
                          {s.description && <p className="text-xs text-gray-400">{s.description}</p>}
                        </div>
                        <p className="text-sm font-bold text-red-600">€{s.amount.toFixed(2)}</p>
                      </div>
                    ))}
                    <div className="flex justify-between font-semibold text-sm pt-1">
                      <span className="text-gray-600">Totale uscite</span>
                      <span className="text-red-600">€{totaleSpese.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </Card>

              {(nonPagantiMensile.length > 0 || perLessonUnpaid.length > 0) && (
                <Card className="bg-amber-50 border-amber-200">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-amber-600 mt-0.5 flex-shrink-0" size={18} />
                    <div>
                      <h4 className="font-semibold text-amber-900 text-sm mb-2">Crediti ancora da incassare</h4>
                      {nonPagantiMensile.length > 0 && (
                        <p className="text-xs text-amber-800">
                          {nonPagantiMensile.length} mensili non pagati — €{(nonPagantiMensile.length * PREZZO_MENSILE).toFixed(2)} da incassare
                        </p>
                      )}
                      {perLessonUnpaid.length > 0 && (
                        <p className="text-xs text-amber-800 mt-1">
                          {perLessonUnpaid.reduce((s, r) => s + r.delta, 0)} lezioni non saldate — €{(perLessonUnpaid.reduce((s, r) => s + r.delta, 0) * PREZZO_LEZIONE).toFixed(2)} da incassare
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Tab: Mensili */}
          {activeTab === 'mensili' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="border-emerald-200">
                <div className="flex items-center gap-2 mb-4">
                  <Check className="text-emerald-500" size={18} />
                  <h3 className="font-semibold text-gray-800">
                    Hanno Pagato ({pagantiMensile.length})
                  </h3>
                </div>
                {pagantiMensile.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">Nessun pagamento ancora</p>
                ) : (
                  <div className="space-y-2">
                    {pagantiMensile.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-800">{user.displayName || 'Senza nome'}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                        <button
                          onClick={() => handleTogglePayment(user.id, selectedMonth, true)}
                          className="p-2 rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-colors"
                          title="Segna come non pagato"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="border-red-200">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="text-red-500" size={18} />
                  <h3 className="font-semibold text-gray-800">
                    Non Hanno Pagato ({nonPagantiMensile.length})
                  </h3>
                </div>
                {nonPagantiMensile.length === 0 ? (
                  <div className="text-center py-6">
                    <Check className="mx-auto text-emerald-400 mb-2" size={36} />
                    <p className="text-sm text-gray-500">Tutti hanno pagato! 🎉</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {nonPagantiMensile.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-red-50 border border-red-200"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-800">{user.displayName || 'Senza nome'}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                        <button
                          onClick={() => handleTogglePayment(user.id, selectedMonth, false)}
                          className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                          title="Segna come pagato"
                        >
                          <Check size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Tab: A Lezione */}
          {activeTab === 'lezioni' && (
            <div className="space-y-2">
              {perLessonUsers.length === 0 ? (
                <Card>
                  <p className="text-sm text-gray-400 text-center py-6">Nessun utente a lezione</p>
                </Card>
              ) : (
                perLessonReport.map(({ user, booked, paid, delta }) => (
                  <Card
                    key={user.id}
                    className={cn(
                      'p-4',
                      delta > 0 ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50/30'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold',
                            delta > 0 ? 'bg-amber-200 text-amber-700' : 'bg-emerald-200 text-emerald-700'
                          )}
                        >
                          {(user.displayName || user.email || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{user.displayName || 'Senza nome'}</p>
                          <p className="text-xs text-gray-500">
                            {booked} prenotate · {paid} pagate
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {delta > 0 ? (
                          <Badge variant="warning">{delta} da saldare</Badge>
                        ) : (
                          <Badge variant="success">In pari</Badge>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          €{(paid * PREZZO_LEZIONE).toFixed(2)} incassati
                        </p>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
