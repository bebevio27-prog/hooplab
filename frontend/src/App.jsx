import { HashRouter as BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import CalendarPage from './pages/CalendarPage'
import BookingsPage from './pages/BookingsPage'
import ProfilePage from './pages/ProfilePage'
import AdminPage from './pages/admin/AdminPage'
import AdminCorsi from './pages/admin/AdminCorsi'
import AdminUsers from './pages/admin/AdminUsers'
import AdminBookings from './pages/admin/AdminBookings'
import AdminSpese from './pages/admin/AdminSpese'
import AdminNonPaganti from './pages/admin/AdminNonPaganti'

function BookingsRouter() {
  const { isAdmin } = useAuth()
  return isAdmin ? <AdminBookings /> : <BookingsPage />
}

function PrivateRoute({ children }) {
  const { currentUser, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-50 via-lavender-50 to-white flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-[3px] border-brand-300 border-t-transparent animate-spin" />
      </div>
    )
  }
  return currentUser ? children : <Navigate to="/login" replace />
}

function AdminRoute({ children }) {
  const { isAdmin, loading } = useAuth()
  if (loading) return null
  return isAdmin ? children : <Navigate to="/" replace />
}

function PublicRoute({ children }) {
  const { currentUser, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-50 via-lavender-50 to-white flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-[3px] border-brand-300 border-t-transparent animate-spin" />
      </div>
    )
  }
  return currentUser ? <Navigate to="/" replace /> : children
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout>
                  <CalendarPage />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/bookings"
            element={
              <PrivateRoute>
                <Layout>
                  <BookingsRouter />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <Layout>
                  <ProfilePage />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <PrivateRoute>
                <AdminRoute>
                  <Layout>
                    <AdminPage />
                  </Layout>
                </AdminRoute>
              </PrivateRoute>
            }
          >
            <Route index element={<AdminUsers />} />
            <Route path="corsi" element={<AdminCorsi />} />
            <Route path="spese" element={<AdminSpese />} />
            <Route path="non-paganti" element={<AdminNonPaganti />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App


