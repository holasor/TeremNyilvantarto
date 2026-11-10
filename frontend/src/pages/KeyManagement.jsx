
import { useEffect, useState } from 'react'
import {
  Building2,
  KeyRound,
  DoorOpen,
  User,
  RefreshCw,
  Search,
} from 'lucide-react'

import buildingImage from '../assets/projektlab-mik.png'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const floors = [
  { id: 'basement', label: 'Alagsor', number: 'B' },
  { id: '0', label: 'Földszint', number: '01' },
  ...Array.from({ length: 11 }, (_, i) => ({
    id: String(i + 1),
    label: `${i + 1}. emelet`,
    number: String(i + 2).padStart(2, '0'),
  })),
]

// Clickable areas aligned with the building's window rows.
// All positions are percentages of the original image.
const floorClickAreas = [
  { id: '11', top: 17.5, height: 5.8 },
  { id: '10', top: 25.2, height: 5.5 },
  { id: '9', top: 32.2, height: 5.5 },
  { id: '8', top: 39.6, height: 5.5 },
  { id: '7', top: 46.5, height: 5.5 },
  { id: '6', top: 53.2, height: 5.5 },
  { id: '5', top: 60.2, height: 5.5 },
  { id: '4', top: 66.7, height: 5.5 },
  { id: '3', top: 73.2, height: 5.5 },
  { id: '2', top: 79.7, height: 5.5 },
  { id: '0', top: 86.3, height: 5.5 },
  { id: 'basement', top: 93.3, height: 5.8 },
]

