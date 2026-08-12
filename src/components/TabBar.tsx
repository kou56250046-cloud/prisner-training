import { NavLink } from 'react-router'

const TABS = [
  { to: '/', label: '今日', end: true },
  { to: '/progress', label: '進捗', end: false },
  { to: '/coach', label: 'コーチ', end: false },
  { to: '/library', label: '図鑑', end: false },
  { to: '/settings', label: '設定', end: false },
] as const

export function TabBar() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-white/10 bg-concrete-950/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <ul className="flex">
        {TABS.map((t) => (
          <li key={t.to} className="flex-1">
            <NavLink
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `flex items-center justify-center h-14 text-sm ${
                  isActive ? 'text-amber-500 font-bold' : 'text-white/45'
                }`
              }
            >
              {t.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
