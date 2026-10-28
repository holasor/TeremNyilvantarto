
import { useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loggedInUsername, setLoggedInUsername] = useState('')

  function handleLogin(username) {
    setLoggedInUsername(username)
    setIsLoggedIn(true)
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isLoggedIn
            ? <Navigate to="/" replace />
            : <Login onLogin={handleLogin} />
        }
      />

      <Route
        element={
          isLoggedIn
            ? <AppLayout username={loggedInUsername} />
            : <Navigate to="/login" replace />
        }
      >
        <Route index element={<Dashboard />} />
      </Route>

      <Route
        path="*"
        element={
          <Navigate
            to={isLoggedIn ? '/' : '/login'}
            replace
          />
        }
      />
    </Routes>
  )
}
