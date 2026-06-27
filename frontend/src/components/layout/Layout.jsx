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
