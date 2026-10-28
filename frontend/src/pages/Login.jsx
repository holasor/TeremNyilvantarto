import { useState } from 'react'
import { LockKeyhole, Mail, Eye, EyeOff, LogIn } from 'lucide-react'
import './Login.css'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!username.trim() || !password) {
        throw new Error('Kérlek add meg a felhasználóneved és a jelszavad.')
      }

      // Valós API hívás a backend felé
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          username: username.trim(), 
          password 
        }),
      })

      if (!response.ok) {
        if (response.status === 401 || response.status === 400) {
          throw new Error('Hibás felhasználónév vagy jelszó.')
        }
        throw new Error('Nem sikerült bejelentkezni. Kérlek próbáld újra később.')
      }

      const data = await response.json()

      if (typeof onLogin !== 'function') {
        throw new Error('A bejelentkezési kezelő nem elérhető.')
      }

      // Sikeres belépés esetén átadjuk a felhasználónevet
      onLogin(username.trim())
        
    } catch (err) {
      setError(
        err instanceof TypeError
          ? 'Nem sikerült csatlakozni a szerverhez. Ellenőrizd, hogy fut-e a backend.'
          : err.message
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <div className="login-logo">
            <LockKeyhole size={26} />
          </div>
          <h1>TeremNyilvantarto</h1>
          <p>Room management made simple.</p>
        </div>

        <div className="login-heading"><h2>Bejelentkezés</h2>
          <p>Jelentkezz be a műszerfal eléréséhez.</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <label htmlFor="username">Felhasználónév</label>
          <div className="login-input-wrap">
            <Mail size={19} />
            <input
              id="username"
              type="text"
              placeholder="Add meg a felhasználóneved"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <label htmlFor="password">Jelszó</label>
          <div className="login-input-wrap">
            <LockKeyhole size={19} />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Add meg a jelszavad"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
            <button
              className="password-toggle"
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Jelszó elrejtése' : 'Jelszó megjelenítése'}
            >
              {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </div>

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          <button
            className="login-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Bejelentkezés...' : 'Bejelentkezés'}
            {!loading && <LogIn size={19} />}
          </button>
        </form>

        <p className="login-footer">
          Biztonságos hozzáférés a teremnyilvántartó rendszerhez.
        </p>
      </section>
    </main>
  )
}