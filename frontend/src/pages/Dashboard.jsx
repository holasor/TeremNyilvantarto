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
} from 'lucide-react'

const stats = [
  {
    label: 'Mai foglalások',
    value: '24',
    detail: 'Aktív teremfoglalások',
    icon: CalendarDays,
    color: 'blue',
  },
  {
    label: 'Kiadott kulcsok',
    value: '08',
    detail: 'Jelenleg használatban',
    icon: KeyRound,
    color: 'amber',
  },
  {
    label: 'Elérhető termek',
    value: '16',
    detail: 'Foglalható jelenleg',
    icon: DoorOpen,
    color: 'emerald',
  },
  {
    label: 'Késedelmes leadások',
    value: '02',
    detail: 'Ellenőrzést igényel',
    icon: Clock3,
    color: 'rose',
  },
]

const movements = [
  {
    id: 1,
    person: 'Nagy Anna',
    initials: 'NA',
    room: 'A-201',
    key: 'K-023',
    action: 'Kulcs kiadása',
    time: '09:15',
    status: 'Kiadva',
    type: 'out',
  },
  {
    id: 2,
    person: 'Kovács Péter',
    initials: 'KP',
    room: 'B-104',
    key: 'K-011',
    action: 'Kulcs visszavétele',
    time: '09:08',
    status: 'Visszavéve',
    type: 'in',
  },
  {
    id: 3,
    person: 'Tóth Eszter',
    initials: 'TE',
    room: 'C-302',
    key: 'K-045',
    action: 'Kulcs kiadása',
    time: '08:52',
    status: 'Kiadva',
    type: 'out',
  },
  {
    id: 4,
    person: 'Szabó Márk',
    initials: 'SM',
    room: 'A-105',
    key: 'K-008',
    action: 'Kulcs visszavétele',
    time: '08:41',
    status: 'Visszavéve',
    type: 'in',
  },
]

const rooms = [
  {
    room: 'A-201',
    building: 'A épület · 2. emelet',
    activity: 'Előadás',
    time: '09:00–09:45',
    status: 'Használatban',
    color: 'blue',
  },
  {
    room: 'B-104',
    building: 'B épület · 1. emelet',
    activity: 'Projektmunka',
    time: '09:00–10:30',
    status: 'Használatban',
    color: 'blue',
  },
  {
    room: 'C-302',
    building: 'C épület · 3. emelet',
    activity: 'Karbantartás',
    time: '08:00–12:00',
    status: 'Karbantartás',
    color: 'amber',
  },
]

const iconStyles = {
  blue: 'bg-blue-50 text-blue-600',
  amber: 'bg-amber-50 text-amber-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  rose: 'bg-rose-50 text-rose-600',
}

export default function Dashboard() {
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

      {/* Statistics cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon

          return (
            <article
              key={stat.label}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    {stat.label}
                  </p>
                  <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                    {stat.value}
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
        <article className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5 2xl:col-span-2">
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
              Mai események
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
                {movements.map((movement) => (
                  <tr key={movement.id} className="transition hover:bg-slate-50/70">
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
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-100 px-6 py-4">
            <p className="text-xs text-slate-500">
              Bemutatóadatok — később a backendből töltjük be őket.
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
              Példák a termek aktuális állapotára
            </p>
          </div>

          <div className="space-y-1 p-3">
            {rooms.map((room) => (
              <div
                key={room.room}
                className="rounded-xl p-3 transition hover:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`rounded-lg p-2 ${iconStyles[room.color]}`}>
                      <MapPin size={17} />
                    </div>

                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {room.room}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {room.building}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${
                      room.color === 'amber'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-blue-50 text-blue-700'
                    }`}
                  >
                    {room.status}
                  </span>
                </div>

                <div className="ml-12 mt-3 flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-500">{room.activity}</span>
                  <span className="font-medium text-slate-600">{room.time}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mx-4 mb-4 flex items-start gap-2 rounded-xl bg-rose-50 p-3">
            <CircleAlert size={17} className="mt-0.5 shrink-0 text-rose-600" />
            <div>
              <p className="text-xs font-semibold text-rose-800">
                Figyelmet igényel
              </p>
              <p className="mt-1 text-xs leading-5 text-rose-700">
                2 kulcs leadása késedelmes a bemutatóadatok szerint.
              </p>
            </div>
          </div>
        </article>
      </section>
    </div>
  )
}

// Statistics cards: Display booking, key, room, and overdue-return counts.

// Recent movements: Show example key handovers in a table.

// Room status: Illustrate rooms that are occupied or under maintenance.

// Responsive layout: Tailwind adjusts the cards and tables to fit different screen sizes.