import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Truck, Users, UserCheck,
  FileText, BarChart2, LogOut, Menu, DollarSign, Settings, Bell
} from 'lucide-react'
import useAuthStore from '../../store/authStore'
import api from '../../services/api'

const LOGO = 'https://waappbusiness.com/wp-content/uploads/2026/01/cropped-walogo-blanco.png'

export default function Layout() {
  const { usuario, logout } = useAuthStore()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [numAlertas, setNumAlertas]   = useState(0)

  // Cargar conteo de alertas cada 5 minutos
  useEffect(() => {
    const cargarAlertas = () => {
      api.get('/alertas')
        .then(r => setNumAlertas(r.data.datos?.resumen?.total || 0))
        .catch(() => {})
    }
    cargarAlertas()
    const interval = setInterval(cargarAlertas, 24 * 60 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const nav = [
    { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/viajes',      icon: FileText,         label: 'Viajes' },
    { to: '/vehiculos',   icon: Truck,            label: 'Vehículos' },
    { to: '/conductores', icon: UserCheck,        label: 'Conductores' },
    { to: '/clientes',    icon: Users,            label: 'Clientes' },
    { to: '/costos',      icon: DollarSign,       label: 'Costos mensuales' },
    { to: '/reportes',    icon: BarChart2,        label: 'Reportes' },
  ]

  const handleLogout = () => { logout(); navigate('/login') }

  const Sidebar = ({ mobile = false }) => (
    <aside className={`flex flex-col h-full text-white ${mobile ? 'w-full' : 'w-64'}`}
      style={{ backgroundColor: '#090d1b' }}>

      {/* Marca */}
      <div className="px-6 py-5 border-b border-white/10">
        <p className="font-bold text-lg tracking-tight">WaappLatam</p>
        <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>Automating Growth</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-white/15 text-white' : 'text-white/50 hover:bg-white/10 hover:text-white'
              }`
            }>
            <Icon className="w-5 h-5 flex-shrink-0" />
            {label}
          </NavLink>
        ))}

        {/* Alertas con contador */}
        <NavLink to="/alertas"
          onClick={() => setSidebarOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive ? 'bg-white/15 text-white' : 'text-white/50 hover:bg-white/10 hover:text-white'
            }`
          }>
          <div className="relative flex-shrink-0">
            <Bell className="w-5 h-5" />
            {numAlertas > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                {numAlertas > 9 ? '9+' : numAlertas}
              </span>
            )}
          </div>
          Alertas
          {numAlertas > 0 && (
            <span className="ml-auto bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
              {numAlertas > 99 ? '99+' : numAlertas}
            </span>
          )}
        </NavLink>

        {/* Administración */}
        <NavLink to="/admin"
          onClick={() => setSidebarOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive ? 'bg-white/15 text-white' : 'text-white/50 hover:bg-white/10 hover:text-white'
            }`
          }>
          <Settings className="w-5 h-5 flex-shrink-0" />
          Administración
        </NavLink>
      </nav>

      {/* Usuario */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ backgroundColor: '#1e2a4a' }}>
            {usuario?.nombre?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-white">{usuario?.nombre}</p>
            <p className="text-xs truncate" style={{ color: '#6b7280' }}>{usuario?.rol}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm transition-colors text-white/50 hover:bg-white/10 hover:text-white">
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <div className="hidden lg:flex flex-shrink-0"><Sidebar /></div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 z-10"><Sidebar mobile /></div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-gray-100">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-semibold text-sm">WaappLatam</span>
          <div className="relative">
            <NavLink to="/alertas">
              <Bell className="w-5 h-5 text-gray-600" />
              {numAlertas > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {numAlertas > 9 ? '9+' : numAlertas}
                </span>
              )}
            </NavLink>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6"><Outlet /></main>
      </div>
    </div>
  )
}
