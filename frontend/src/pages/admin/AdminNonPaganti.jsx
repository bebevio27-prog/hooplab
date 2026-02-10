import { useState, useEffect } from 'react'
import { AlertCircle, Calendar, Users, X, Check } from 'lucide-react'
import { format, subMonths } from 'date-fns'
import { it } from 'date-fns/locale'
import { useAppStore } from '../../stores/appStore'
import { getMonthlyPayments, setMonthlyPaymentStatus } from '../../lib/firestore'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import { cn } from '../../lib/utils'

export default function AdminNonPaganti() {
  const { users, usersLoaded, loadUsers } = useAppStore()
  const [loading, setLoading] = useState(!usersLoaded)
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [paymentsData, setPaymentsData] = useState({})
  const [loadingPayments, setLoadingPayments] = useState(true)

  useEffect(() => {
    initData()
  }, [])

  useEffect(() => {
    if (usersLoaded) {
      loadPaymentsForMonth(selectedMonth)
    }
  }, [selectedMonth, usersLoaded])

  async function initData() {
    if (usersLoaded) {
      setLoading(false)
      await loadPaymentsForMonth(selectedMonth)
      return
    }
    setLoading(true)
    try {
      await loadUsers()
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
      setPaymentsData((prev) => ({
        ...prev,
        [userId]: !currentPaid,
      }))
    } catch (err) {
      console.error('Error toggling payment:', err)
      alert('Errore durante laggiornamento del pagamento')
    }
  }

  // Genera ultimi 12 mesi
  const last12Months = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i)
    return format(date, 'yyyy-MM')
  })

  // Filtra solo utenti mensili
  const mensileUsers = users.filter((u) => u.paymentType === 'mensile')

  // Utenti non paganti per il mese selezionato
  const nonPagantiForMonth = mensileUsers.filter((user) => !paymentsData[user.id])

  // Utenti paganti per il mese selezionato
  const pagantiForMonth = mensileUsers.filter((user) => paymentsData[user.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">Caricamento utenti...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Report Pagamenti</h1>
        <p className="text-sm text-gray-500">Visualizza gli utenti che non hanno pagato per mese</p>
      </div>

      {/* Statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Utenti Mensili</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">{mensileUsers.length}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Users className="text-blue-600" size={24} />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Hanno Pagato</p>
              <p className="text-3xl font-bold text-emerald-600 mt-1">{pagantiForMonth.length}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <Check className="text-emerald-600" size={24} />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-white border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Non Hanno Pagato</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{nonPagantiForMonth.length}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="text-red-600" size={24} />
            </div>
          </div>
        </Card>
      </div>

      {/* Selettore mese */}
      <Card>
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Calendar size={16} />
            Seleziona Mese
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-300"
          >
            {last12Months.map((month) => {
              const [year, monthNum] = month.split('-')
              const monthName = format(
                new Date(parseInt(year), parseInt(monthNum) - 1),
                'MMMM yyyy',
                { locale: it }
              )
              return (
                <option key={month} value={month}>
                  {monthName}
                </option>
              )
            })}
          </select>
        </div>
      </Card>

      {loadingPayments ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500">Caricamento pagamenti...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Utenti NON Paganti */}
          <Card className="border-red-200">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="text-red-500" size={20} />
              <h3 className="text-lg font-semibold text-gray-800">
                Non Hanno Pagato ({nonPagantiForMonth.length})
              </h3>
            </div>

            {nonPagantiForMonth.length === 0 ? (
              <div className="text-center py-8">
                <Check className="mx-auto text-emerald-400 mb-3" size={48} />
                <p className="text-gray-500">Tutti gli utenti hanno pagato! 🎉</p>
              </div>
            ) : (
              <div className="space-y-2">
                {nonPagantiForMonth.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-red-50 border border-red-200"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{user.displayName || 'Senza nome'}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                    <button
                      onClick={() => handleTogglePayment(user.id, selectedMonth, false)}
                      className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                      title="Segna come pagato"
                    >
                      <Check size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Utenti Paganti */}
          <Card className="border-emerald-200">
            <div className="flex items-center gap-2 mb-4">
              <Check className="text-emerald-500" size={20} />
              <h3 className="text-lg font-semibold text-gray-800">
                Hanno Pagato ({pagantiForMonth.length})
              </h3>
            </div>

            {pagantiForMonth.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="mx-auto text-gray-300 mb-3" size={48} />
                <p className="text-gray-500">Nessun utente ha ancora pagato</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pagantiForMonth.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{user.displayName || 'Senza nome'}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                    <button
                      onClick={() => handleTogglePayment(user.id, selectedMonth, true)}
                      className="p-2 rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-colors"
                      title="Segna come non pagato"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Tabella riepilogativa ultimi mesi */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Riepilogo Ultimi Mesi</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 font-medium text-gray-600">Mese</th>
                <th className="text-center py-3 px-2 font-medium text-gray-600">Utenti</th>
                <th className="text-center py-3 px-2 font-medium text-gray-600">Pagato</th>
                <th className="text-center py-3 px-2 font-medium text-gray-600">Non Pagato</th>
                <th className="text-center py-3 px-2 font-medium text-gray-600">% Pagato</th>
              </tr>
            </thead>
            <tbody>
              {last12Months.slice(0, 6).map((month) => {
                const [year, monthNum] = month.split('-')
                const monthName = format(
                  new Date(parseInt(year), parseInt(monthNum) - 1),
                  'MMM yyyy',
                  { locale: it }
                )
                
                // Questo è semplificato - in produzione dovresti caricare i dati per ogni mese
                const isCurrentMonth = month === selectedMonth
                const paid = isCurrentMonth ? pagantiForMonth.length : 0
                const notPaid = isCurrentMonth ? nonPagantiForMonth.length : 0
                const total = mensileUsers.length
                const percentage = total > 0 ? Math.round((paid / total) * 100) : 0

                return (
                  <tr key={month} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-2 capitalize">{monthName}</td>
                    <td className="text-center py-3 px-2">{total}</td>
                    <td className="text-center py-3 px-2">
                      {isCurrentMonth && (
                        <Badge variant="success">{paid}</Badge>
                      )}
                    </td>
                    <td className="text-center py-3 px-2">
                      {isCurrentMonth && notPaid > 0 && (
                        <Badge variant="danger">{notPaid}</Badge>
                      )}
                    </td>
                    <td className="text-center py-3 px-2">
                      {isCurrentMonth && (
                        <span className={cn(
                          'font-medium',
                          percentage >= 80 ? 'text-emerald-600' : 
                          percentage >= 50 ? 'text-amber-600' : 
                          'text-red-600'
                        )}>
                          {percentage}%
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
