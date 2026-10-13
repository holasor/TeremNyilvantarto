import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarDays,
  KeyRound,
  DoorOpen,
  ChartNoAxesCombined,
  GraduationCap,
  ShieldCheck,
  X,
} from 'lucide-react'

const links = [
  { to: '/', label: 'Áttekintés', icon: LayoutDashboard, end: true },
  { to: '/foglalasok', label: 'Teremfoglalások', icon: CalendarDays },
  { to: '/kulcskezeles', label: 'Kulcskezelés', icon: KeyRound },
  { to: '/termek', label: 'Termek és kulcsok', icon: DoorOpen },
  { to: '/riportok', label: 'Riportok és audit', icon: ChartNoAxesCombined },
]

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Menü bezárása"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col
          border-r border-slate-200 bg-white transition-transform
          duration-200 lg:translate-x-0
          ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-[76px] items-center gap-3 border-b border-slate-100 px-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
            <KeyRound size={23} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-bold tracking-tight text-slate-900">
              UniKulcs
            </p>
            <p className="text-xs text-slate-500">
              Terem- és kulcsnyilvántartás
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Bezárás"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            <X size={19} />
          </button>
        </div>

        <div className="px-4 pt-6">
          <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Főmenü
          </p>

          <nav className="space-y-1">
            {links.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                <Icon size={19} strokeWidth={1.8} />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-4">
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-slate-700">
              <ShieldCheck size={18} />
              <span className="text-sm font-semibold">
                Biztonságos működés
              </span>
            </div>
            <p className="text-xs leading-5 text-slate-500">
              Szerepköralapú hozzáférés és visszakövethető kulcsmozgások.
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <GraduationCap size={15} />
              Egyetemi rendszer
            </div>
          </div>

          <p className="mt-4 text-center text-[11px] text-slate-400">
            UniKulcs · Projekt Labor 2026/27
          </p>
        </div>
      </aside>
    </>
  )
}

// links contains all our navigation items in one array.

// NavLink highlights the currently selected page.

// links.map() creates each navigation item automatically.

// open and onClose will let us open and close the sidebar on mobile devices.