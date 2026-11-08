import { useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Bookings from './pages/Bookings'
import KeyManagement from './pages/KeyManagement'

export default function App() {
  const [loggedInUser, setLoggedInUser] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('loggedInUser')) || null
    } catch {
      return null
    }
  })

  function handleLogin(user) {
    sessionStorage.setItem('loggedInUser', JSON.stringify(user))
    setLoggedInUser(user)
  }

  function handleLogout() {
    sessionStorage.removeItem('loggedInUser')
    setLoggedInUser(null)
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          loggedInUser
            ? <Navigate to="/" replace />
            : <Login onLogin={handleLogin} />
        }
      />

      <Route
        element={
          loggedInUser
            ? <AppLayout
                username={loggedInUser.nev || loggedInUser.email || ''}
                onLogout={handleLogout}
              />
            : <Navigate to="/login" replace />
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/foglalasok" element={<Bookings />} />
        <Route path="kulcskezeles" element={<KeyManagement />} />
      </Route>

      <Route
        path="*"
        element={<Navigate to={loggedInUser ? '/' : '/login'} replace />}
      />
    </Routes>
  )
}