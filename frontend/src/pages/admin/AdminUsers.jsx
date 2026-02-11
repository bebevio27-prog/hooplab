import { useState, useEffect } from 'react'
import {
  Search, ChevronRight, ChevronDown, StickyNote, Check, X,
  Minus, Plus, AlertCircle, Trash2, UserPlus,
} from 'lucide-react'
import { format, subMonths } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  getCensimento,
  addCensimentoPersona,
  updateCensimentoPersona,
  deleteCensimentoPersona,
  getCensimentoPayments,
  setCensimentoMonthPaid,
} from '../../lib/firestore'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import { cn } from '../../lib/utils'

const EMPTY_FORM = { nome: '', cognome: '', paymentType: 'mensile', note: '' }
const currentYearMonth = format(new Date(), 'yyyy-MM')

export default function AdminUsers() {
  const [persone, setPersone] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Modal dettaglio
  const [selected, setSelected] = useState(null)
  const [payments, setPayments] = useState([])
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  // Modal creazione / modifica
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  // Modal eliminazione
  const [showDelete, setShowDelete] = useState(false)
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { loadPersone() }, [])

  async function loadPersone() {
    setLoading(true)
    try {
      const data = await getCensimento()
      setPersone(data)
    } catch (err) {
      console.error('Errore caricamento censimento:', err)
    } finally {
      setLoading(false)
    }
  }

  // ─── Apertura dettaglio ──────────────────────────────────
  async function openDetail(persona) {
    setSelected(persona)
    setNote(persona.note || '')
    setShowHistory(false)
    if (persona.paymentType === 'mensile') {
      try {
        const p = await getCensimentoPayments(persona.id)
        setPayments(p)
      } catch { setPayments([]) }
    } else {
      setPayments([])
    }
  }

  function closeDetail() { setSelected(null); setPayments([]) }

  // ─── Toggle pagamento mensile ────────────────────────────
  async function toggleMonthPaid(yearMonth, currentPaid) {
    if (!selected) return
    try {
      await setCensimentoMonthPaid(selected.id, yearMonth, !currentPaid)
      setPayments(prev => {
        const existing = prev.find(p => p.id === yearMonth)
        if (existing) return prev.map(p => p.id === yearMonth ? { ...p, paid: !currentPaid } : p)
        return [...prev, { id: yearMonth, paid: !currentPaid }]
      })
    } catch (err) { console.error('Errore toggle pagamento:', err) }
  }

  function isMonthPaid(yearMonth) {
    return payments.find(p => p.id === yearMonth)?.paid || false
  }

  // ─── Aggiorna lezioni pagate (per-lesson) ───────────────
  async function updateLessonsPaid(delta) {
    if (!selected) return
    const current = selected.lessonsPaid || 0
    const newVal = Math.max(0, current + delta)
    try {
      await updateCensimentoPersona(selected.id, { lessonsPaid: newVal })
      const updated = { ...selected, lessonsPaid: newVal }
      setSelected(updated)
      setPersone(prev => prev.map(p => p.id === selected.id ? updated : p))
    } catch (err) { console.error('Errore aggiornamento lezioni:', err) }
  }

  async function saveLessonsPaid() {
    if (!selected) return
    setSaving(true)
    try {
      await updateCensimentoPersona(selected.id, { lessonsPaid: selected.lessonsPaid || 0 })
    } catch (err) { console.error('Errore salvataggio lezioni:', err) }
    finally { setSaving(false) }
  }

  // ─── Salva note ─────────────────────────────────────────
  async function saveNote() {
    if (!selected) return
    setSaving(true)
    try {
      await updateCensimentoPersona(selected.id, { note })
      setSelected(prev => ({ ...prev, note }))
      setPersone(prev => prev.map(p => p.id === selected.id ? { ...p, note } : p))
    } catch (err) { console.error('Errore salvataggio note:', err) }
    finally { setSaving(false) }
  }

  // ─── Crea / Modifica persona ─────────────────────────────
  function openCreate() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setShowForm(true)
  }

  function openEdit(persona) {
    setForm({
      nome: persona.nome || '',
      cognome: persona.cognome || '',
      paymentType: persona.paymentType || 'mensile',
      note: persona.note || '',
    })
    setEditingId(persona.id)
    setShowForm(true)
  }

  async function handleSubmitForm() {
    if (!form.nome.trim() || !form.cognome.trim()) {
      alert('Nome e cognome sono obbligatori')
      return
    }
    setSubmitting(true)
    try {
      if (editingId) {
        await updateCensimentoPersona(editingId, {
          nome: form.nome.trim(),
          cognome: form.cognome.trim(),
          paymentType: form.paymentType,
          note: form.note.trim(),
        })
        setPersone(prev => prev.map(p =>
          p.id === editingId
            ? { ...p, nome: form.nome.trim(), cognome: form.cognome.trim(), paymentType: form.paymentType, note: form.note.trim() }
            : p
        ).sort((a, b) => (a.cognome || '').localeCompare(b.cognome || '')))
        if (selected?.id === editingId) {
          setSelected(prev => ({ ...prev, nome: form.nome.trim(), cognome: form.cognome.trim(), paymentType: form.paymentType, note: form.note.trim() }))
        }
      } else {
        const docRef = await addCensimentoPersona({
          nome: form.nome.trim(),
          cognome: form.cognome.trim(),
          paymentType: form.paymentType,
          note: form.note.trim(),
          lessonsPaid: 0,
        })
        const newPersona = {
          id: docRef.id,
          nome: form.nome.trim(),
          cognome: form.cognome.trim(),
          paymentType: form.paymentType,
          note: form.note.trim(),
          lessonsPaid: 0,
        }
        setPersone(prev => [...prev, newPersona].sort((a, b) => (a.cognome || '').localeCompare(b.cognome || '')))
      }
      setShowForm(false)
    } catch (err) {
      console.error('Errore salvataggio:', err)
      alert('Errore durante il salvataggio')
    } finally { setSubmitting(false) }
  }

  // ─── Elimina persona ────────────────────────────────────
  function confirmDelete(persona) {
    setToDelete(persona)
    setShowDelete(true)
  }

  async function handleDelete() {
    if (!toDelete) return
    setDeleting(true)
    try {
      await deleteCensimentoPersona(toDelete.id)
      setPersone(prev => prev.filter(p => p.id !== toDelete.id))
      setShowDelete(false)
      setToDelete(null)
      if (selected?.id === toDelete.id) closeDetail()
    } catch (err) {
      console.error('Errore eliminazione:', err)
      alert('Errore durante l\'eliminazione')
    } finally { setDeleting(false) }
  }

  // ─── Filtro ricerca ──────────────────────────────────────
  const filtered = persone.filter(p => {
    const full = `${p.nome} ${p.cognome}`.toLowerCase()
    return full.includes(search.toLowerCase())
  })

  // Badge stato pagamento
  function getStatus(persona) {
    if (persona.paymentType === 'mensile') {
      // non possiamo sapere senza caricare i pagamenti, mostriamo il tipo
      return null
    }
    return null
  }

  const recentMonths = Array.from({ length: 6 }, (_, i) => format(subMonths(new Date(), i), 'yyyy-MM'))

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 rounded-full border-2 border-brand-300 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Censimento</h2>
          <p className="text-sm text-gray-500">{persone.length} persone registrate</p>
        </div>
        <Button onClick={openCreate}>
          <UserPlus size={16} />
          Nuova Persona
        </Button>
      </div>

      {/* Ricerca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <Input
          type="text"
          placeholder="Cerca per nome o cognome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <Card className="text-center py-8 text-gray-400">
          {persone.length === 0 ? 'Nessuna persona nel censimento. Aggiungine una!' : 'Nessun risultato per la ricerca.'}
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((persona) => (
            <Card
              key={persona.id}
              className="p-4 transition-all hover:shadow-md cursor-pointer"
              onClick={() => openDetail(persona)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-sm font-semibold">
                    {(persona.cognome || persona.nome || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {persona.cognome} {persona.nome}
                    </p>
                    {persona.note && (
                      <p className="text-xs text-gray-400 truncate max-w-[180px]">{persona.note}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={persona.paymentType === 'mensile' ? 'primary' : 'secondary'}>
                    {persona.paymentType === 'mensile' ? 'Mensile' : 'A lezione'}
                  </Badge>
                  <ChevronRight className="text-gray-400" size={18} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ─── Modal dettaglio ─────────────────────────────── */}
      <Modal
        open={!!selected}
        onClose={closeDetail}
        title={selected ? `${selected.cognome} ${selected.nome}` : ''}
      >
        {selected && (() => {
          const currentPaid = isMonthPaid(currentYearMonth)
          const [cy, cm] = currentYearMonth.split('-')
          const currentMonthName = format(new Date(parseInt(cy), parseInt(cm) - 1), 'MMMM yyyy', { locale: it })
          const pastMonths = recentMonths.slice(1)

          return (
            <div className="space-y-4">

              {/* Azioni header */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => { closeDetail(); openEdit(selected) }}
                  className="text-sm text-brand-600 hover:underline"
                >
                  Modifica dati
                </button>
                <button
                  onClick={() => { confirmDelete(selected); closeDetail() }}
                  className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                  title="Elimina"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Tipo abbonamento (sola lettura, modificabile via "Modifica dati") */}
              <div className="flex gap-2">
                <Badge variant={selected.paymentType === 'mensile' ? 'primary' : 'secondary'} className="text-sm px-3 py-1">
                  {selected.paymentType === 'mensile' ? '📅 Abbonamento mensile' : '🎯 Pagamento a lezione'}
                </Badge>
              </div>

              {/* ── Vista mensile ── */}
              {selected.paymentType === 'mensile' && (
                <div className="space-y-3">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Mese corrente
                  </label>
                  <div className={cn(
                    'flex items-center justify-between rounded-xl px-4 py-3 border transition-all',
                    currentPaid ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
                  )}>
                    <div>
                      <span className="text-sm font-semibold text-gray-800 capitalize">{currentMonthName}</span>
                      <p className={cn('text-xs font-medium', currentPaid ? 'text-emerald-600' : 'text-red-500')}>
                        {currentPaid ? 'Pagato' : 'Non pagato'}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleMonthPaid(currentYearMonth, currentPaid)}
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

                  <button
                    onClick={() => setShowHistory(v => !v)}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <ChevronDown size={14} className={cn('transition-transform', showHistory && 'rotate-180')} />
                    Storico ({pastMonths.length} mesi)
                  </button>

                  {showHistory && (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {pastMonths.map((ym) => {
                        const paid = isMonthPaid(ym)
                        const [y, m] = ym.split('-')
                        const name = format(new Date(parseInt(y), parseInt(m) - 1), 'MMMM yyyy', { locale: it })
                        return (
                          <div key={ym} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                            <span className="text-xs text-gray-600 capitalize">{name}</span>
                            <button
                              onClick={() => toggleMonthPaid(ym, paid)}
                              className={cn(
                                'w-6 h-6 rounded-full flex items-center justify-center transition-all',
                                paid ? 'bg-emerald-100 text-emerald-600' : 'bg-red-50 text-red-400 hover:bg-red-100'
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
              )}

              {/* ── Vista per lezione ── */}
              {selected.paymentType === 'per-lesson' && (
                <div className="space-y-3">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Lezioni pagate
                  </label>
                  <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                    <button
                      onClick={() => updateLessonsPaid(-1)}
                      className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-3xl font-bold text-gray-800">{selected.lessonsPaid || 0}</span>
                    <button
                      onClick={() => updateLessonsPaid(1)}
                      className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <Button size="sm" variant="secondary" className="w-full" onClick={saveLessonsPaid} disabled={saving}>
                    {saving ? '...' : 'Salva lezioni pagate'}
                  </Button>
                </div>
              )}

              {/* Note */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
                  <StickyNote size={12} />
                  Note
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Note..."
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white/70 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
                />
                <Button size="sm" variant="secondary" onClick={saveNote} disabled={saving}>
                  {saving ? '...' : 'Salva note'}
                </Button>
              </div>

            </div>
          )
        })()}
      </Modal>

      {/* ─── Modal crea / modifica ────────────────────────── */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editingId ? 'Modifica Persona' : 'Nuova Persona'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
              <Input
                value={form.nome}
                onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Mario"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cognome *</label>
              <Input
                value={form.cognome}
                onChange={(e) => setForm(f => ({ ...f, cognome: e.target.value }))}
                placeholder="Rossi"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo abbonamento</label>
            <div className="flex gap-2">
              {['mensile', 'per-lesson'].map((type) => (
                <button
                  key={type}
                  onClick={() => setForm(f => ({ ...f, paymentType: type }))}
                  className={cn(
                    'flex-1 py-2.5 rounded-xl text-sm font-medium transition-all border',
                    form.paymentType === type
                      ? 'bg-brand-50 border-brand-200 text-brand-700'
                      : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                  )}
                >
                  {type === 'mensile' ? 'Mensile' : 'A lezione'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note (opzionale)</label>
            <textarea
              value={form.note}
              onChange={(e) => setForm(f => ({ ...f, note: e.target.value }))}
              placeholder="Note sulla persona..."
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="secondary" onClick={() => setShowForm(false)} disabled={submitting}>
              Annulla
            </Button>
            <Button className="flex-1" onClick={handleSubmitForm} disabled={submitting}>
              {submitting ? 'Salvataggio...' : editingId ? 'Salva modifiche' : 'Aggiungi'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── Modal conferma eliminazione ─────────────────── */}
      <Modal
        open={showDelete}
        onClose={() => !deleting && setShowDelete(false)}
        title="Conferma eliminazione"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="text-red-600 mt-0.5 flex-shrink-0" size={20} />
            <div>
              <p className="text-sm text-red-900 font-medium">Stai per eliminare:</p>
              <p className="text-sm text-red-800 mt-1">
                <strong>{toDelete?.cognome} {toDelete?.nome}</strong>
              </p>
            </div>
          </div>
          <p className="text-sm text-red-600 font-medium">Questa azione non può essere annullata.</p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowDelete(false)} disabled={deleting} className="flex-1">
              Annulla
            </Button>
            <Button onClick={handleDelete} disabled={deleting} className="flex-1 bg-red-600 hover:bg-red-700">
              {deleting ? 'Eliminazione...' : 'Elimina'}
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  )
}
