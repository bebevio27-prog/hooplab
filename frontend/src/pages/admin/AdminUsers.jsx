import { useState, useEffect } from 'react'
import { UserPlus, Trash2, AlertCircle } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import {
  addPendingUser,
  getPendingUsers,
  deletePendingUser,
} from '../../lib/firestore'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'

export default function AdminUsers() {
  const { users, usersLoaded, loadUsers } = useAppStore()

  const [loading, setLoading] = useState(!usersLoaded)
  const [search, setSearch] = useState('')
  const [pendingUsers, setPendingUsers] = useState([])
  const [loadingPending, setLoadingPending] = useState(false)

  const [showCreateUser, setShowCreateUser] = useState(false)
  const [newUserData, setNewUserData] = useState({
    email: '',
    displayName: '',
    paymentType: 'mensile',
  })
  const [creating, setCreating] = useState(false)

  // Inizializza utenti e pending
  useEffect(() => {
    initUsers()
    loadPending()
  }, [])

  async function initUsers() {
    if (usersLoaded) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      await loadUsers()
    } catch (err) {
      console.error('Error loading users:', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadPending() {
    setLoadingPending(true)
    try {
      const pending = await getPendingUsers()
      setPendingUsers(pending)
    } catch (err) {
      console.error('Error loading pending users:', err)
    } finally {
      setLoadingPending(false)
    }
  }

  // Creazione nuovo utente pending
  async function handleCreateUser(e) {
    e.preventDefault()
    if (!newUserData.email || !newUserData.displayName) {
      alert('Compila tutti i campi obbligatori')
      return
    }

    setCreating(true)
    try {
      const userToAdd = { ...newUserData, role: 'user', lessonsPaid: 0 }
      await addPendingUser(userToAdd)
      await loadPending()
      setShowCreateUser(false)
      setNewUserData({ email: '', displayName: '', paymentType: 'mensile' })
      alert(
        `Utente aggiunto alla lista!\n\nPer completare la registrazione:\n1. Vai su Firebase Console → Authentication\n2. Clicca "Add User"\n3. Usa email: ${userToAdd.email}\n4. Genera password temporanea\n5. Invia le credenziali all'utente`
      )
    } catch (err) {
      console.error('Error creating user:', err)
      alert('Errore durante la creazione dell\'utente: ' + err.message)
    } finally {
      setCreating(false)
    }
  }

  // Eliminazione utente pending
  async function handleDeletePending(pendingId) {
    if (!confirm('Rimuovere questo utente dalla lista?')) return
    try {
      await deletePendingUser(pendingId)
      await loadPending()
    } catch (err) {
      console.error('Error deleting pending user:', err)
      alert('Errore durante l\'eliminazione')
    }
  }

  // Filtra utenti
  const filteredUsers = users
    .filter((u) =>
      (u.displayName || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(search.toLowerCase())
    )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 rounded-full border-2 border-brand-300 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header e nuovo utente */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Utenti</h2>
        <Button onClick={() => setShowCreateUser(true)}>
          <UserPlus size={16} /> Nuovo Utente
        </Button>
      </div>

      {/* Utenti pending */}
      {pendingUsers.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">
            Utenti da registrare ({pendingUsers.length})
          </h3>
          <div className="space-y-2">
            {pendingUsers.map((pending) => (
              <div
                key={pending.id || pending.email}
                className="flex items-center justify-between bg-white rounded-lg p-3 border border-blue-200"
              >
                <div>
                  <p className="font-medium text-gray-800">{pending.displayName}</p>
                  <p className="text-sm text-gray-500">{pending.email}</p>
                  <Badge className="mt-1" variant={pending.paymentType === 'mensile' ? 'default' : 'secondary'}>
                    {pending.paymentType === 'mensile' ? 'Mensile' : 'Per Lezione'}
                  </Badge>
                </div>
                <button
                  onClick={() => handleDeletePending(pending.id)}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Ricerca */}
      <Input
        type="text"
        placeholder="Cerca utente..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full"
      />

      {/* Lista utenti */}
      {filteredUsers.length === 0 ? (
        <Card className="text-center py-8 text-gray-400">Nessun utente trovato</Card>
      ) : (
        <div className="space-y-2">
          {filteredUsers.map((user) => (
            <Card key={user.id} className="p-4">
              <p className="font-medium text-gray-900">{user.displayName}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
              <Badge className="mt-1" variant={user.paymentType === 'mensile' ? 'default' : 'secondary'}>
                {user.paymentType === 'mensile' ? 'Mensile' : 'Per Lezione'}
              </Badge>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Creazione */}
      <Modal
        isOpen={showCreateUser}
        onClose={() => setShowCreateUser(false)}
        title="Crea Nuovo Utente"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo *</label>
            <Input
              type="text"
              value={newUserData.displayName}
              onChange={(e) => setNewUserData({ ...newUserData, displayName: e.target.value })}
              placeholder="Mario Rossi"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <Input
              type="email"
              value={newUserData.email}
              onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
              placeholder="mario.rossi@email.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo di Pagamento</label>
            <select
              value={newUserData.paymentType}
              onChange={(e) => setNewUserData({ ...newUserData, paymentType: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white"
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