export default function KeyManagement() {
  const [selectedFloor, setSelectedFloor] = useState('0')
  const [rooms, setRooms] = useState([])
  const [keys, setKeys] = useState([])
  const [users, setUsers] = useState([])
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  async function loadData() {
    setLoading(true)
    setError('')

    try {
      const endpoints = [
        'termek',
        'kulcsok',
        'felhasznalok',
        'kulcsmozgasok',
      ]

      const responses = await Promise.all(
        endpoints.map(endpoint =>
          fetch(`${API_BASE}/${endpoint}`)
        )
      )

      if (responses.some(response => !response.ok)) {
        throw new Error('Nem sikerült betölteni az adatokat.')
      }

      const [roomData, keyData, userData, movementData] =
        await Promise.all(
          responses.map(response => response.json())
        )

      setRooms(roomData)
      setKeys(keyData)
      setUsers(userData)
      setMovements(movementData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  function getFloorNumber(room) {
    const roomNumber = String(room.teremszam || '').trim()
    const match = roomNumber.match(/\d+/)

    if (!match) return null

    const number = Number(match[0])

    if (number < 100) return 0

    return Math.floor(number / 100)
  }

  function getLatestMovement(keyId) {
    return movements
      .filter(m => Number(m.kulcsid) === Number(keyId))
      .sort(
        (a, b) =>
          new Date(b.kiadasideje) - new Date(a.kiadasideje)
      )[0]
  }

  function getKeyStatus(key) {
    const movement = getLatestMovement(key.id)

    if (movement && !movement.visszavetelideje) {
      return {
        label: 'Kiadva',
        color: 'bg-amber-100 text-amber-700',
        movement,
      }
    }

    return {
      label: 'Elérhető',
      color: 'bg-emerald-100 text-emerald-700',
      movement,
    }
  }

  function getUserName(userId) {
    const user = users.find(
      item => Number(item.id) === Number(userId)
    )

    return user?.nev || `Felhasználó #${userId}`
  }

  const selectedFloorInfo = floors.find(
    floor => floor.id === selectedFloor
  )

  const floorRooms = selectedFloor === 'basement'
    ? []
    : rooms.filter(
        room => getFloorNumber(room) === Number(selectedFloor)
      )

  const visibleRooms = floorRooms.filter(room =>
    String(room.teremszam)
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  const basementKeys = keys.filter(key => {
    const roomExists = rooms.some(
      room => Number(room.id) === Number(key.teremid)
    )

    return !roomExists || key.teremid == null
  })

  const visibleKeys = selectedFloor === 'basement'
    ? basementKeys
    : visibleRooms.flatMap(room =>
        keys.filter(
          key => Number(key.teremid) === Number(room.id)
        )
      )

  function selectFloor(floorId) {
    setSelectedFloor(floorId)
    setSearch('')
  }

  return (
    <div className="space-y-5">

      {/* Heading */}
      <div>
        <p className="text-sm text-slate-500">
          Vezérlőpult / Kulcskezelés
        </p>

        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          Kulcskezelés
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Kattints az épület megfelelő emeletére a kulcsok megtekintéséhez.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center justify-between rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
          {error}

          <button onClick={loadData}>
            <RefreshCw size={17} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">

        {/* Interactive building */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white xl:col-span-2">

          <div className="border-b border-slate-100 p-4">
            <div className="flex items-center gap-2">
              <Building2 className="text-blue-600" size={20} />

              <h2 className="font-bold text-slate-900">
                Egyetemi épület
              </h2>
            </div>

            <p className="mt-1 text-xs text-slate-500">
              Kattints a kívánt emeletre.
            </p>
          </div>

          <div className="bg-slate-50 p-3">

            <div className="relative mx-auto w-full max-w-[420px]">

              {/* Building image */}
              <img
                src={buildingImage}
                alt="Pannon Egyetem épülete"
                className="block w-full h-auto"
              />

              {/* All 12 clickable floor areas */}
              <div className="absolute inset-0">

                {floorClickAreas.map(area => {
                  const floor = floors.find(
                    item => item.id === area.id
                  )

                  if (!floor) return null

                  const active = selectedFloor === floor.id

                  return (
                    <button
                      key={floor.id}
                      type="button"
                      onClick={() => selectFloor(floor.id)}
                      style={{
                        position: 'absolute',
                        top: `${area.top}%`,
                        left: '0%',
                        width: '100%',
                        height: `${area.height}%`,
                      }}
                      className={`border-y transition ${
                        active
                          ? 'border-blue-600 bg-blue-500/30'
                          : 'border-transparent hover:border-blue-400 hover:bg-blue-400/20'
                      }`}
                      aria-label={floor.label}
                    >
                      {/* Floor label on the left */}
                      <span
                        className={`absolute left-0 top-1/2 -translate-y-1/2 rounded-r-md px-2 py-1 text-[9px] font-bold whitespace-nowrap shadow-sm ${
                          active
                            ? 'bg-blue-600 text-white'
                            : 'bg-white/95 text-slate-700'
                        }`}
                      >
                        {floor.label}
                      </span>
                    </button>
                  )
                })}

              </div>

            </div>
          </div>

          <div className="border-t border-slate-100 p-3">
            <p className="text-xs text-slate-500">
              Kiválasztott szint:
              <span className="ml-1 font-bold text-blue-700">
                {selectedFloorInfo?.label}
              </span>
            </p>
          </div>

        </section>

        {/* Keys panel */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white xl:col-span-3">

          <div className="flex items-center justify-between border-b border-slate-100 p-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {selectedFloorInfo?.label}
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {selectedFloor === 'basement'
                  ? 'Mesterkulcsok és nem teremhez rendelt kulcsok'
                  : 'Az emelethez tartozó termek és kulcsok'}
              </p>
            </div>

            <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
              {visibleKeys.length} kulcs
            </span>
          </div>

          {/* Search */}
          <div className="border-b border-slate-100 p-4">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Terem keresése..."
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Loading */}
          {loading ? (
            <div className="p-10 text-center text-sm text-slate-500">
              Adatok betöltése...
            </div>
          ) : (
            <div className="max-h-[600px] space-y-3 overflow-y-auto p-4">

              {/* Normal floors */}
              {selectedFloor !== 'basement' &&
                visibleRooms.map(room => {
                  const roomKeys = keys.filter(
                    key => Number(key.teremid) === Number(room.id)
                  )

                  return (
                    <div
                      key={room.id}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <DoorOpen size={19} className="text-blue-600" />

                          <div>
                            <h3 className="text-sm font-bold text-slate-900">
                              Terem {room.teremszam}
                            </h3>

                            <p className="text-xs text-slate-500">
                              {room.epulet} · {room.ferohely} férőhely
                            </p>
                          </div>
                        </div>

                        <span className="text-xs text-slate-500">
                          {roomKeys.length} kulcs
                        </span>
                      </div>

                      {roomKeys.map(key => {
                        const status = getKeyStatus(key)

                        return (
                          <div
                            key={key.id}
                            className="mt-2 flex items-center justify-between rounded-lg bg-slate-50 p-3"
                          >
                            <div className="flex items-center gap-3">
                              <KeyRound size={18} className="text-slate-500" />

                              <div>
                                <p className="text-sm font-semibold text-slate-800">
                                  K-{String(key.id).padStart(3, '0')}
                                </p>

                                {status.movement && !status.movement.visszavetelideje && (
                                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                                    <User size={12} />
                                    {getUserName(status.movement.felhasznaloid)}
                                  </p>
                                )}
                              </div>
                            </div>

                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.color}`}>
                              {status.label}
                            </span>
                          </div>
                        )
                      })}

                      {roomKeys.length === 0 && (
                        <p className="text-xs text-slate-400">
                          Ehhez a teremhez nincs kulcs rendelve.
                        </p>
                      )}
                    </div>
                  )
                })}

              {/* Basement keys */}
              {selectedFloor === 'basement' &&
                visibleKeys.map(key => {
                  const status = getKeyStatus(key)

                  return (
                    <div
                      key={key.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <KeyRound className="text-amber-600" />

                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            K-{String(key.id).padStart(3, '0')}
                          </p>

                          <p className="text-xs text-slate-500">
                            Nem teremhez rendelt kulcs
                          </p>
                        </div>
                      </div>

                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                  )
                })}

              {/* Empty normal floor */}
              {selectedFloor !== 'basement' && visibleRooms.length === 0 && (
                <div className="p-8 text-center">
                  <DoorOpen size={30} className="mx-auto text-slate-300" />

                  <p className="mt-3 text-sm font-semibold text-slate-600">
                    Nincs terem ezen az emeleten.
                  </p>
                </div>
              )}

              {/* Empty basement */}
              {selectedFloor === 'basement' && visibleKeys.length === 0 && (
                <div className="p-8 text-center">
                  <KeyRound size={30} className="mx-auto text-slate-300" />

                  <p className="mt-3 text-sm font-semibold text-slate-600">
                    Nincs megjeleníthető kulcs.
                  </p>
                </div>
              )}

            </div>
          )}

          {/* Refresh */}
          <div className="border-t border-slate-100 p-4">
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={15} />
              Adatok frissítése
            </button>
          </div>

        </section>
      </div>
    </div>
  )
}
