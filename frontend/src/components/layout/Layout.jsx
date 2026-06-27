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
            {!suscBloqueada && diasSusc !== null && diasSusc <= 5 && (
              <span className="ml-auto bg-yellow-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{diasSusc}d</span>
            )}
          </NavLink>
        )}
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
        <button onClick={() => setOscuro(!oscuro)}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm transition-colors text-white/50 hover:bg-white/10 hover:text-white mb-1">
          {oscuro ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {oscuro ? 'Modo claro' : 'Modo oscuro'}
        </button>
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
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </div>
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 z-10">
            <Sidebar mobile />
          </div>
        </div>
      )}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="lg:hidden" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 12px', height: 54, backgroundColor: '#090d1b',
          borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, zIndex: 40,
        }}>
          <button onClick={() => setSidebarOpen(true)} style={{
            width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 10, cursor: 'pointer',
          }}>
            <Menu style={{ width: 20, height: 20, color: '#ffffff' }} />
          </button>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#ffffff' }}>WaappLatam</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button onClick={() => setOscuro(!oscuro)} style={{
              width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 8,
            }}>
              {oscuro ? <Sun style={{ width: 18, height: 18, color: '#ffffff' }} /> : <Moon style={{ width: 18, height: 18, color: '#ffffff' }} />}
            </button>
            <div style={{ position: 'relative' }}>
              <NavLink to="/alertas" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36 }}>
                <Bell style={{ width: 18, height: 18, color: '#ffffff' }} />
                {numAlertas > 0 && (
                  <span style={{
                    position: 'absolute', top: 4, right: 4, background: '#ef4444', color: '#fff',
                    fontSize: 9, fontWeight: 700, borderRadius: '50%', width: 15, height: 15,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #090d1b',
                  }}>
                    {numAlertas > 9 ? '9+' : numAlertas}
                  </span>
                )}
              </NavLink>
            </div>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', background: '#1e2a4a',
              border: '1.5px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#ffffff',
            }}>
              {usuario?.nombre?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
