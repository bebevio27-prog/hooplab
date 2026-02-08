import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { LogOut, Mail, User, Pencil, Check } from 'lucide-react'
import { updateProfile } from 'firebase/auth'
import { updateUserProfile } from '../lib/firestore'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'

export default function ProfilePage() {
  const { currentUser, userProfile, logout } = useAuth()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(currentUser?.displayName || '')
  const [saving, setSaving] = useState(false)

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  async function handleSaveName() {
    if (!name.trim()) return
    setSaving(true)
    try {
      await updateProfile(currentUser, { displayName: name.trim() })
      await updateUserProfile(currentUser.uid, { displayName: name.trim() })
      setEditing(false)
    } catch (err) {
      console.error('Error updating name:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Profilo</h2>
        <p className="text-sm text-gray-500 mt-0.5">Il tuo account</p>
      </div>

      <Card className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-200 to-lavender-200 flex items-center justify-center flex-shrink-0">
            <User size={24} className="text-brand-600" />
          </div>
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent"
                  placeholder="Il tuo nome"
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                />
                <button
                  onClick={handleSaveName}
                  disabled={saving || !name.trim()}
                  className="p-1.5 rounded-lg text-brand-500 hover:bg-brand-50 disabled:opacity-40"
                >
                  <Check size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-800 truncate">
                  {currentUser?.displayName || 'Utente'}
                </p>
                <button
                  onClick={() => { setName(currentUser?.displayName || ''); setEditing(true) }}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <Pencil size={14} />
                </button>
              </div>
            )}
            <p className="text-sm text-gray-500 truncate flex items-center gap-1 mt-0.5">
              <Mail size={12} />
              {currentUser?.email}
            </p>
          </div>
        </div>
      </Card>

      <Button variant="secondary" className="w-full" onClick={handleLogout}>
        <LogOut size={16} />
        Esci
      </Button>
    </div>
  )
}
