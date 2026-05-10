import { NavLink } from 'react-router-dom'
import { LayoutDashboard, BookOpen, Utensils, BarChart2, User } from 'lucide-react'

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/log', icon: BookOpen, label: 'Log' },
  { to: '/meals', icon: Utensils, label: 'Meals' },
  { to: '/progress', icon: BarChart2, label: 'Progress' },
  { to: '/profile', icon: User, label: 'Profile' },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-gray-900 border-t border-gray-800 pb-safe">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors ${
                isActive ? 'text-emerald-400' : 'text-gray-500 hover:text-gray-300'
              }`
            }
          >
            <Icon size={22} />
            <span className="text-[10px] font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
