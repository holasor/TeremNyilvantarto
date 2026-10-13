import { Bell, Menu, Search, ChevronDown } from 'lucide-react'

export default function Header({ onMenuClick }) {
  return (
    <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Menü megnyitása"
          onClick={onMenuClick}
          className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        >
          <Menu size={22} />
        </button>

        <div>
          <p className="text-sm font-semibold text-slate-800">
            Egyetemi terem- és kulcsnyilvántartó
          </p>
          <p className="hidden text-xs text-slate-500 sm:block">
            Projekt Labor · 2026/27/1
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <button
          type="button"
          aria-label="Keresés"
          className="hidden rounded-xl border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-50 sm:block"
        >
          <Search size={19} />
        </button>

        <button
          type="button"
          aria-label="Értesítések"
          className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-50"
        >
          <Bell size={20} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
        </button>

        <div className="h-8 w-px bg-slate-200" />

        <button
          type="button"
          className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-slate-50"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
            AD
          </div>

          <div className="hidden text-left sm:block">
            <p className="text-sm font-semibold text-slate-800">
              Admin Demo
            </p>
            <p className="text-xs text-slate-500">
              Adminisztrátor
            </p>
          </div>

          <ChevronDown size={16} className="hidden text-slate-400 sm:block" />
        </button>
      </div>
    </header>
  )
}