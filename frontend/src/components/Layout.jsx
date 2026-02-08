import { NavLink } from 'react-router-dom'
import { Calendar, User, Shield, BookOpen } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { BackgroundHoops } from './HoopDecorations'

export default function Layout({ children }) {
  const { isAdmin } = useAuth()

  const linkClass = ({ isActive }) =>
    `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
      isActive
        ? 'text-brand-500 bg-brand-50'
        : 'text-gray-400 hover:text-gray-600'
    }`

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-lavender-50 to-white relative">
      <BackgroundHoops />

      <div className="relative z-10 pb-20">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-md border-b border-white/60">
          <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-center">
            <span className="text-2xl font-extrabold tracking-tight text-gray-700">
              Hoop<span className="bg-gradient-to-r from-brand-400 to-lavender-400 bg-clip-text text-transparent ml-0.5">Lab</span>
            </span>
          </div>
        </header>
      </div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-white/80 backdrop-blur-md border-t border-gray-100">
        <div className="max-w-lg mx-auto flex justify-around py-1.5 px-2">
          <NavLink to="/" className={linkClass}>
            <Calendar size={20} />
            <span>Calendario</span>
          </NavLink>
          <NavLink to="/bookings" className={linkClass}>
            <BookOpen size={20} />
            <span>Prenotazioni</span>
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin" end className={linkClass}>
              <Shield size={20} />
              <span>Admin</span>
            </NavLink>
          )}
          <NavLink to="/profile" className={linkClass}>
            <User size={20} />
            <span>Profilo</span>
          </NavLink>
        </div>
      </nav>
    </div>
  )
}

