import { useState, useEffect } from 'react'
import { Search, ChevronRight, ChevronDown, StickyNote, Check, X, Minus, Plus, AlertCircle, Trash2, UserPlus } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { format, subMonths } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  updatePersona,
  setPersonaMonthlyPayment,
  getPersonaMonthlyPayments,
} from '../../lib/firestore'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import { cn } from '../../lib/utils'

const EMPTY_FORM = {
  nome: '',
  cognome: '',
  telefono: '',
  paymentType: 'mensile',
  notes: '',
}

export default function AdminUsers() {
  const {
    anagrafica,
    anagraficaLoaded,
    loadAnagrafica,
    addPersona,
    editPersona,
    removePersona,
    updatePersonaInStore,
    anagraficaMonthPaidMap,
    setAnagraficaMonthPaid,
    setAnagraficaMonthPaidMap,
  } = useAppStore()

  const [loading, setLoading] = useState(!anagraficaLoaded)
  const [search, setSearch] = useState('')
  const [selectedPersona, setSelectedPersona] = useState(null)
  const [monthlyPayments, setMonthlyPaymentsState] = useState([])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [personaToDelete, setPersonaToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [creating, setCreating] = useState(false)

  const currentYearMonth = format(new Date(), 'yyyy-MM')

  useEffect(() => {
    initAnagrafica()
  }, [])

  async function initAnagrafica() {
    if (anagraficaLoaded) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await loadAnagrafica()
      const mensilePersone = data.filter((p) => p.paymentType === 'mensile')
      const paidMap = {}
      await Promise.all(
        mensilePersone.map(async (p) => {
          try {
            const payments = await getPersonaMonthlyPayments(p.id)
            const current = payments.find((pay) => pay.id === currentYearMonth)
            paidMap[p.id] = current?.paid || false
          } catch {
            paidMap[p.id] = false
          }
        })
      )
      setAnagraficaMonthPaidMap(paidMap)
    } catch (err) {
      console.error('Error loading anagrafica:', err)
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setShowForm(true)
  }

  function openEdit(persona) {
    setForm({
      nome: persona.nome || '',
      cognome: persona.cognome || '',
      telefono: persona.telefono || '',
      paymentType: persona.paymentType || 'mensile',
      notes: persona.notes || '',
    })
    setEditingId(persona.id)
    setShowForm(true)
  }

  async function handleSaveForm() {
    if (!form.nome.trim()) {
      alert('Il nome è obbligatorio')
      return
    }

    setCreating(true)
    try {
      const data = {
        nome: form.nome.trim(),
        cognome: form.cognome.trim(),
        telefono: form.telefono.trim(),
        paymentType: form.paymentType,
        notes: form.notes.trim(),
        lessonsPaid: 0,
      }

      if (editingId) {
        await editPersona(editingId, data)
      } else {
        await addPersona(data)
      }

      setShowForm(false)
      setForm(EMPTY_FORM)
    } catch (err) {
      console.error('Error saving persona:', err)
      alert('Errore durante il salvataggio')
    } finally {
      setCreating(false)
    }
  }

  async function openPersonaDetail(persona) {
    setSelectedPersona(persona)
    setNotes(persona.notes || '')
    setShowHistory(false)
    if (persona.paymentType === 'mensile') {
      try {
        const payments = await getPersonaMonthlyPayments(persona.id)
        setMonthlyPaymentsState(payments)
      } catch {
        setMonthlyPaymentsState([])
      }
    }
  }

  async function handlePaymentTypeChange(personaId, type) {
    setSaving(true)
    try {
      await updatePersona(personaId, { paymentType: type })
      updatePersonaInStore(personaId, { paymentType: type })
      if (selectedPersona?.id === personaId) {
        setSelectedPersona((prev) => ({ ...prev, paymentType: type }))
      }
    } catch (err) {
      console.error('Error updating payment type:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleMonthPaid(personaId, yearMonth, currentPaid) {
    try {
      await setPersonaMonthlyPayment(personaId, yearMonth, !currentPaid)
      setMonthlyPaymentsState((prev) => {
        const existing = prev.find((p) => p.id === yearMonth)
        if (existing) {
          return prev.map((p) => (p.id === yearMonth ? { ...p, paid: !currentPaid } : p))
        }
        return [...prev, { id: yearMonth, paid: !currentPaid }]
      })
      if (yearMonth === currentYearMonth) {
        setAnagraficaMonthPaid(personaId, !currentPaid)
      }
    } catch (err) {
      console.error('Error toggling payment:', err)
    }
  }

  function getPersonaBookingsCount(personaId) {
    // Le persone dell'anagrafica non hanno prenotazioni
    // Questa funzione è qui per mantenere la compatibilità con il sistema per-lesson
    return 0
  }

  async function handleLessonsPaidUpdate(personaId, delta) {
    const persona = anagrafica.find((p) => p.id === personaId)
    const current = persona?.lessonsPaid || 0
    const newVal = Math.max(0, current + delta)
    try {
      await updatePersona(personaId, { lessonsPaid: newVal })
      updatePersonaInStore(personaId, { lessonsPaid: newVal })
      if (selectedPersona?.id === personaId) {
        setSelectedPersona((prev) => ({ ...prev, lessonsPaid: newVal }))
      }
    } catch (err) {
      console.error('Error updating lessons paid:', err)
    }
  }

  async function handleSettle(personaId) {
    const booked = getPersonaBookingsCount(personaId)
    try {
      await updatePersona(personaId, { lessonsPaid: booked })
      updatePersonaInStore(personaId, { lessonsPaid: booked })
      if (selectedPersona?.id === personaId) {
        setSelectedPersona((prev) => ({ ...prev, lessonsPaid: booked }))
      }
    } catch (err) {
      console.error('Error settling:', err)
    }
  }

  async function handleSaveNotes() {
    if (!selectedPersona) return
    setSaving(true)
    try {
      await updatePersona(selectedPersona.id, { notes })
      updatePersonaInStore(selectedPersona.id, { notes })
    } catch (err) {
      console.error('Error saving notes:', err)
    } finally {
      setSaving(false)
    }
  }

  function confirmDelete(persona) {
    setPersonaToDelete(persona)
    setShowDeleteConfirm(true)
  }

  async function handleDelete() {
    if (!personaToDelete) return
    setDeleting(true)
    try {
      await removePersona(personaToDelete.id)
      setShowDeleteConfirm(false)
      setSelectedPersona(null)
      setPersonaToDelete(null)
    } catch (err) {
      console.error('Error deleting persona:', err)
      alert('Errore durante l\'eliminazione')
    } finally {
      setDeleting(false)
    }
  }

  const filteredPersone = anagrafica.filter((p) => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      p.nome?.toLowerCase().includes(s) ||
      p.cognome?.toLowerCase().includes(s) ||
      p.telefono?.toLowerCase().includes(s)
    )
  })

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
            {filteredPersone.length} {filteredPersone.length === 1 ? 'persona' : 'persone'} in archivio
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <UserPlus size={16} />
          Nuova Persona
        </Button>
      </div>

      {/* Info Box */}
      <Card className="!bg-blue-50 !border-blue-200">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="text-blue-600" size={20} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-800 mb-1">
              📋 Censimento Persone
            </p>
            <p className="text-xs text-blue-600">
              Questo è un archivio separato per tracciare persone e pagamenti. 
              Non è collegato agli account di login.
            </p>
          </div>
        </div>
      </Card>

      {/* Barra Ricerca */}
      <Card className="!p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Cerca per nome, cognome o telefono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white/70 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent"
          />
        </div>
      </Card>

      {/* Lista Persone */}
      <div className="space-y-2">
        {filteredPersone.map((persona) => {
          const isPaying = persona.paymentType === 'mensile'
          const isPaid = anagraficaMonthPaidMap[persona.id] || false
          const booked = getPersonaBookingsCount(persona.id)
          const paid = persona.lessonsPaid || 0
          const delta = booked - paid

          return (
            <Card
              key={persona.id}
              className="!p-4 cursor-pointer hover:shadow-md transition-all"
              onClick={() => openPersonaDetail(persona)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-800 truncate">
                      {persona.nome} {persona.cognome || ''}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    {persona.telefono && (
                      <span>📞 {persona.telefono}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 ml-4">
                  <Badge variant={isPaying ? 'primary' : 'secondary'} className="text-xs">
                    {isPaying ? 'Mensile' : 'Per Lezione'}
                  </Badge>

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

        {filteredPersone.length === 0 && (
          <Card className="!p-12 text-center">
            <p className="text-gray-500">
              {search ? 'Nessuna persona trovata' : 'Nessuna persona in archivio'}
            </p>
            {!search && (
              <Button variant="secondary" onClick={openCreate} className="mt-4">
                <UserPlus size={16} />
                Aggiungi Prima Persona
              </Button>
            )}
          </Card>
        )}
      </div>

      {/* Modal Create/Edit */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editingId ? 'Modifica Persona' : 'Nuova Persona'}
        footer={
          <div className="flex gap-2">
            {editingId && (
              <Button
                variant="secondary"
                className="!text-red-600"
                onClick={() => {
                  const persona = anagrafica.find(p => p.id === editingId)
                  if (persona) {
                    setShowForm(false)
                    confirmDelete(persona)
                  }
                }}
              >
                <Trash2 size={16} />
                Elimina
              </Button>
            )}
            <Button 
              className="flex-1" 
              onClick={handleSaveForm} 
              disabled={creating || !form.nome.trim()}
            >
              {creating ? 'Salvataggio...' : editingId ? 'Salva Modifiche' : 'Aggiungi Persona'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nome *"
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              placeholder="Mario"
            />
            <Input
              label="Cognome"
              value={form.cognome}
              onChange={(e) => setForm((f) => ({ ...f, cognome: e.target.value }))}
              placeholder="Rossi"
            />
          </div>

          <Input
            label="Telefono"
            type="tel"
            value={form.telefono}
            onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
            placeholder="+39 123 456 7890"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Tipo di Pagamento
            </label>
            <select
              value={form.paymentType}
              onChange={(e) => setForm((f) => ({ ...f, paymentType: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-300"
            >
              <option value="mensile">Mensile</option>
              <option value="per-lesson">Per Lezione</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Note
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              placeholder="Note aggiuntive..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
            />
          </div>
        </div>
      </Modal>

      {/* Modal Detail */}
      <Modal
        open={!!selectedPersona}
        onClose={() => setSelectedPersona(null)}
        title={selectedPersona ? `${selectedPersona.nome} ${selectedPersona.cognome || ''}` : ''}
      >
        {selectedPersona && (
          <div className="space-y-5">
            {/* Info */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              {selectedPersona.telefono && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">Telefono</span>
                  <span className="text-sm text-gray-800">{selectedPersona.telefono}</span>
                </div>
              )}
            </div>

            {/* Azioni rapide */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setSelectedPersona(null)
                  openEdit(selectedPersona)
                }}
                className="flex-1"
              >
                <Search size={14} />
                Modifica
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => confirmDelete(selectedPersona)}
                className="flex-1 !text-red-600"
              >
                <Trash2 size={14} />
                Elimina
              </Button>
            </div>

            {/* Tipo Pagamento */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-2">
                Tipo di Pagamento
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handlePaymentTypeChange(selectedPersona.id, 'mensile')}
                  disabled={saving}
                  className={cn(
                    'px-4 py-3 rounded-xl font-medium text-sm transition-all',
                    selectedPersona.paymentType === 'mensile'
                      ? 'bg-brand-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  Mensile
                </button>
                <button
                  onClick={() => handlePaymentTypeChange(selectedPersona.id, 'per-lesson')}
                  disabled={saving}
                  className={cn(
                    'px-4 py-3 rounded-xl font-medium text-sm transition-all',
                    selectedPersona.paymentType === 'per-lesson'
                      ? 'bg-brand-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  Per Lezione
                </button>
              </div>
            </div>

            {/* Vista Mensile */}
            {selectedPersona.paymentType === 'mensile' &&
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
                        currentPaid ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">
                          {format(new Date(), 'MMMM yyyy', { locale: it })}
                        </span>
                        <Badge variant={currentPaid ? 'success' : 'warning'}>
                          {currentPaid ? 'Pagato' : 'Da Pagare'}
                        </Badge>
                      </div>
                      <button
                        onClick={() => handleToggleMonthPaid(selectedPersona.id, currentYearMonth, currentPaid)}
                        className={cn(
                          'w-full px-4 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2',
                          currentPaid
                            ? 'bg-white border border-emerald-200 text-emerald-700'
                            : 'bg-amber-500 text-white'
                        )}
                      >
                        {currentPaid ? <Check size={18} /> : <X size={18} />}
                        {currentPaid ? 'Segna Non Pagato' : 'Segna Pagato'}
                      </button>
                    </div>

                    <button
                      onClick={() => setShowHistory((v) => !v)}
                      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600"
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
                                onClick={() => handleToggleMonthPaid(selectedPersona.id, ym, paid)}
                                className={cn(
                                  'w-6 h-6 rounded-full flex items-center justify-center',
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

            {/* Vista Per Lezione */}
            {selectedPersona.paymentType === 'per-lesson' &&
              (() => {
                const paid = selectedPersona.lessonsPaid || 0
                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                      <span className="text-xs text-gray-500">Lezioni pagate</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleLessonsPaidUpdate(selectedPersona.id, -1)}
                          className="w-7 h-7 rounded-full bg-white border flex items-center justify-center"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="text-sm font-semibold w-6 text-center">{paid}</span>
                        <button
                          onClick={() => handleLessonsPaidUpdate(selectedPersona.id, 1)}
                          className="w-7 h-7 rounded-full bg-white border flex items-center justify-center"
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
              <label className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1">
                <StickyNote size={12} />
                Note
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Note..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl border bg-white/70 text-sm resize-none focus:ring-2 focus:ring-brand-300"
              />
              <Button size="sm" variant="secondary" onClick={handleSaveNotes} disabled={saving}>
                Salva note
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Confirm Delete */}
      <Modal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Conferma Eliminazione"
      >
        <div className="space-y-4">
          <p>
            Eliminare <strong>{personaToDelete?.nome} {personaToDelete?.cognome}</strong>?
          </p>
          <p className="text-sm text-gray-500">
            Tutti i dati relativi ai pagamenti verranno eliminati.
          </p>
          <div className="flex gap-2">
            <Button 
              variant="secondary" 
              onClick={() => setShowDeleteConfirm(false)} 
              className="flex-1"
              disabled={deleting}
            >
              Annulla
            </Button>
            <Button 
              onClick={handleDelete} 
              disabled={deleting} 
              className="flex-1 !bg-red-600"
            >
              {deleting ? 'Eliminazione...' : 'Elimina'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
