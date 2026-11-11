const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export function apiFetch(path, options = {}) {
  let user = null
  try {
    user = JSON.parse(sessionStorage.getItem('loggedInUser') || 'null')
  } catch {
    user = null
  }

  const headers = new Headers(options.headers || {})
  if (user?.access_token) {
    headers.set('Authorization', `Bearer ${user.access_token}`)
  }

  return fetch(`${API_BASE}/${path}`, { ...options, headers })
}
