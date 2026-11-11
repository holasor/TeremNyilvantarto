import { useEffect, useState } from 'react'
import { Pencil, RefreshCw, Save, X } from 'lucide-react'
import { apiFetch } from '../api'

const emptyRoom = {
  teremszam: '',
  ferohely: '',
  epulet: '',
  felszereles: '',
}

export default function RoomManagement({ isAdmin = false }) {
  const [rooms, setRooms] = useState([])
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [form, setForm] = useState(emptyRoom)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function loadRooms() {
    setLoading(true)
    setError('')

    try {
      const response = await apiFetch('termek')
      if (!response.ok) {
        throw new Error('Nem sikerült betölteni a termeket.')
      }
      setRooms(await response.json())
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRooms()
  }, [])

  function startEditing(room) {
    setSelectedRoom(room)
    setForm({
      teremszam: room.teremszam,
      ferohely: String(room.ferohely),
      epulet: room.epulet,
      felszereles: room.felszereles || '',
    })
    setError('')
    setMessage('')
  }

  function cancelEditing() {
    setSelectedRoom(null)
    setForm(emptyRoom)
  }

  async function saveRoom(event) {
    event.preventDefault()
    if (!selectedRoom) return

    setSaving(true)
    setError('')
    setMessage('')

    try {
      const response = await apiFetch(
        `termek/${encodeURIComponent(selectedRoom.id)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...form,
            ferohely: Number(form.ferohely),
          }),
        }
      )

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.detail || 'Nem sikerült módosítani a termet.')
      }

      const updatedRoom = await response.json()
      setRooms((previous) =>
        previous.map((room) =>
          room.id === updatedRoom.id ? updatedRoom : room
        )
      )
      setMessage(`${updatedRoom.id} terem adatai frissültek.`)
      cancelEditing()
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm text-slate-500">Vezérlőpult / Termek</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          Termek és kulcsok
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          A termek adatai és felszerelése.
          {isAdmin && ' Válassz egy termet az adatainak szerkesztéséhez.'}
        </p>
      </header>

      {error && (
        <div
          className="flex items-center justify-between rounded-xl bg-rose-50 p-4 text-sm text-rose-700"
          role="alert"
        >
          {error}
          <button type="button" onClick={loadRooms} aria-label="Újrapróbálás">
            <RefreshCw size={17} />
          </button>
        </div>
      )}

      {message && (
        <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700" role="status">
          {message}
        </p>
      )}

      {selectedRoom && (
        <form
          onSubmit={saveRoom}
          className="space-y-4 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-slate-900">
              Terem szerkesztése · {selectedRoom.id}
            </h2>
            <button
              type="button"
              onClick={cancelEditing}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Szerkesztés megszakítása"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm text-slate-600">
              Teremszám
              <input
                required
                value={form.teremszam}
                onChange={(event) =>
                  setForm({ ...form, teremszam: event.target.value })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              />
            </label>
            <label className="space-y-1 text-sm text-slate-600">
              Férőhely
              <input
                required
                min="1"
                type="number"
                value={form.ferohely}
                onChange={(event) =>
                  setForm({ ...form, ferohely: event.target.value })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              />
            </label>
            <label className="space-y-1 text-sm text-slate-600">
              Épület
              <input
                required
                value={form.epulet}
                onChange={(event) =>
                  setForm({ ...form, epulet: event.target.value })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              />
            </label>
            <label className="space-y-1 text-sm text-slate-600">
              Felszerelés
              <input
                value={form.felszereles}
                onChange={(event) =>
                  setForm({ ...form, felszereles: event.target.value })
                }
                placeholder="pl. projektor, labor"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <Save size={16} />
            {saving ? 'Mentés...' : 'Módosítások mentése'}
          </button>
        </form>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-4 font-semibold text-slate-900">
          Nyilvántartott termek
        </div>
        {loading ? (
          <p className="p-5 text-sm text-slate-500">Termek betöltése...</p>
        ) : rooms.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">Még nincs rögzített terem.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Azonosító</th>
                  <th className="px-4 py-3">Teremszám</th>
                  <th className="px-4 py-3">Épület</th>
                  <th className="px-4 py-3">Férőhely</th>
                  <th className="px-4 py-3">Felszerelés</th>
                  {isAdmin && <th className="px-4 py-3">Művelet</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rooms.map((room) => (
                  <tr key={room.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{room.id}</td>
                    <td className="px-4 py-3 text-slate-600">{room.teremszam}</td>
                    <td className="px-4 py-3 text-slate-600">{room.epulet}</td>
                    <td className="px-4 py-3 text-slate-600">{room.ferohely}</td>
                    <td className="px-4 py-3 text-slate-600">{room.felszereles || '—'}</td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => startEditing(room)}
                          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-blue-700 hover:bg-blue-50"
                        >
                          <Pencil size={15} />
                          Szerkesztés
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
