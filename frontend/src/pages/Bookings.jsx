
import { useEffect, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  X,
  Clock,
  DoorOpen,
  User,
} from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const weekdays = [
  'Hétfő',
  'Kedd',
  'Szerda',
  'Csütörtök',
  'Péntek',
  'Szombat',
  'Vasárnap',
]

function getStatus(booking, movements) {
  const now = new Date()
  const start = new Date(booking.kezdet)
  const end = new Date(booking.veg)

  const relatedMovements = movements.filter(
    (movement) =>
      Number(movement.felhasznaloid) === Number(booking.felhasznaloid) &&
      !movement.visszavetelideje &&
      new Date(movement.kiadasideje) >= start &&
      new Date(movement.kiadasideje) <= end
  )

  if (end < now) {
    return relatedMovements.length > 0
      ? 'expired-not-returned'
      : 'expired-returned'
  }

  if (start <= now && end >= now) {
    return relatedMovements.length > 0
      ? 'rented'
      : 'active'
  }

  return 'active'
}

const statusConfig = {
  rented: {
    label: 'Kulcs kiadva',
    color: 'bg-emerald-500',
    light: 'bg-emerald-50',
    text: 'text-emerald-700',
  },
  active: {
    label: 'Aktív foglalás',
    color: 'bg-amber-400',
    light: 'bg-amber-50',
    text: 'text-amber-700',
  },
  'expired-not-returned': {
    label: 'Lejárt – kulcs nincs visszaadva',
    color: 'bg-red-500',
    light: 'bg-red-50',
    text: 'text-red-700',
  },
  'expired-returned': {
    label: 'Lejárt – kulcs visszaadva',
    color: 'bg-blue-500',
    light: 'bg-blue-50',
    text: 'text-blue-700',
  },
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString('hu-HU', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('hu-HU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function Bookings() {
  const [bookings, setBookings] = useState([])
  const [users, setUsers] = useState([])
  const [rooms, setRooms] = useState([])
  const [movements, setMovements] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [currentDate, setCurrentDate] = useState(new Date())
  const [expandedDays, setExpandedDays] = useState([])
  const [selectedBooking, setSelectedBooking] = useState(null)

  async function loadBookings() {
    setLoading(true)
    setError('')

    try {
      const endpoints = [
        'foglalasok',
        'felhasznalok',
        'termek',
        'kulcsmozgasok',
      ]

      const responses = await Promise.all(
        endpoints.map((endpoint) =>
          fetch(`${API_BASE}/${endpoint}`)
        )
      )

      const failed = responses.find((response) => !response.ok)

      if (failed) {
        throw new Error('Nem sikerült betölteni a naptár adatait.')
      }

      const [bookingData, userData, roomData, movementData] =
        await Promise.all(
          responses.map((response) => response.json())
        )

      setBookings(bookingData)
      setUsers(userData)
      setRooms(roomData)
      setMovements(movementData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBookings()
  }, [])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  const startingDay = (firstDay.getDay() + 6) % 7

  const calendarDays = []

  for (let i = 0; i < startingDay; i++) {
    calendarDays.push(null)
  }

  for (let day = 1; day <= lastDay.getDate(); day++) {
    calendarDays.push(new Date(year, month, day))
  }

  const monthLabel = currentDate.toLocaleDateString('hu-HU', {
    year: 'numeric',
    month: 'long',
  })

  function changeMonth(offset) {
    setCurrentDate(new Date(year, month + offset, 1))
    setExpandedDays([])
    setSelectedBooking(null)
  }

  function goToday() {
    setCurrentDate(new Date())
    setExpandedDays([])
    setSelectedBooking(null)
  }

  function getBookingsForDay(date) {
    if (!date) return []

    return bookings
      .filter((booking) => {
        const start = new Date(booking.kezdet)
        const end = new Date(booking.veg)

        const dayStart = new Date(date)
        dayStart.setHours(0, 0, 0, 0)

        const dayEnd = new Date(date)
        dayEnd.setHours(23, 59, 59, 999)

        return start <= dayEnd && end >= dayStart
      })
      .sort(
        (a, b) =>
          new Date(a.kezdet) - new Date(b.kezdet)
      )
  }

  function toggleDay(dateKey) {
    setExpandedDays((previous) =>
      previous.includes(dateKey)
        ? previous.filter((item) => item !== dateKey)
        : [...previous, dateKey]
    )
  }

  function getBookingInfo(booking) {
    const user = users.find(
      (item) => Number(item.id) === Number(booking.felhasznaloid)
    )

    const room = rooms.find(
      (item) => Number(item.id) === Number(booking.teremid)
    )

    return {
      user: user?.nev || `Felhasználó #${booking.felhasznaloid}`,
      room: room?.teremszam || booking.teremid,
      status: getStatus(booking, movements),
    }
  }

  function renderBooking(booking) {
    const info = getBookingInfo(booking)
    const config = statusConfig[info.status]

    return (
      <button
        key={booking.id}
        type="button"
        onClick={() => setSelectedBooking(booking)}
        className={`flex w-full items-center gap-1.5 truncate rounded-md border-l-4 px-2 py-1 text-left text-xs transition hover:brightness-95 ${config.light} ${config.text} ${
          info.status === 'rented'
            ? 'border-emerald-500'
            : info.status === 'active'
              ? 'border-amber-400'
              : info.status === 'expired-not-returned'
                ? 'border-red-500'
                : 'border-blue-500'
        }`}
      >
        <span className="shrink-0 font-bold">
          {info.room}
        </span>
        <span className="truncate">
          {formatTime(booking.kezdet)}
        </span>
      </button>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          Teremfoglalások
        </h1>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="text-blue-600" size={21} />
            <h2 className="text-lg font-bold capitalize text-slate-900">
              {monthLabel}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={goToday}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Ma
            </button>

            <button
              onClick={() => changeMonth(-1)}
              aria-label="Előző hónap"
              className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50"
            >
              <ChevronLeft size={17} />
            </button>

            <button
              onClick={() => changeMonth(1)}
              aria-label="Következő hónap"
              className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50"
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-2 border-b border-slate-100 px-4 py-3">
          {Object.entries(statusConfig).map(([key, config]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${config.color}`} />
              <span className="text-[11px] text-slate-600">
                {config.label}
              </span>
            </div>
          ))}
        </div>

        {loading && (
          <p className="p-6 text-center text-sm text-slate-500">
            Naptár betöltése...
          </p>
        )}

        {error && (
          <div className="p-5 text-center">
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={loadBookings}
              className="mt-3 text-sm font-semibold text-blue-600 underline"
            >
              Újrapróbálás
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">

              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                {weekdays.map((day) => (
                  <div
                    key={day}
                    className="px-2 py-2 text-center text-[11px] font-bold text-slate-600"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {calendarDays.map((date, index) => {
                  if (!date) {
                    return (
                      <div
                        key={`empty-${index}`}
                        className="min-h-[115px] border-b border-r border-slate-100 bg-slate-50/50"
                      />
                    )
                  }

                  const dayBookings = getBookingsForDay(date)
                  const dateKey = date.toISOString().slice(0, 10)
                  const expanded = expandedDays.includes(dateKey)

                  const visibleBookings = expanded
                    ? dayBookings
                    : dayBookings.slice(0, 3)

                  const today = new Date()

                  const isCurrentDay =
                    date.getDate() === today.getDate() &&
                    date.getMonth() === today.getMonth() &&
                    date.getFullYear() === today.getFullYear()

                  return (
                    <div
                      key={dateKey}
                      className={`min-h-[115px] border-b border-r border-slate-100 p-1.5 ${
                        isCurrentDay ? 'bg-blue-50/50' : 'bg-white'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleDay(dateKey)}
                        className="mb-1.5 flex w-full items-center justify-between"
                      >
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                            isCurrentDay
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-700'
                          }`}
                        >
                          {date.getDate()}
                        </span>

                        {dayBookings.length > 0 && (
                          <span className="text-[9px] text-slate-400">
                            {dayBookings.length}
                          </span>
                        )}
                      </button>

                      <div className="space-y-1">
                        {visibleBookings.map(renderBooking)}
                      </div>

                      {dayBookings.length > 3 && (
                        <button
                          type="button"
                          onClick={() => toggleDay(dateKey)}
                          className="mt-1 text-[10px] font-semibold text-blue-600 hover:text-blue-800"
                        >
                          {expanded
                            ? 'Kevesebb'
                            : `+${dayBookings.length - 3} további`}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      {selectedBooking && (() => {
        const info = getBookingInfo(selectedBooking)
        const config = statusConfig[info.status]

        return (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4"
            onClick={() => setSelectedBooking(null)}
          >
            <div
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Foglalás részletei
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Foglalás #{selectedBooking.id}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedBooking(null)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                  aria-label="Bezárás"
                >
                  <X size={19} />
                </button>
              </div>

              <div className={`mb-5 rounded-xl p-3 ${config.light}`}>
                <p className={`text-sm font-semibold ${config.text}`}>
                  {config.label}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <DoorOpen className="text-slate-400" size={19} />
                  <div>
                    <p className="text-xs text-slate-500">Terem</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {info.room}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <User className="text-slate-400" size={19} />
                  <div>
                    <p className="text-xs text-slate-500">Felhasználó</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {info.user}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="text-slate-400" size={19} />
                  <div>
                    <p className="text-xs text-slate-500">Kezdés</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {formatDate(selectedBooking.kezdet)} · {formatTime(selectedBooking.kezdet)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="text-slate-400" size={19} />
                  <div>
                    <p className="text-xs text-slate-500">Befejezés</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {formatDate(selectedBooking.veg)} · {formatTime(selectedBooking.veg)}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedBooking(null)}
                className="mt-6 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Bezárás
              </button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
