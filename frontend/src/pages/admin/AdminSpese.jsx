import { useState, useEffect } from 'react'
import { Plus, Trash2, Euro, Receipt, Zap, Droplet, Flame, FileText, Edit3 } from 'lucide-react'
import { format, subMonths } from 'date-fns'
import { it } from 'date-fns/locale'
import { useAppStore } from '../../stores/appStore'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import { cn } from '../../lib/utils'

const SPESA_TYPES = [
  { value: 'affitto', label: 'Affitto', icon: Receipt, color: 'blue' },
  { value: 'bolletta_luce', label: 'Bolletta Luce', icon: Zap, color: 'yellow' },
  { value: 'bolletta_acqua', label: 'Bolletta Acqua', icon: Droplet, color: 'cyan' },
  { value: 'bolletta_gas', label: 'Bolletta Gas', icon: Flame, color: 'orange' },
  { value: 'altro', label: 'Altro', icon: FileText, color: 'gray' },
]

const EMPTY_FORM = {
  type: 'affitto',
  amount: '',
  yearMonth: format(new Date(), 'yyyy-MM'),
  description: '',
}

export default function AdminSpese() {
  const { spese, speseLoaded, loadSpese, addSpesa, editSpesa, removeSpesa } = useAppStore()
  
  const [loading, setLoading] = useState(!speseLoaded)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    initSpese()
  }, [])

  async function initSpese() {
    if (speseLoaded) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      await loadSpese()
    } catch (err) {
      console.error('Error loading spese:', err)
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setForm({ ...EMPTY_FORM, yearMonth: selectedMonth })
    setEditingId(null)
    setShowForm(true)
  }

  function openEdit(spesa) {
    setForm({
      type: spesa.type,
      amount: spesa.amount.toString(),
      yearMonth: spesa.yearMonth,
      description: spesa.description || '',
    })
    setEditingId(spesa.id)
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.amount || parseFloat(form.amount) <= 0) {
      alert('Inserisci un importo valido')
      return
    }

    setSaving(true)
    try {
      const data = {
        type: form.type,
        amount: parseFloat(form.amount),
        yearMonth: form.yearMonth,
        description: form.description,
      }

      if (editingId) {
        await editSpesa(editingId, data)
      } else {
        await addSpesa(data)
      }

      setShowForm(false)
    } catch (err) {
      console.error('Error saving spesa:', err)
      alert('Errore durante il salvataggio')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(spesaId) {
    if (!confirm('Eliminare questa spesa?')) return
    try {
      await removeSpesa(spesaId)
    } catch (err) {
      console.error('Error deleting spesa:', err)
      alert('Errore eliminazione')
    }
  }

  // Ultimi 12 mesi
  const last12Months = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i)
    return format(date, 'yyyy-MM')
  })

  // Raggruppa spese per mese
  const speseByMonth = spese.reduce((acc, spesa) => {
    if (!acc[spesa.yearMonth]) {
      acc[spesa.yearMonth] = []
    }
    acc[spesa.yearMonth].push(spesa)
    return acc
  }, {})

  // Totali
  const totalForSelectedMonth = (speseByMonth[selectedMonth] || []).reduce(
    (sum, spesa) => sum + spesa.amount,
    0
  )

  const totalLast12Months = last12Months.reduce((sum, month) => {
    const monthSpese = speseByMonth[month] || []
    return sum + monthSpese.reduce((s, spesa) => s + spesa.amount, 0)
  }, 0)

  const speseForSelectedMonth = speseByMonth[selectedMonth] || []

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
          <h1 className="text-2xl font-bold text-gray-800">Spese Fisse</h1>
          <p className="text-sm text-gray-500">Gestisci affitto, bollette e spese</p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus size={16} />
          Nuova Spesa
        </Button>
      </div>

      {/* Riepilogo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-brand-50 to-white border-brand-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Spese Mese Corrente</p>
              <p className="text-3xl font-bold text-brand-600 mt-1">
                €{totalForSelectedMonth.toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center">
              <Euro className="text-brand-600" size={24} />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-gray-50 to-white border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Totale Ultimi 12 Mesi</p>
              <p className="text-3xl font-bold text-gray-700 mt-1">
                €{totalLast12Months.toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              <Receipt className="text-gray-600" size={24} />
            </div>
          </div>
        </Card>
      </div>

      {/* Selettore mese */}
      <Card>
        <label className="block text-sm font-medium text-gray-700 mb-2">Seleziona Mese</label>
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
      </Card>

      {/* Lista spese */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Spese di{' '}
          {format(
            new Date(selectedMonth.split('-')[0], parseInt(selectedMonth.split('-')[1]) - 1),
            'MMMM yyyy',
            { locale: it }
          )}
        </h3>

        {speseForSelectedMonth.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="mx-auto text-gray-300 mb-3" size={48} />
            <p className="text-gray-500">Nessuna spesa per questo mese</p>
            <Button variant="secondary" onClick={openCreate} className="mt-4">
              <Plus size={16} />
              Aggiungi Spesa
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {speseForSelectedMonth.map((spesa) => {
              const typeInfo = SPESA_TYPES.find((t) => t.value === spesa.type)
              const Icon = typeInfo?.icon || FileText
              const colorClass = {
                blue: 'bg-blue-50 text-blue-600 border-blue-200',
                yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
                cyan: 'bg-cyan-50 text-cyan-600 border-cyan-200',
                orange: 'bg-orange-50 text-orange-600 border-orange-200',
                gray: 'bg-gray-50 text-gray-600 border-gray-200',
              }[typeInfo?.color || 'gray']

              return (
                <div
                  key={spesa.id}
                  className="flex items-center justify-between p-4 rounded-xl border bg-white hover:shadow-sm transition"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn('w-10 h-10 rounded-full flex items-center justify-center border', colorClass)}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{typeInfo?.label || spesa.type}</p>
                      {spesa.description && (
                        <p className="text-xs text-gray-500">{spesa.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <p className="text-lg font-semibold text-gray-800">
                      €{spesa.amount.toFixed(2)}
                    </p>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEdit(spesa)}
                        className="p-2 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(spesa.id)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}

            <div className="pt-3 mt-3 border-t">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-gray-700">Totale</p>
                <p className="text-xl font-bold text-brand-600">
                  €{totalForSelectedMonth.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Modal Create/Edit */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editingId ? 'Modifica Spesa' : 'Nuova Spesa'}
        footer={
          <Button 
            className="w-full" 
            onClick={handleSave} 
            disabled={saving || !form.amount}
          >
            {saving ? 'Salvataggio...' : editingId ? 'Salva Modifiche' : 'Aggiungi Spesa'}
          </Button>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Tipo di Spesa
            </label>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-300"
            >
              {SPESA_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Importo (€)"
            type="number"
            step="0.01"
            min="0"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            placeholder="0.00"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mese</label>
            <input
              type="month"
              value={form.yearMonth}
              onChange={(e) => setForm((f) => ({ ...f, yearMonth: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Descrizione (opzionale)
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder="Note..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
