
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

    // Real backend login — kept for later
    // try {
    //   const response = await fetch('/api/auth/login', {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json',
    //     },
    //     credentials: 'include',
    //     body: JSON.stringify({ username, password }),
    //   })
    //
    //   if (!response.ok) {
    //     if (response.status === 401) {
    //       throw new Error('Invalid username or password.')
    //     }
    //     throw new Error('Unable to log in. Please try again.')
    //   }
    //
    //   await onLogin()
    // } catch (err) {
    //   setError(
    //     err instanceof TypeError
    //       ? 'Cannot connect to the server. Please try again later.'
    //       : err.message
    //   )
    // } finally {
    //   setLoading(false)
    // }


    // Frontend-only demo login
    try {
      if (!username.trim() || !password) {
        throw new Error('Please enter your username and password.')
      }

      await new Promise((resolve) => setTimeout(resolve, 300))

      if (typeof onLogin !== 'function') {
      throw new Error('Login handler is not configured.')
      }

      onLogin(username.trim())
        
    } catch (err) {
      setError(err.message)
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

        <div className="login-heading">
          <h2>Welcome back</h2>
          <p>Sign in to access your dashboard.</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <label htmlFor="username">Username</label>
          <div className="login-input-wrap">
            <Mail size={19} />
            <input
              id="username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <label htmlFor="password">Password</label>
          <div className="login-input-wrap">
            <LockKeyhole size={19} />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
            <button
              className="password-toggle"
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
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
            {loading ? 'Signing in...' : 'Sign in'}
            {!loading && <LogIn size={19} />}
          </button>
        </form>

        <p className="login-footer">
          Secure access to your room management system.
        </p>
      </section>
    </main>
  )
}
