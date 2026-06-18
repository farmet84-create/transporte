import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Truck, Users, UserCheck, MapPin,
  FileText, BarChart2, Settings, LogOut, Menu, X,
  DollarSign, ChevronRight
} from 'lucide-react'
import useAuthStore from '../../store/authStore'

const nav = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/viajes',     icon: FileText,         label: 'Viajes' },
  { to: '/vehiculos',  icon: Truck,            label: 'Vehículos' },
  { to: '/conductores',icon: UserCheck,        label: 'Conductores' },
  { to: '/clientes',   icon: Users,            label: 'Clientes' },
  { to: '/costos',     icon: DollarSign,       label: 'Costos mensuales' },
  { to: '/reportes',   icon: BarChart2,        label: 'Reportes' },
]

const LOGO = 'https://waappbusiness.com/wp-content/uploads/2026/01/cropped-walogo-blanco.png'

export default function Layout() {
  const { usuario, logout } = useAuthStore()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const Sidebar = ({ mobile = false }) => (
    <aside className={`flex flex-col h-full bg-primary-900 text-white ${mobile ? 'w-full' : 'w-64'}`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-primary-700">
        <div className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center bg-white/10">
          <img src={LOGO} alt="Logo" className="w-9 h-9 object-contain" />
        </div>
        <div>
          <p className="font-bold text-sm">TransportePro</p>
          <p className="text-primary-400 text-xs">Rentabilidad</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-primary-300 hover:bg-primary-800 hover:text-white'
              }`
            }>
            <Icon className="w-5 h-5 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Usuario */}
      <div className="px-3 py-4 border-t border-primary-700">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-xs font-bold">
            {usuario?.nombre?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{usuario?.nombre}</p>
            <p className="text-primary-400 text-xs truncate">{usuario?.rol}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-primary-300 hover:bg-primary-800 hover:text-white transition-colors">
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar desktop */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Sidebar mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 z-10">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar mobile */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-gray-100">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <img src={LOGO} alt="Logo" className="w-6 h-6 object-contain" />
            <span className="font-semibold text-sm">TransportePro</span>
          </div>
          <div className="w-9" />
        </header>

        {/* Página */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
