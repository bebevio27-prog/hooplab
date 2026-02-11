import { useState, useEffect } from 'react'
import { Search, ChevronRight, ChevronDown, StickyNote, Check, X, Minus, Plus, AlertCircle, Trash2, UserPlus } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useAppStore } from '../../stores/appStore'
import { format, subMonths } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  updateUserProfile,
  setMonthlyPaymentStatus,
  getMonthlyPayments,
  deleteUserProfile,
  createUserProfile,
} from '../../lib/firestore'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import { cn } from '../../lib/utils'

export default function AdminUsers() {
  const { currentUser } = useAuth()
  const {
    users,
    usersLoaded,
    loadUsers,
    updateUserInStore,
    removeUserFromStore,
    addUserToStore,
    currentMonthPaidMap,
    setCurrentMonthPaid,
    setCurrentMonthPaidMap: setMonthPaidMap,
  } = useAppStore()

  const [loading, setLoading] = useState(!usersLoaded)
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [monthlyPayments, setMonthlyPaymentsState] = useState([])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [userToDelete, setUserToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const [showCreateUser, setShowCreateUser] = useState(false)
  const [newUserData, setNewUserData] = useState({
    email: '',
    displayName: '',
    paymentType: 'mensile',
    phone: '',
  })
  const [creating, setCreating] = useState(false)

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

  function confirmDeleteUser(user) {
    setUserToDelete(user)
    setShowDeleteConfirm(true)
  }

  async function handleDeleteUser() {
    if (!userToDelete) return
    setDeleting(true)
    try {
      await deleteUserProfile(userToDelete.id)
      removeUserFromStore(userToDelete.id)
      setShowDeleteConfirm(false)
      setSelectedUser(null)
      setUserToDelete(null)
      alert('Utente eliminato con successo')
    } catch (err) {
      console.error('Error deleting user:', err)
      alert("Errore durante l'eliminazione dell'utente")
    } finally {
      setDeleting(false)
    }
  }

  async function handleCreateUser(e) {
    e.preventDefault()
    if (!newUserData.email || !newUserData.displayName) {
      alert('Compila email e nome')
      return
    }

    setCreating(true)
    try {
      // Genera un ID univoco per l'utente
      const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
      
      // Crea il profilo utente direttamente in Firebase
      await createUserProfile(userId, {
        email: newUserData.email,
        displayName: newUserData.displayName,
        paymentType: newUserData.paymentType,
        phone: newUserData.phone || '',
        lessonsPaid: 0,
        notes: '',
        isAnagraficaOnly: true, // Flag per indicare che è solo anagrafica
      })

      // Aggiungi allo store locale
      const newUser = {
        id: userId,
        email: newUserData.email,
        displayName: newUserData.displayName,
        paymentType: newUserData.paymentType,
        phone: newUserData.phone || '',
        lessonsPaid: 0,
        notes: '',
        isAnagraficaOnly: true,
      }
      
      addUserToStore(newUser)

      // Reset form e chiudi modal
      setNewUserData({
        email: '',
        displayName: '',
        paymentType: 'mensile',
        phone: '',
      })
      setShowCreateUser(false)
      
      alert('✅ Utente creato con successo!\n\nQuesto è un utente anagrafico (non può fare login).\nPuoi gestire i suoi pagamenti e note da questa schermata.')
    } catch (err) {
      console.error('Error creating user:', err)
      alert('Errore durante la creazione dell\'utente: ' + err.message)
    } finally {
      setCreating(false)
    }
  }

  const filteredUsers = users.filter((u) => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      u.displayName?.toLowerCase().includes(s) ||
      u.email?.toLowerCase().includes(s)
    )
  })

  // Calcola ultimi 6 mesi per lo storico
  const pastMonths = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), i + 1)
    return format(date, 'yyyy-MM')
  })

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestione Utenti</h1>
          <p className="text-sm text-gray-500">
            {filteredUsers.length} {filteredUsers.length === 1 ? 'utente' : 'utenti'}
          </p>
        </div>
        <Button onClick={() => setShowCreateUser(true)}>
          <UserPlus size={16} />
          Nuovo Utente
        </Button>
      </div>

      {/* Barra Ricerca */}
      <Card className="!p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Cerca per nome o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white/70 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent"
          />
        </div>
      </Card>

      {/* Lista Utenti */}
      <div className="space-y-2">
        {filteredUsers.map((user) => {
          const isPaying = user.paymentType === 'mensile'
          const isPaid = currentMonthPaidMap[user.id] || false
          const booked = getUserBookingsCount(user.id)
          const paid = user.lessonsPaid || 0
          const delta = booked - paid

          return (
            <Card
              key={user.id}
              className="!p-4 cursor-pointer hover:shadow-md transition-all"
              onClick={() => openUserDetail(user)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-800 truncate">
                      {user.displayName || 'Utente'}
                    </h3>
                    {user.isAnagraficaOnly && (
                      <Badge variant="secondary" className="text-xs">
                        Solo Anagrafica
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate">{user.email}</p>
                </div>

                <div className="flex items-center gap-3 ml-4">
                  {/* Badge tipo pagamento */}
                  <Badge variant={isPaying ? 'primary' : 'secondary'} className="text-xs">
                    {isPaying ? 'Mensile' : 'Per Lezione'}
                  </Badge>

                  {/* Stato pagamento */}
                  {isPaying ? (
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center',
                        isPaid ? 'bg-emerald-100' : 'bg-amber-100'
                      )}
                    >
                      {isPaid ? (
                        <Check className="text-emerald-600" size={16} />
                      ) : (
                        <AlertCircle className="text-amber-600" size={16} />
                      )}
                    </div>
                  ) : delta > 0 ? (
                    <div className="text-right">
                      <p className="text-sm font-semibold text-amber-600">{delta}</p>
                      <p className="text-xs text-amber-500">da saldare</p>
                    </div>
                  ) : (
                    <div className="text-right">
                      <p className="text-xs text-emerald-600 font-medium">In pari</p>
                    </div>
                  )}

                  <ChevronRight className="text-gray-400" size={18} />
                </div>
              </div>
            </Card>
          )
        })}

        {filteredUsers.length === 0 && (
          <Card className="!p-12 text-center">
            <p className="text-gray-500">
              {search ? 'Nessun utente trovato' : 'Nessun utente registrato'}
            </p>
          </Card>
        )}
      </div>

      {/* Modal Dettaglio Utente */}
      <Modal
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        title={selectedUser?.displayName || 'Utente'}
      >
        {selectedUser && (
          <div className="space-y-5">
            {/* Info Utente */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">Email</span>
                <span className="text-sm text-gray-800">{selectedUser.email}</span>
              </div>
              {selectedUser.phone && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">Telefono</span>
                  <span className="text-sm text-gray-800">{selectedUser.phone}</span>
                </div>
              )}
              {selectedUser.isAnagraficaOnly && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <Badge variant="secondary" className="text-xs">
                    📋 Solo Anagrafica (non può fare login)
                  </Badge>
                </div>
              )}
            </div>

            {/* Tipo Pagamento */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-2">
                Tipo di Pagamento
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handlePaymentTypeChange(selectedUser.id, 'mensile')}
                  disabled={saving}
                  className={cn(
                    'px-4 py-3 rounded-xl font-medium text-sm transition-all',
                    selectedUser.paymentType === 'mensile'
                      ? 'bg-brand-500 text-white shadow-lg shadow-brand-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  Mensile
                </button>
                <button
                  onClick={() => handlePaymentTypeChange(selectedUser.id, 'per-lesson')}
                  disabled={saving}
                  className={cn(
                    'px-4 py-3 rounded-xl font-medium text-sm transition-all',
                    selectedUser.paymentType === 'per-lesson'
                      ? 'bg-brand-500 text-white shadow-lg shadow-brand-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  Per Lezione
                </button>
              </div>
            </div>

            {/* Vista pagamento mensile */}
            {selectedUser.paymentType === 'mensile' &&
              (() => {
                const currentPaid = monthlyPayments.find((p) => p.id === currentYearMonth)?.paid || false
                const isMonthPaid = (ym) => {
                  return monthlyPayments.find((p) => p.id === ym)?.paid || false
                }

                return (
                  <div className="space-y-3">
                    <div
                      className={cn(
                        'rounded-xl px-4 py-3 border',
                        currentPaid
                          ? 'bg-emerald-50 border-emerald-200'
                          : 'bg-amber-50 border-amber-200'
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          {format(new Date(), 'MMMM yyyy', { locale: it })}
                        </span>
                        <Badge variant={currentPaid ? 'success' : 'warning'}>
                          {currentPaid ? 'Pagato' : 'Da Pagare'}
                        </Badge>
                      </div>

                      <button
                        onClick={() => handleToggleMonthPaid(selectedUser.id, currentYearMonth, currentPaid)}
                        className={cn(
                          'w-full px-4 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all',
                          currentPaid
                            ? 'bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                            : 'bg-amber-500 text-white hover:bg-amber-600'
                        )}
                      >
                        {currentPaid ? <Check size={18} /> : <X size={18} />}
                        {currentPaid ? 'Segna come Non Pagato' : 'Segna come Pagato'}
                      </button>
                    </div>

                    <button
                      onClick={() => setShowHistory((v) => !v)}
                      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <ChevronDown
                        size={14}
                        className={cn('transition-transform', showHistory && 'rotate-180')}
                      />
                      Storico ({pastMonths.length} mesi)
                    </button>

                    {showHistory && (
                      <div className="space-y-1.5 max-h-36 overflow-y-auto">
                        {pastMonths.map((ym) => {
                          const paid = isMonthPaid(ym)
                          const [year, month] = ym.split('-')
                          const monthName = format(
                            new Date(parseInt(year), parseInt(month) - 1),
                            'MMMM yyyy',
                            { locale: it }
                          )
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

            {/* Vista pagamento per lezione */}
            {selectedUser.paymentType === 'per-lesson' &&
              (() => {
                const booked = getUserBookingsCount(selectedUser.id)
                const paid = selectedUser.lessonsPaid || 0
                const delta = booked - paid

                return (
                  <div className="space-y-3">
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

                    {delta > 0 && (
                      <Button className="w-full" onClick={() => handleSettle(selectedUser.id)}>
                        <Check size={16} />
                        Salda ({delta} {delta === 1 ? 'lezione' : 'lezioni'})
                      </Button>
                    )}

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Prenotate: {booked}</span>
                      <span>Pagate: {paid}</span>
                    </div>

                    <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                      <span className="text-xs text-gray-500">Correggi pagate</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleLessonsPaidUpdate(selectedUser.id, -1)}
                          className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="text-sm font-semibold text-gray-700 w-6 text-center">
                          {paid}
                        </span>
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

            {/* Note */}
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

            {/* Elimina Utente */}
            <div className="pt-4 border-t border-gray-200">
              <Button
                variant="secondary"
                className="w-full !text-red-600 !border-red-200 hover:!bg-red-50"
                onClick={() => confirmDeleteUser(selectedUser)}
              >
                <Trash2 size={16} />
                Elimina Utente
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Conferma Eliminazione */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Conferma Eliminazione"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Sei sicuro di voler eliminare <strong>{userToDelete?.displayName}</strong>?
          </p>
          <p className="text-sm text-gray-500">
            Questa azione eliminerà anche tutte le prenotazioni e i pagamenti dell'utente.
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleting}
              className="flex-1"
            >
              Annulla
            </Button>
            <Button
              onClick={handleDeleteUser}
              disabled={deleting}
              className="flex-1 !bg-red-600 hover:!bg-red-700"
            >
              {deleting ? 'Eliminazione...' : 'Elimina'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Creazione Nuovo Utente */}
      <Modal
        isOpen={showCreateUser}
        onClose={() => setShowCreateUser(false)}
        title="Crea Nuovo Utente Anagrafico"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-800 font-medium mb-1">
              ℹ️ Utente Anagrafico
            </p>
            <p className="text-xs text-blue-700">
              Questo utente verrà creato solo per gestione interna (pagamenti, note). 
              Non potrà fare login o prenotare lezioni autonomamente.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome Completo *
            </label>
            <Input
              type="text"
              value={newUserData.displayName}
              onChange={(e) => setNewUserData({ ...newUserData, displayName: e.target.value })}
              placeholder="Mario Rossi"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <Input
              type="email"
              value={newUserData.email}
              onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
              placeholder="mario.rossi@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefono (opzionale)
            </label>
            <Input
              type="tel"
              value={newUserData.phone}
              onChange={(e) => setNewUserData({ ...newUserData, phone: e.target.value })}
              placeholder="+39 123 456 7890"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo di Pagamento
            </label>
            <select
              value={newUserData.paymentType}
              onChange={(e) => setNewUserData({ ...newUserData, paymentType: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-300"
            >
              <option value="mensile">Mensile</option>
              <option value="per-lesson">Per Lezione</option>
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCreateUser(false)}
              disabled={creating}
            >
              Annulla
            </Button>
            <Button type="submit" className="flex-1" disabled={creating}>
              {creating ? 'Creazione...' : 'Crea Utente'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
