import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, User } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { HoopRing } from '../components/HoopDecorations'

export default function Login() {
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, signup, loginWithGoogle } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isRegister) {
        await signup(email, password, displayName)
      } else {
        await login(email, password)
      }
      navigate('/')
    } catch (err) {
      setError(
        err.code === 'auth/user-not-found' ? 'Utente non trovato' :
        err.code === 'auth/wrong-password' ? 'Password errata' :
        err.code === 'auth/email-already-in-use' ? 'Email già registrata' :
        err.code === 'auth/weak-password' ? 'Password troppo debole (min 6 caratteri)' :
        'Errore di autenticazione'
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setError('')
    setLoading(true)
    try {
      await loginWithGoogle()
      navigate('/')
    } catch (err) {
      setError('Errore con Google login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-lavender-50 to-white flex items-center justify-center px-4 relative overflow-hidden">
      {/* Decorative hoops */}
      <HoopRing className="text-brand-400 -top-12 -left-12" size={200} opacity={0.07} strokeWidth={1.5} />
      <HoopRing className="text-lavender-400 -bottom-16 -right-16" size={260} opacity={0.05} strokeWidth={1} />
      <HoopRing className="text-brand-300 top-1/4 right-8" size={80} opacity={0.08} strokeWidth={2} />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full border-[3px] border-brand-300 flex items-center justify-center bg-white/50 backdrop-blur-sm shadow-sm">
            <div className="w-10 h-10 rounded-full border-2 border-lavender-400 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-brand-300 to-lavender-300" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Hoop Lab</h1>
          <p className="text-sm text-gray-500 mt-1">Benvenuti!</p>
        </div>

        {/* Form card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-white/60 shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-5">
            {isRegister ? 'Crea account' : 'Accedi'}
          </h2>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <Input
                label="Nome"
                type="text"
                placeholder="Il tuo nome"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            )}
            <Input
              label="Email"
              type="email"
              placeholder="la-tua@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '...' : isRegister ? 'Registrati' : 'Accedi'}
            </Button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white/80 px-3 text-gray-400">oppure</span>
            </div>
          </div>

          <Button variant="secondary" className="w-full" onClick={handleGoogle} disabled={loading}>
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continua con Google
          </Button>

          <p className="text-center text-sm text-gray-500 mt-5">
            {isRegister ? 'Hai già un account?' : 'Non hai un account?'}{' '}
            <button
              type="button"
              onClick={() => { setIsRegister(!isRegister); setError('') }}
              className="text-brand-500 font-medium hover:underline"
            >
              {isRegister ? 'Accedi' : 'Registrati'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
