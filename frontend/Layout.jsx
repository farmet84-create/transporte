import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Truck, UserCheck, Users,
  FileText, BarChart2, LogOut, Menu, X, DollarSign
} from 'lucide-react'
import useAuthStore from '../../store/authStore'

const nav = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/viajes',      icon: FileText,         label: 'Viajes' },
  { to: '/vehiculos',   icon: Truck,            label: 'Vehículos' },
  { to: '/conductores', icon: UserCheck,        label: 'Conductores' },
  { to: '/clientes',    icon: Users,            label: 'Clientes' },
  { to: '/costos',      icon: DollarSign,       label: 'Costos mensuales' },
  { to: '/reportes',    icon: BarChart2,        label: 'Reportes' },
]

export default function Layout() {
  const { usuario, logout } = useAuthStore()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const Sidebar = ({ mobile = false }) => (
    <aside style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: '#0f172a', color: '#fff',
      width: mobile ? '100%' : 256
    }}>
      {/* Logo */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'20px 24px', borderBottom:'1px solid #1e293b' }}>
        <div style={{ width:36, height:36, background:'#4f46e5', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Truck style={{ width:20, height:20, color:'#fff' }} />
        </div>
        <div>
          <p style={{ fontWeight:700, fontSize:14, color:'#fff', margin:0 }}>TransportePro</p>
          <p style={{ fontSize:11, color:'#94a3b8', margin:0 }}>Rentabilidad</p>
        </div>
        {mobile && (
          <button onClick={() => setSidebarOpen(false)}
            style={{ marginLeft:'auto', background:'transparent', border:'none', cursor:'pointer', color:'#94a3b8', padding:4 }}>
            <X style={{ width:20, height:20 }} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding:'12px 12px', overflowY:'auto' }}>
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to}
            onClick={() => setSidebarOpen(false)}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 10, marginBottom: 2,
              fontSize: 14, fontWeight: 500, textDecoration: 'none',
              background: isActive ? '#4f46e5' : 'transparent',
              color: isActive ? '#fff' : '#94a3b8',
              transition: 'all 0.15s'
            })}
            onMouseEnter={e => { if (!e.currentTarget.classList.contains('active')) { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.color = '#fff' }}}
            onMouseLeave={e => { if (!e.currentTarget.querySelector('[aria-current]')) { e.currentTarget.style.background = ''; e.currentTarget.style.color = '' }}}>
            <Icon style={{ width:18, height:18, flexShrink:0 }} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Usuario */}
      <div style={{ padding:'12px', borderTop:'1px solid #1e293b' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', marginBottom:4 }}>
          <div style={{ width:34, height:34, background:'#4f46e5', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#fff', flexShrink:0 }}>
            {usuario?.nombre?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontSize:13, fontWeight:600, color:'#fff', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{usuario?.nombre}</p>
            <p style={{ fontSize:11, color:'#64748b', margin:0, textTransform:'capitalize' }}>{usuario?.rol}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', width:'100%', background:'transparent', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, color:'#94a3b8', transition:'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8' }}>
          <LogOut style={{ width:16, height:16 }} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'#f8fafc' }}>
      {/* Sidebar desktop */}
      <div className="hidden lg:flex" style={{ flexShrink:0 }}>
        <Sidebar />
      </div>

      {/* Sidebar mobile overlay */}
      {sidebarOpen && (
        <div style={{ position:'fixed', inset:0, zIndex:50 }} className="lg:hidden">
          {/* Backdrop */}
          <div onClick={() => setSidebarOpen(false)}
            style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(2px)' }} />
          {/* Drawer */}
          <div style={{ position:'absolute', left:0, top:0, bottom:0, width:280, zIndex:10 }}>
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

        {/* ── Top bar móvil ── */}
        <header className="lg:hidden" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', height: 56,
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          position: 'relative', zIndex: 10
        }}>
          {/* Botón hamburger — siempre visible */}
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              width: 40, height: 40, borderRadius: 10,
              background: '#f1f5f9', border: '1px solid #e2e8f0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0
            }}>
            <Menu style={{ width: 20, height: 20, color: '#334155' }} />
          </button>

          {/* Logo centro */}
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:30, height:30, background:'#4f46e5', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Truck style={{ width:16, height:16, color:'#fff' }} />
            </div>
            <span style={{ fontWeight:700, fontSize:14, color:'#0f172a' }}>TransportePro</span>
          </div>

          {/* Avatar usuario */}
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0
          }}>
            {usuario?.nombre?.charAt(0)?.toUpperCase() || 'U'}
          </div>
        </header>

        {/* Página */}
        <main style={{ flex:1, overflowY:'auto', padding:'16px' }} className="lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
