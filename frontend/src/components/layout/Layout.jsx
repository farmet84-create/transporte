import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Truck, Users, UserCheck,
  FileText, BarChart2, LogOut, Menu, DollarSign, Settings, Bell, Sun, Moon, CreditCard
} from 'lucide-react'
import useAuthStore from '../../store/authStore'
import api, { suscripcionAPI } from '../../services/api'

export default function Layout() {
  const { usuario, logout } = useAuthStore()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen]     = useState(false)
  const [numAlertas, setNumAlertas]       = useState(0)
  const [oscuro, setOscuro]               = useState(() => localStorage.getItem('tema') === 'oscuro')
  const [diasSusc, setDiasSusc]           = useState(null)
  const [suscBloqueada, setSuscBloqueada] = useState(false)

  useEffect(() => {
    if (usuario?.rol === 'admin') {
      suscripcionAPI.obtenerEstado()
        .then(r => {
          const d = r.data.datos
          setDiasSusc(d?.dias_restantes ?? null)
          setSuscBloqueada(d?.estado === 'bloqueado')
        })
        .catch(() => {})
    }
  }, [usuario])

  useEffect(() => {
    if (oscuro) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('tema', 'oscuro')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('tema', 'claro')
    }
  }, [oscuro])

  useEffect(() => {
    const cargarAlertas = () => {
      api.get('/alertas')
        .then(r => setNumAlertas(r.data.datos?.resumen?.total || 0))
        .catch(() => {})
    }
    cargarAlertas()
    const ahora = new Date()
    const hoy11pm = new Date()
    hoy11pm.setHours(23, 0, 0, 0)
    if (ahora > hoy11pm) hoy11pm.setDate(hoy11pm.getDate() + 1)
    const timeout = setTimeout(() => {
      cargarAlertas()
      const interval = setInterval(cargarAlertas, 24 * 60 * 60 * 1000)
      return () => clearInterval(interval)
    }, hoy11pm - ahora)
    return () => clearTimeout(timeout)
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
      <div className="px-6 py-5 border-b border-white/10">
        <p className="font-bold text-lg tracking-tight">WaappLatam</p>
        <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>Automating Growth</p>
      </div>
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
        {usuario?.rol === 'admin' && (
          <NavLink to="/suscripcion"
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-white/15 text-white' : 'text-white/50 hover:bg-white/10 hover:text-white'
              }`
            }>
            <div className="relative flex-shrink-0">
              <CreditCard className="w-5 h-5" />
              {(suscBloqueada || (diasSusc !== null && diasSusc <= 5)) && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">!</span>
              )}
            </div>
            Suscripción
            {suscBloqueada && (
              <span className="ml-auto bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">Vencida</span>
            )}
            {!suscBloqueada && diasS
