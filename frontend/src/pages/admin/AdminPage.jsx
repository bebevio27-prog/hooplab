import { NavLink, Outlet } from 'react-router-dom'
import { Users, Calendar, Euro, AlertCircle } from 'lucide-react'
import { cn } from '../../lib/utils'

export default function AdminPage() {
  const tabClass = ({ isActive }) =>
    cn(
      'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
      isActive
        ? 'bg-white shadow-sm text-brand-600'
        : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
    )

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Admin</h2>
        <p className="text-sm text-gray-500 mt-0.5">Gestisci corsi, utenti e finanze</p>
      </div>

      <div className="flex gap-1 bg-gray-100/80 rounded-2xl p-1 overflow-x-auto">
        <NavLink to="/admin" end className={tabClass}>
          <Users size={16} />
          Utenti
        </NavLink>
        <NavLink to="/admin/corsi" className={tabClass}>
          <Calendar size={16} />
          Corsi
        </NavLink>
        <NavLink to="/admin/spese" className={tabClass}>
          <Euro size={16} />
          Spese
        </NavLink>
        <NavLink to="/admin/non-paganti" className={tabClass}>
          <AlertCircle size={16} />
          Report
        </NavLink>
      </div>

      <Outlet />
    </div>
  )
}
