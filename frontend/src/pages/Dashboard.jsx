
import { useEffect, useState } from 'react'
import {
  CalendarDays,
  KeyRound,
  DoorOpen,
  Clock3,
  ArrowUpRight,
  ArrowDownLeft,
  CircleAlert,
  Plus,
  MapPin,
  RefreshCw,
} from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const iconStyles = {
  blue: 'bg-blue-50 text-blue-600',
  amber: 'bg-amber-50 text-amber-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  rose: 'bg-rose-50 text-rose-600',
}

function formatTime(value) {
  if (!value) return '—'

  return new Date(value).toLocaleTimeString('hu-HU', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateTime(value) {
  if (!value) return '—'

  return new Date(value).toLocaleString('hu-HU', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getInitials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || '')
    .join('')
    .toUpperCase()
}

function isToday(value) {
  if (!value) return false

  const date = new Date(value)
  const today = new Date()

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  )
}

export default function Dashboard({ username = '' }) {
  const [data, setData] = useState({
    bookings: [],
    keys: [],
    movements: [],
    rooms: [],
    users: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadDashboard() {
    setLoading(true)
    setError('')

    try {
      const endpoints = [
        'foglalasok',
        'kulcsok',
        'kulcsmozgasok',
        'termek',
        'felhasznalok',
      ]

      const responses = await Promise.all(
        endpoints.map((endpoint) =>
          fetch(`${API_BASE}/${endpoint}`)
        )
      )

      const failedResponse = responses.find(
        (response) => !response.ok
      )

      if (failedResponse) {
        throw new Error(
          `API error: ${failedResponse.status} ${failedResponse.statusText}`
        )
      }

      const [
        bookings,
        keys,
        movements,
        rooms,
        users,
      ] = await Promise.all(
        responses.map((response) => response.json())
      )

      setData({
        bookings,
        keys,
        movements,
        rooms,
        users,
      })
    } catch (err) {
      console.error('Dashboard loading failed:', err)
      setError(
        'Nem sikerült betölteni az adatokat. Ellenőrizd, hogy a backend fut-e.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const now = new Date()

  const todayBookings = data.bookings.filter((booking) =>
    isToday(booking.kezdet)
  )

  const activeBookings = data.bookings.filter((booking) => {
    const start = new Date(booking.kezdet)
    const end = new Date(booking.veg)

    return start <= now && end >= now
  })

  // A key is considered checked out if its latest
  // recorded movement has no return timestamp.
  const latestMovementByKey = new Map()

  for (const movement of [...data.movements].sort(
    (a, b) => new Date(b.kiadasideje) - new Date(a.kiadasideje)
  )) {
    if (!latestMovementByKey.has(movement.kulcsid)) {
      latestMovementByKey.set(movement.kulcsid, movement)
    }
  }

  const checkedOutMovements = [...latestMovementByKey.values()]
    .filter((movement) => !movement.visszavetelideje)

  // Temporary rule: a key is overdue after 24 hours.
  const overdueMovements = checkedOutMovements.filter(
    (movement) =>
      now - new Date(movement.kiadasideje) > 24 * 60 * 60 * 1000
  )

  const availableRooms = data.rooms.filter((room) => {
    const isOccupied = activeBookings.some(
      (booking) => booking.teremid === room.id
    )

    return !isOccupied
  })

  const stats = [
    {
      label: 'Mai foglalások',
      value: todayBookings.length,
      detail: 'Mai teremfoglalások',
      icon: CalendarDays,
      color: 'blue',
    },
    {
      label: 'Kiadott kulcsok',
      value: checkedOutMovements.length,
      detail: 'Jelenleg vissza nem vett kulcsok',
      icon: KeyRound,
      color: 'amber',
    },
    {
      label: 'Elérhető termek',
      value: availableRooms.length,
      detail: 'Jelenleg nincs aktív foglalásuk',
      icon: DoorOpen,
      color: 'emerald',
    },
    {
      label: 'Késedelmes leadások',
      value: overdueMovements.length,
      detail: '24 órán túl vissza nem vett kulcsok',
      icon: Clock3,
      color: 'rose',
    },
  ]

  const recentMovements = [...data.movements]
    .sort(
      (a, b) =>
        new Date(b.kiadasideje) - new Date(a.kiadasideje)
    )
    .slice(0, 4)
    .map((movement) => {
      const user = data.users.find(
        (item) => item.id === movement.felhasznaloid
      )
      const key = data.keys.find(
        (item) => item.id === movement.kulcsid
      )
      const room = data.rooms.find(
        (item) => item.id === key?.teremid
      )
      const returned = Boolean(movement.visszavetelideje)

      return {
        ...movement,
        person: user?.nev || `Felhasználó #${movement.felhasznaloid}`,
        initials: getInitials(user?.nev || 'F'),
        room: room?.teremszam || room?.id || '—',
        key: key ? `K-${String(key.id).padStart(3, '0')}` : '—',
        action: returned ? 'Kulcs visszavétele' : 'Kulcs kiadása',
        time: formatTime(
          returned ? movement.visszavetelideje : movement.kiadasideje
        ),
        status: returned ? 'Visszavéve' : 'Kiadva',
        type: returned ? 'in' : 'out',
      }
    })

  const currentRooms = data.rooms.slice(0, 3).map((room) => {
    const booking = activeBookings.find(
      (item) => item.teremid === room.id
    )

    const occupied = Boolean(booking)

    return {
      ...room,
      building: room.epulet,
      activity: occupied ? 'Foglalás' : 'Nincs aktív foglalás',
      time: booking
        ? `${formatTime(booking.kezdet)}–${formatTime(booking.veg)}`
        : '—',
      status: occupied ? 'Használatban' : 'Elérhető',
      color: occupied ? 'blue' : 'emerald',
    }
  })

  return (
    <div className="space-y-7">
      {/* Page heading */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm text-slate-500">
            Vezérlőpult / Áttekintés
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Jó reggelt! 👋
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Itt láthatod az egyetemi termek és kulcsok aktuális állapotát.
          </p>
        </div>

        <button
          type="button"
          onClick={() => alert('A foglalási űrlapot a következő lépésben készítjük el.')}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          <Plus size={18} />
          Új foglalás
        </button>
      </section>

      {/* Loading and error messages */}
      {loading && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
          Adatok betöltése a szerverről...
        </div>
      )}

      {error && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm text-rose-700">{error}</p>
          <button
            type="button"
            onClick={loadDashboard}
            className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-rose-700 shadow-sm"
          >
            <RefreshCw size={15} />
            Újrapróbálás
          </button>
        </div>
      )}

      {/* Statistics cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon

          return (
            <article
              key={stat.label}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    {stat.label}
                  </p>
                  <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                    {loading ? '—' : stat.value}
                  </p>
                </div>

                <div className={`rounded-xl p-3 ${iconStyles[stat.color]}`}>
                  <Icon size={21} />
                </div>
              </div>

              <p className="mt-4 text-xs text-slate-500">
                {stat.detail}
              </p>
            </article>
          )
        })}
      </section>

      {/* Recent movements and room status */}
      <section className="grid grid-cols-1 items-stretch gap-6 2xl:grid-cols-5">
        <article className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5 2xl:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
            <div>
              <h2 className="text-base font-bold tracking-tight text-slate-950">
                Legutóbbi kulcsmozgások
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                A kulcskiadások és visszavételek áttekintése
              </p>
            </div>

            <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
              Legutóbbi események
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left">
              <thead className="bg-slate-50/80">
                <tr className="text-xs font-semibold text-slate-500">
                  <th className="px-6 py-3">Felhasználó</th>
                  <th className="px-4 py-3">Terem / Kulcs</th>
                  <th className="px-4 py-3">Művelet</th>
                  <th className="px-4 py-3">Időpont</th>
                  <th className="px-4 py-3">Állapot</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {recentMovements.map((movement) => (
                  <tr
                    key={movement.id}
                    className="transition hover:bg-slate-50/70"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                          {movement.initials}
                        </div>
                        <span className="text-sm font-medium text-slate-800">
                          {movement.person}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <p className="text-sm font-semibold text-slate-800">
                        {movement.room}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {movement.key}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        {movement.type === 'out' ? (
                          <ArrowUpRight size={16} className="text-amber-600" />
                        ) : (
                          <ArrowDownLeft size={16} className="text-emerald-600" />
                        )}
                        {movement.action}
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500">
                      {movement.time}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
                          movement.type === 'out'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {movement.status}
                      </span>
                    </td>
                  </tr>
                ))}

                {!loading && !error && recentMovements.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">
                      Még nincs rögzített kulcsmozgás.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-100 px-6 py-4">
            <p className="text-xs text-slate-500">
              Az adatok a backend API-ból származnak.
            </p>
          </div>
        </article>

        {/* Room status */}
        <article className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5 2xl:col-span-2">
          <div className="border-b border-slate-100 px-5 py-5">
            <h2 className="text-base font-bold tracking-tight text-slate-950">
              Teremállapotok
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              A termek aktuális foglaltsága
            </p>
          </div>

          <div className="space-y-1 p-3">
            {currentRooms.map((room) => (
              <div
                key={room.id}
                className="rounded-xl p-3 transition hover:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`rounded-lg p-2 ${iconStyles[room.color]}`}
                    >
                      <MapPin size={17} />
                    </div>

                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {room.teremszam}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {room.building} · {room.ferohely} férőhely
                      </p>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${
                      room.color === 'blue'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {room.status}
                  </span>
                </div>

                <div className="ml-12 mt-3 flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-500">
                    {room.activity}
                  </span>
                  <span className="font-medium text-slate-600">
                    {room.time}
                  </span>
                </div>
              </div>
            ))}

            {!loading && !error && currentRooms.length === 0 && (
              <p className="p-5 text-center text-sm text-slate-500">
                Nincs megjeleníthető terem.
              </p>
            )}
          </div>

          <div className="mx-4 mb-4 flex items-start gap-2 rounded-xl bg-rose-50 p-3">
            <CircleAlert
              size={17}
              className="mt-0.5 shrink-0 text-rose-600"
            />
            <div>
              <p className="text-xs font-semibold text-rose-800">
                Figyelmet igényel
              </p>
              <p className="mt-1 text-xs leading-5 text-rose-700">
                {loading
                  ? 'Adatok betöltése...'
                  : `${overdueMovements.length} kulcs van 24 órán túl vissza nem véve.`}
              </p>
            </div>
          </div>

          <div className="px-5 pb-5">
            <button
              type="button"
              onClick={loadDashboard}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={15} />
              Adatok frissítése
            </button>
          </div>
        </article>
      </section>
    </div>
  )
}
