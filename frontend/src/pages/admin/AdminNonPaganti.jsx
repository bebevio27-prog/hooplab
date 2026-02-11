import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Users, BookOpen, AlertCircle, Check, X, Calendar, BarChart3 } from 'lucide-react'
import { format, subMonths } from 'date-fns'
import { it } from 'date-fns/locale'
import { useAppStore } from '../../stores/appStore'
import { getCensimento, getCensimentoPayments, setCensimentoMonthPaid } from '../../lib/firestore'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import { cn } from '../../lib/utils'
import { PAYMENT_TYPES, getPaymentTypeInfo, isMensile } from './AdminUsers'

const ISCRIZIONE = 30

export default function AdminNonPaganti() {
  const { spese, speseLoaded, loadSpese } = useAppStore()

  const [persone, setPersone] = useState([])
  const [loadingPersone, setLoadingPersone] = useState(true)
  const [loadingSpese, setLoadingSpese] = useState(!speseLoaded)
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [paymentsData, setPaymentsData] = useState({})   // { personaId: boolean }
  const [loadingPayments, setLoadingPayments] = useState(true)
  const [activeTab, setActiveTab] = useState('riepilogo')

  useEffect(() => { initData() }, [])

  useEffect(() => {
    if (!loadingPersone) loadPaymentsForMonth(selectedMonth)
  }, [selectedMonth, loadingPersone])

  async function initData() {
    try {
      const ops = [getCensimento()]
      if (!speseLoaded) ops.push(loadSpese())
      const [censData] = await Promise.all(ops)
      setPersone(censData)
    } catch (err) {
      console.error('Errore init:', err)
    } finally {
      setLoadingPersone(false)
      setLoadingSpese(false)
    }
  }

  async function loadPaymentsForMonth(yearMonth) {
    setLoadingPayments(true)
    const mensili = persone.filter(p => isMensile(p.paymentType))
    const map = {}
    await Promise.all(
      mensili.map(async (p) => {
        try {
          const payments = await getCensimentoPayments(p.id)
          const found = payments.find(pay => pay.id === yearMonth)
          map[p.id] = found?.paid || false
        } catch { map[p.id] = false }
      })
    )
    setPaymentsData(map)
    setLoadingPayments(false)
  }

  async function handleTogglePayment(personaId, currentPaid) {
    try {
      await setCensimentoMonthPaid(personaId, selectedMonth, !currentPaid)
      setPaymentsData(prev => ({ ...prev, [personaId]: !currentPaid }))
    } catch (err) { console.error('Errore toggle:', err) }
  }

  const last12Months = Array.from({ length: 12 }, (_, i) =>
    format(subMonths(new Date(), i), 'yyyy-MM')
  )

  function formatMonth(ym) {
    const [y, m] = ym.split('-')
    return format(new Date(parseInt(y), parseInt(m) - 1), 'MMMM yyyy', { locale: it })
  }

  // ── Calcoli entrate ──────────────────────────────────────
  const mensili = persone.filter(p => isMensile(p.paymentType))
  const perLezione = persone.filter(p => p.paymentType === 'per-lesson')

  // Per ogni tipo mensile: quanti hanno pagato questo mese
  const mensileBreakdown = PAYMENT_TYPES.filter(t => t.value !== 'per-lesson').map(type => {
    const group = mensili.filter(p => p.paymentType === type.value)
    const paganti = group.filter(p => paymentsData[p.id])
    const nonPaganti = group.filter(p => !paymentsData[p.id])
    return { type, group, paganti, nonPaganti, totale: paganti.length * type.price }
  })

  const pagantiMensile = mensili.filter(p => paymentsData[p.id])
  const nonPagantiMensile = mensili.filter(p => !paymentsData[p.id])

  const entrateMensile = mensileBreakdown.reduce((s, b) => s + b.totale, 0)

  const perLessoneTotale = perLezione.reduce((s, p) => s + (p.lessonsPaid || 0), 0)
  const entrateLezioni = perLessoneTotale * 20  // PREZZO_LEZIONE = 20

  // ── Spese del mese ───────────────────────────────────────
  const speseDelMese = spese.filter(s => s.yearMonth === selectedMonth)
  const totaleSpese = speseDelMese.reduce((s, sp) => s + sp.amount, 0)

  const totaleEntrate = entrateMensile + entrateLezioni
  const bilancio = totaleEntrate - totaleSpese

  // Crediti mensili non ancora pagati
  const creditiMensili = mensileBreakdown.reduce(
    (s, b) => s + b.nonPaganti.length * b.type.price, 0
  )

  if (loadingPersone || loadingSpese) {
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
        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
          <Calendar size={16} /> Seleziona Mese
        </label>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-300"
        >
          {last12Months.map((month) => (
            <option key={month} value={month}>{formatMonth(month)}</option>
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
          <div className={cn(
            'rounded-2xl p-6 border-2 text-center',
            bilancio >= 0
              ? 'bg-gradient-to-br from-emerald-50 to-white border-emerald-300'
              : 'bg-gradient-to-br from-red-50 to-white border-red-300'
          )}>
            <p className="text-sm font-medium text-gray-500 mb-1">Bilancio del mese</p>
            <p className={cn('text-5xl font-bold mb-1', bilancio >= 0 ? 'text-emerald-600' : 'text-red-600')}>
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
                {mensileBreakdown.filter(b => b.paganti.length > 0).map(b => (
                  <div key={b.type.value} className="flex justify-between text-xs text-gray-500">
                    <span>{b.type.label} ({b.paganti.length})</span>
                    <span className="font-medium">€{b.totale.toFixed(2)}</span>
                  </div>
                ))}
                {perLessoneTotale > 0 && (
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Lezioni ({perLessoneTotale})</span>
                    <span className="font-medium">€{entrateLezioni.toFixed(2)}</span>
                  </div>
                )}
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
                  <p className="text-xs text-gray-400">+{speseDelMese.length - 3} altre</p>
                )}
              </div>
            </Card>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {[
              { key: 'riepilogo', label: 'Riepilogo', icon: BarChart3 },
              { key: 'mensili',   label: `Abbonamenti (${mensili.length})`, icon: Users },
              { key: 'lezioni',   label: `A Lezione (${perLezione.length})`, icon: BookOpen },
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
                  Dettaglio entrate
                </h3>
                <div className="space-y-2">
                  {mensileBreakdown.map(b => (
                    <div key={b.type.value} className="flex items-center justify-between py-2 border-b border-gray-100">
                      <div>
                        <p className="text-sm font-medium text-gray-700">{b.type.label}</p>
                        <p className="text-xs text-gray-400">
                          {b.paganti.length} paganti × €{b.type.price}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-emerald-600">€{b.totale.toFixed(2)}</p>
                    </div>
                  ))}
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Lezioni singole</p>
                      <p className="text-xs text-gray-400">{perLessoneTotale} lezioni × €20</p>
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
                  <div className="space-y-1">
                    {speseDelMese.map((s) => (
                      <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-gray-700 capitalize">{s.type.replace(/_/g, ' ')}</p>
                          {s.description && <p className="text-xs text-gray-400">{s.description}</p>}
                        </div>
                        <p className="text-sm font-bold text-red-600">€{s.amount.toFixed(2)}</p>
                      </div>
                    ))}
                    <div className="flex justify-between font-semibold text-sm pt-2">
                      <span className="text-gray-600">Totale uscite</span>
                      <span className="text-red-600">€{totaleSpese.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </Card>

              {(creditiMensili > 0 || nonPagantiMensile.length > 0) && (
                <Card className="bg-amber-50 border-amber-200">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-amber-600 mt-0.5 flex-shrink-0" size={18} />
                    <div>
                      <h4 className="font-semibold text-amber-900 text-sm mb-1">Crediti da incassare</h4>
                      {mensileBreakdown.filter(b => b.nonPaganti.length > 0).map(b => (
                        <p key={b.type.value} className="text-xs text-amber-800">
                          {b.nonPaganti.length} {b.type.label.toLowerCase()} non pagati — €{(b.nonPaganti.length * b.type.price).toFixed(2)}
                        </p>
                      ))}
                      <p className="text-xs font-semibold text-amber-900 mt-1">
                        Totale da incassare: €{creditiMensili.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Tab: Abbonamenti */}
          {activeTab === 'mensili' && (
            <div className="space-y-4">
              {mensileBreakdown.map(b => (
                b.group.length === 0 ? null : (
                  <Card key={b.type.value}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-800">{b.type.label}</h3>
                      <span className="text-xs text-gray-400">€{b.type.price}/mese</span>
                    </div>
                    <div className="space-y-2">
                      {b.group.map(persona => {
                        const paid = paymentsData[persona.id] || false
                        return (
                          <div
                            key={persona.id}
                            className={cn(
                              'flex items-center justify-between p-3 rounded-xl border',
                              paid ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
                            )}
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-800">{persona.cognome} {persona.nome}</p>
                            </div>
                            <button
                              onClick={() => handleTogglePayment(persona.id, paid)}
                              className={cn(
                                'p-2 rounded-lg transition-colors',
                                paid
                                  ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                                  : 'bg-red-100 text-red-600 hover:bg-red-200'
                              )}
                              title={paid ? 'Segna come non pagato' : 'Segna come pagato'}
                            >
                              {paid ? <X size={14} /> : <Check size={14} />}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </Card>
                )
              ))}
              {mensili.length === 0 && (
                <Card><p className="text-sm text-gray-400 text-center py-6">Nessun abbonato nel censimento</p></Card>
              )}
            </div>
          )}

          {/* Tab: A Lezione */}
          {activeTab === 'lezioni' && (
            <div className="space-y-2">
              {perLezione.length === 0 ? (
                <Card><p className="text-sm text-gray-400 text-center py-6">Nessuna persona a lezione</p></Card>
              ) : (
                perLezione.map(persona => (
                  <Card key={persona.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold">
                          {(persona.cognome || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{persona.cognome} {persona.nome}</p>
                          <p className="text-xs text-gray-500">{persona.lessonsPaid || 0} lezioni pagate</p>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-emerald-600">
                        €{((persona.lessonsPaid || 0) * 20).toFixed(2)}
                      </p>
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
